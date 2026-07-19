import { NextResponse } from "next/server";
import { decisionSchema } from "@/lib/schema";
import { runSimulation, sampleDecision } from "@/lib/engine";
import { runGptSimulation } from "@/lib/openai-engine";

export async function GET(request: Request) {
  const wantsAgents = new URL(request.url).searchParams.get("agents") === "1";
  if (!wantsAgents) return NextResponse.json(runSimulation(sampleDecision));
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured; the deterministic ledger remains available." },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json(await runGptSimulation(sampleDecision));
  } catch (error) {
    return NextResponse.json(
      { error: "The future witnesses did not complete.", detail: String(error) },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const input = decisionSchema.parse(await request.json());
    const wantsAgents = new URL(request.url).searchParams.get("agents") === "1";
    if (wantsAgents && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured; the deterministic ledger remains available." },
        { status: 503 },
      );
    }
    if (wantsAgents && process.env.OPENAI_API_KEY) {
      return NextResponse.json(await runGptSimulation(input));
    }
    return NextResponse.json(runSimulation(input));
  } catch (error) {
    return NextResponse.json(
      { error: "The decision could not be simulated.", detail: String(error) },
      { status: 400 },
    );
  }
}
