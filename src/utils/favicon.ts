import { withCacheTag } from "./cache-tag";

const FAVICON_CACHE_CONTROL = "public, max-age=31536000, immutable";
const FAVICON_CACHE_TAG = "favicon";

export async function getFaviconResponse(
	request: Request,
	assets: Fetcher | undefined,
	cache: Cache,
	ctx: ExecutionContext,
): Promise<Response | null> {
	if (new URL(request.url).pathname !== "/favicon.ico" || !assets) {
		return null;
	}
	const assetResponse = await assets.fetch(request);
	if (!assetResponse.ok) return assetResponse;
	const headers = new Headers(assetResponse.headers);
	headers.set("Cache-Control", FAVICON_CACHE_CONTROL);
	const response = new Response(assetResponse.body, {
		status: assetResponse.status,
		statusText: assetResponse.statusText,
		headers,
	});
	const out = withCacheTag(response, FAVICON_CACHE_TAG);
	ctx.waitUntil(cache.put(request, out.clone()));
	return out;
}
