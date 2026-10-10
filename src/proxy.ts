import { NextResponse, type NextRequest } from "next/server";

/**
 * The whole site sits behind HTTP basic auth — this is private financial data,
 * and the Log carries store names and dollar amounts. There is no API route that
 * returns Sheet rows; everything is rendered on the server.
 *
 * Vercel's own Password Protection can be used instead of (or on top of) this.
 * (Next 16 renamed the middleware convention to `proxy`.)
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const challenge = () =>
  new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Rebeaux\'s BBQ Sauce dashboard", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });

export default function proxy(req: NextRequest) {
  const expectedUser = process.env.DASHBOARD_USER?.trim() || "rbx";
  const expectedPass = process.env.DASHBOARD_PASSWORD;

  if (!expectedPass) {
    // Local development runs open; a deployment without a password does not.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(
      "DASHBOARD_PASSWORD is not set on this deployment. Add it in Vercel → Settings → Environment Variables, then redeploy.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return challenge();

  let decoded = "";
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return challenge();
  }
  const split = decoded.indexOf(":");
  if (split < 0) return challenge();
  const user = decoded.slice(0, split);
  const pass = decoded.slice(split + 1);

  if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
    return NextResponse.next();
  }
  return challenge();
}
