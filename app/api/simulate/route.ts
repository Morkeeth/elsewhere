import { NextResponse } from "next/server";
import { decisionSchema, simulationSchema } from "@/lib/schema";
import { runSimulation, sampleDecision } from "@/lib/engine";
import { judgeReplay } from "@/lib/judge-replay";
import { runGptSimulation } from "@/lib/openai-engine";
import { clientKey, isSameOriginPost, takeWitnessRequest } from "@/lib/request-guard";

const MAX_DECISION_BODY_BYTES = 24_000;

async function parseDecision(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DECISION_BODY_BYTES) throw new Error("request too large");
  const raw = await request.text();
  if (raw.length > MAX_DECISION_BODY_BYTES) throw new Error("request too large");
  return decisionSchema.parse(JSON.parse(raw));
}

export async function GET(request: Request) {
  const wantsAgents = new URL(request.url).searchParams.get("agents") === "1";
  if (!wantsAgents) return NextResponse.json(runSimulation(sampleDecision));
  // A deployer may provide a validated, pre-generated judge scenario. GET
  // never spends API credits, even if the public URL is repeatedly refreshed.
  const cached = process.env.ELSEWHERE_JUDGE_SIMULATION_JSON;
  if (cached) {
    try {
      return NextResponse.json(simulationSchema.parse(JSON.parse(cached)), {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
      });
    } catch {
      // Fall through to a clear unavailable state rather than serving an
      // unvalidated model artifact.
    }
  }
  return NextResponse.json(judgeReplay(), {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Elsewhere-Replay": "verified-cached" },
  });
}

export async function POST(request: Request) {
  try {
    const input = await parseDecision(request);
    const wantsAgents = new URL(request.url).searchParams.get("agents") === "1";
    if (wantsAgents && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured; the deterministic ledger remains available." },
        { status: 503 },
      );
    }
    if (wantsAgents && process.env.OPENAI_API_KEY) {
      if (!isSameOriginPost(request)) {
        return NextResponse.json({ error: "Live witnesses accept same-origin requests only." }, { status: 403 });
      }
      const allowance = await takeWitnessRequest(clientKey(request));
      if (!allowance.allowed) {
        const message = allowance.reason === "configuration"
          ? "Live witnesses are temporarily unavailable while the public demo budget is being configured."
          : "The live witness demo has reached its visitor limit. Please retry shortly.";
        return NextResponse.json(
          { error: message },
          { status: allowance.reason === "configuration" ? 503 : 429, headers: { "Retry-After": String(allowance.retryAfterSeconds) } },
        );
      }
      return NextResponse.json(await runGptSimulation(input));
    }
    return NextResponse.json(runSimulation(input));
  } catch {
    return NextResponse.json(
      { error: "The decision could not be simulated. Check the inputs and try again." },
      { status: 400 },
    );
  }
}
