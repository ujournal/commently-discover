import { host } from "./url";

/** Domain of the URL, safe for Cache-Tag (Cloudflare purge-by-tag). */
export function getCacheTagFromUrl(url: string): string | null {
	try {
		return host(new URL(url));
	} catch {
		return null;
	}
}

/** Clone response and set Cache-Tag and X-Cache-Tag headers for the given tag. */
export function withCacheTag(response: Response, tag: string): Response {
	const h = new Headers(response.headers);
	h.set("Cache-Tag", tag);
	h.set("X-Cache-Tag", tag);
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: h,
	});
}
