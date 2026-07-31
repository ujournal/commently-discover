import { runProcessors } from "./processors";
import { getCacheTagFromUrl, withCacheTag } from "./utils/cache-tag";
import {
	getPreflightResponse,
	parseAllowedOrigins,
	withCors,
} from "./utils/cors";
import { getFaviconResponse } from "./utils/favicon";
import { getInvalidUrlResponse } from "./utils/invalid-url";
import { getRobotsTxtResponse } from "./utils/robots";
import { getUrlFromBase64PathSegment } from "./utils/url";

export { defaultProcessors, runProcessors } from "./processors";
export type {
	Processor,
	ProcessorContext,
	ProcessorResult,
} from "./processors";
export type {
	DiscoverCard,
	DiscoverIframe,
	DiscoverResponse,
} from "./utils/discover";

interface Env {
	ASSETS: Fetcher;
	/** Comma-separated list of allowed CORS origins. */
	ALLOWED_ORIGINS?: string;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const cache = caches.default;
		const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

		if (request.method === "OPTIONS") {
			return getPreflightResponse(request, allowedOrigins);
		}

		const cachedResponse = await cache.match(request);
		if (cachedResponse) {
			return cachedResponse;
		}

		const faviconResponse = await getFaviconResponse(
			request,
			env.ASSETS,
			cache,
			ctx,
		);
		if (faviconResponse) {
			return faviconResponse;
		}

		const robotsResponse = await getRobotsTxtResponse(request, cache, ctx);
		if (robotsResponse) {
			return robotsResponse;
		}

		const requestUrl = new URL(request.url);
		const { searchParams } = requestUrl;
		let target = searchParams.get("url");
		if (!target) {
			target = getUrlFromBase64PathSegment(requestUrl.pathname);
		}
		// Handle double-encoded url param (e.g. %253A → %3A, %2525 → %25)
		if (target && target.includes("%25")) {
			try {
				target = decodeURIComponent(target);
			} catch {
				/* keep original */
			}
		}

		if (!target || !target.match(/^https?:\/\//)) {
			const response = withCors(getInvalidUrlResponse(), request, allowedOrigins);
			ctx.waitUntil(cache.put(request, response.clone()));
			return response;
		}

		const acceptLanguage =
			searchParams.get("lang") ?? request.headers.get("Accept-Language");
		const response = await runProcessors(target, {
			acceptLanguage,
		});

		const tag = getCacheTagFromUrl(target);
		const out =
			response.ok && tag ? withCacheTag(response, tag) : response;
		const outWithCors = withCors(out, request, allowedOrigins);

		if (response.ok) {
			ctx.waitUntil(cache.put(request, outWithCors.clone()));
		}

		return outWithCors;
	},
};
