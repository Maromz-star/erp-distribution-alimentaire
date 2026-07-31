import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

const ROUTES_PUBLIQUES = ["/login", "/api/auth/login"];

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const estRoutePublique = ROUTES_PUBLIQUES.some((route) =>
    pathname.startsWith(route)
  );

  const estFichierStatique =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (estRoutePublique || estFichierStatique) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  console.log("========== MIDDLEWARE ==========");
  console.log("PATH :", pathname);
  console.log("TOKEN :", token);

  let session: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      session = payload;
    } catch (err) {
      console.log("JWT ERROR :", err);
      session = null;
    }
  }

  console.log("SESSION :", session);
  console.log("================================");

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        { erreur: "Non authentifie. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("suite", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/api/utilisateurs") &&
    session.role !== "ADMIN"
  ) {
    return NextResponse.json(
      { erreur: "Reserve aux administrateurs." },
      { status: 403 }
    );
  }

  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-user-id", String(session.userId));
  requestHeaders.set("x-user-role", String(session.role));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
