import assert from "node:assert/strict";
import test from "node:test";
import sampleDecision from "../data/sample-decision.json";
import { GET, POST } from "../app/api/simulate/route";

test("public GET remains deterministic and never creates a paid witness run", async () => {
  const response = await GET(new Request("https://example.test/api/simulate"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.generatedBy.engine, "deterministic");
});

test("uncached witness GET and keyless witness POST fail closed", async () => {
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const cached = await GET(new Request("https://example.test/api/simulate?agents=1"));
    assert.equal(cached.status, 503);
    const live = await POST(new Request("https://example.test/api/simulate?agents=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sampleDecision) }));
    assert.equal(live.status, 503);
  } finally {
    if (original) process.env.OPENAI_API_KEY = original;
  }
});

test("malformed simulation input is rejected without leaking internals", async () => {
  const response = await POST(new Request("https://example.test/api/simulate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "The decision could not be simulated. Check the inputs and try again." });
});

test("agent posts reject cross-origin and oversized requests before model execution", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    const crossOrigin = await POST(new Request("https://example.test/api/simulate?agents=1", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://attacker.test" },
      body: JSON.stringify(sampleDecision),
    }));
    assert.equal(crossOrigin.status, 403);
    const oversized = await POST(new Request("https://example.test/api/simulate", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "24001" },
      body: JSON.stringify(sampleDecision),
    }));
    assert.equal(oversized.status, 400);
  } finally {
    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
  }
});

test("production live witnesses fail closed when durable limits are missing", async () => {
  const prior = {
    nodeEnv: process.env.NODE_ENV,
    key: process.env.OPENAI_API_KEY,
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    budget: process.env.ELSEWHERE_DEMO_BUDGET,
  };
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.ELSEWHERE_DEMO_BUDGET;
  try {
    const response = await POST(new Request("https://example.test/api/simulate?agents=1", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.test" },
      body: JSON.stringify(sampleDecision),
    }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /demo budget/i);
  } finally {
    if (prior.nodeEnv) Object.assign(process.env, { NODE_ENV: prior.nodeEnv }); else delete (process.env as Record<string, string | undefined>).NODE_ENV;
    if (prior.key) process.env.OPENAI_API_KEY = prior.key; else delete process.env.OPENAI_API_KEY;
    if (prior.url) process.env.UPSTASH_REDIS_REST_URL = prior.url; else delete process.env.UPSTASH_REDIS_REST_URL;
    if (prior.token) process.env.UPSTASH_REDIS_REST_TOKEN = prior.token; else delete process.env.UPSTASH_REDIS_REST_TOKEN;
    if (prior.budget) process.env.ELSEWHERE_DEMO_BUDGET = prior.budget; else delete process.env.ELSEWHERE_DEMO_BUDGET;
  }
});
