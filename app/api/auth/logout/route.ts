import { NextRequest, NextResponse } from "next/server";
import { getSession, journaliser, sessionCookieOptions } from "@/lib/auth";

export async function POST(_request: NextRequest) {
  const session = await getSession();
  if (session) {
    await journaliser(session.userId, "DECONNEXION");
  }

  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(sessionCookieOptions().name, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return reponse;
}
