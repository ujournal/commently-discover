import { runProcessors } from "./processors";
import { getCacheTagFromUrl, withCacheTag } from "./utils/cache-tag";
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
export type { EmbedPageOptions } from "./utils/embed-page";

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const cache = caches.default;

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
      const response = getInvalidUrlResponse();
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }

    const response = await runProcessors(target, {
      acceptLanguage: request.headers.get("Accept-Language"),
    });

    const tag = getCacheTagFromUrl(target);
    const out =
      (response.ok || response.status === 302) && tag
        ? withCacheTag(response, tag)
        : response;

    if (response.ok || response.status === 302) {
      ctx.waitUntil(cache.put(request, out.clone()));
    }

    return out;
  },
};
