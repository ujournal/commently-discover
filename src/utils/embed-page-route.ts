import { getCacheTagFromUrl, withCacheTag } from "./cache-tag";
import { CACHE_HEADERS } from "./constants";
import { buildEmbedHtmlForUrl } from "./platform-embeds";
import { getUrlFromBase64PathSegment } from "./url";

const HTML_HEADERS: HeadersInit = {
	"content-type": "text/html; charset=utf-8",
	...CACHE_HEADERS,
};

function htmlResponse(html: string): Response {
	return new Response(html, { headers: HTML_HEADERS });
}

function badRequest(): Response {
	return new Response(JSON.stringify({ error: "Bad Request" }), {
		status: 400,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}

/**
 * Serve script-widget embed pages at `/embed/{base64url}`. These pages are the
 * `iframeSrc` for platforms without a direct iframe URL (X, Facebook, Telegram,
 * Threads, Bluesky): the client iframes this page, which loads the platform's
 * official widget script (frame-in-frame). Returns null for non-embed routes.
 * Errors are not cached; successful pages are cached (top-level cache.match in
 * the worker serves subsequent hits).
 */
export async function getEmbedPageResponse(
	requestUrl: URL,
	acceptLanguage: string | null,
	cache: Cache,
	ctx: ExecutionContext,
): Promise<Response | null> {
	if (!requestUrl.pathname.startsWith("/embed/")) return null;

	const target = getUrlFromBase64PathSegment(requestUrl.pathname);
	const html = target ? await buildEmbedHtmlForUrl(target, acceptLanguage) : null;
	if (!html) return badRequest();

	const response = htmlResponse(html);
	const tag = target ? getCacheTagFromUrl(target) : null;
	const out = tag ? withCacheTag(response, tag) : response;
	ctx.waitUntil(cache.put(new Request(requestUrl), out.clone()));
	return out;
}
