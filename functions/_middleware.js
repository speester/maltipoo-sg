// Collapse non-canonical hostnames onto the apex domain (portfolio plan task 1.6, 2026-10-11).
//
// www.maltipoo.sg and maltipoo-sg.pages.dev both served 200 and showed up as hosts in GA4.
// A zone redirect rule would need a Cloudflare token with Rulesets scope; this function ships
// with the site and needs no new credential (same pattern as cavapoopuppy.sg).
//   - www.maltipoo.sg and maltipoo-sg.pages.dev  -> 301 to https://maltipoo.sg (path + query kept)
//   - <hash>.maltipoo-sg.pages.dev previews      -> served, but X-Robots-Tag: noindex
// URL paths are untouched: maltipoo.sg keeps its no-trailing-slash format:'file' URLs.
const CANONICAL_HOST = "maltipoo.sg";
const REDIRECT_HOSTS = new Set(["www.maltipoo.sg", "maltipoo-sg.pages.dev"]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }
  const res = await context.next();
  if (url.hostname.endsWith(".pages.dev")) {
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    return out;
  }
  return res;
}
