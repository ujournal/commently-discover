import { withCacheTag } from "./cache-tag";

/** robots.txt body that disallows all crawlers. */
export const ROBOTS_TXT_DISALLOW_ALL = "User-agent: *\nDisallow: /";

const ROBOTS_CACHE_TAG = "robots";

export async function getRobotsTxtResponse(
	request: Request,
	cache: Cache,
	ctx: ExecutionContext,
): Promise<Response | null> {
	if (new URL(request.url).pathname !== "/robots.txt") {
		return null;
	}
	const response = new Response(ROBOTS_TXT_DISALLOW_ALL, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
	const out = withCacheTag(response, ROBOTS_CACHE_TAG);
	ctx.waitUntil(cache.put(request, out.clone()));
	return out;
}
