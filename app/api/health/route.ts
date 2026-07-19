import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: "Elsewhere",
    ledger: "ready",
    witnesses: process.env.OPENAI_API_KEY ? "configured" : "not-configured",
    delivery: process.env.OPENCLAW_WEBHOOK_URL ? "configured" : "not-configured",
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
  });
}
