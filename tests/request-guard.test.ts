import assert from "node:assert/strict";
import test from "node:test";
import { clientKey, isSameOriginPost, takeWitnessRequest } from "../lib/request-guard";

test("uses the forwarded visitor identity and requires same-origin production posts", async () => {
  const request = new Request("https://example.test/api/simulate?agents=1", { headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.1", origin: "https://example.test" } });
  assert.equal(clientKey(request), "203.0.113.9");
  assert.equal(isSameOriginPost(request), true);
  assert.equal(isSameOriginPost(new Request("https://example.test/api/simulate", { headers: { origin: "https://attacker.test" } })), false);
  const first = await takeWitnessRequest("test-visitor-a");
  assert.equal(first.allowed, true);
});

test("local visitor guard returns a retryable limit", async () => {
  const key = `limit-${Date.now()}`;
  await takeWitnessRequest(key);
  await takeWitnessRequest(key);
  await takeWitnessRequest(key);
  const limited = await takeWitnessRequest(key);
  assert.equal(limited.allowed, false);
  if (!limited.allowed) {
    assert.equal(limited.reason, "visitor-limit");
    assert.ok(limited.retryAfterSeconds > 0);
  }
});
