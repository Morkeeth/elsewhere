import { NextResponse } from "next/server";

// Kept as an explicit retired endpoint so old clients cannot silently fall
// through to an unprotected delivery implementation.
export async function POST() {
  return NextResponse.json({ error: "Delivery is not part of this submission." }, { status: 410 });
}
