import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: "Elsewhere",
    record: "ready",
    witnesses: process.env.OPENAI_API_KEY ? "configured" : "not-configured",
    model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
  });
}
