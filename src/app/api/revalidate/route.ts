import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * On-demand refresh. The Sheet pings this after an edit, the cached page and the
 * cached Sheets read are dropped, and the next page load is current.
 *
 * It returns nothing but a status — no Sheet data, no Log rows, ever. Access is
 * a shared secret in REVALIDATE_TOKEN, sent either as the `x-revalidate-token`
 * header (preferred — query strings show up in logs) or a `?token=` parameter.
 *
 * The 5-minute background refresh stays on as a backstop, so a missed ping only
 * ever means "current within five minutes" rather than "stale forever".
 */
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function presentedToken(req: NextRequest): string | null {
  const header = req.headers.get("x-revalidate-token");
  if (header?.trim()) return header.trim();
  const query = req.nextUrl.searchParams.get("token");
  return query?.trim() || null;
}

const noStore = { "Cache-Control": "no-store" };

function handle(req: NextRequest) {
  const expected = process.env.REVALIDATE_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_TOKEN is not set on this deployment" },
      { status: 503, headers: noStore },
    );
  }

  const given = presentedToken(req);
  if (!given || !safeEqual(given, expected)) {
    return NextResponse.json(
      { ok: false, error: "bad or missing token" },
      { status: 401, headers: noStore },
    );
  }

  // Next 16: the second argument is the cache lifetime — expire 0 means "now".
  revalidateTag("sheet", { expire: 0 });
  revalidatePath("/");

  return NextResponse.json(
    { ok: true, revalidatedAt: new Date().toISOString() },
    { headers: noStore },
  );
}

export const GET = handle;
export const POST = handle;
