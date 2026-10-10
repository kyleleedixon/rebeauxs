import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional site password. Set DASHBOARD_PASSWORD and the whole site sits behind
 * HTTP basic auth; leave it unset and the site is open to anyone with the URL.
 *
 * It is unset by choice here — the owner asked for no prompt. The data is still
 * private (store names, dollar amounts), so if the link ever spreads further than
 * intended, set DASHBOARD_PASSWORD in Vercel and redeploy to lock it again, or
 * use Vercel's own Deployment Protection. There is no API route that returns
 * Sheet rows; everything is rendered on the server either way.
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

  // No password configured: the site is open. Setting the variable re-locks it.
  if (!expectedPass) return NextResponse.next();

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
