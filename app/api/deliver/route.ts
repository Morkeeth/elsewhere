import { NextResponse } from "next/server";
import { simulationSchema } from "@/lib/schema";

export async function POST(request: Request) {
  if (!process.env.OPENCLAW_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "OPENCLAW_WEBHOOK_URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const simulation = simulationSchema.parse(await request.json());
    const message = [
      "ELSEWHERE / DECISION BRIEF",
      simulation.decision.question,
      "",
      `Shock: ${simulation.decision.shock.label} (month ${simulation.decision.shock.month})`,
      `Experiment: ${simulation.experiment.title}`,
      simulation.experiment.hypothesis,
      `First step: ${simulation.experiment.firstStep}`,
      "",
      `Evidence coverage: ${Math.round(simulation.audit.sourceCoverage * 100)}%`,
    ].join("\n");

    const response = await fetch(process.env.OPENCLAW_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OPENCLAW_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.OPENCLAW_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ text: message, simulation }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) throw new Error(`OpenClaw delivery returned ${response.status}`);
    return NextResponse.json({ delivered: true });
  } catch (error) {
    return NextResponse.json({ error: "Delivery failed.", detail: String(error) }, { status: 502 });
  }
}
