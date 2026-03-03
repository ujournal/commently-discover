import { buildCardHtml } from "./utils/card";
import { getUrlFromBase64PathSegment } from "./utils/url";
import { runProcessors } from "./processors";

export type { EmbedPageOptions } from "./utils/embed-page";
export type { Processor, ProcessorContext, ProcessorResult } from "./processors";
export { runProcessors, defaultProcessors } from "./processors";

export default {
  async fetch(
    request: Request,
    _env: unknown,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const cache = caches.default;

    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

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
      const html = buildCardHtml({
        title: "Invalid URL",
        description: "Provide a full URL via ?url=https://example.com",
        imageDataUrl: null,
        faviconDataUrl: null,
        url: "Missing or invalid ?url parameter",
        href: "about:blank",
        siteName: "Commently",
      });
      return new Response(html, {
        status: 400,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const response = await runProcessors(target, {
      acceptLanguage: request.headers.get("Accept-Language"),
    });

    if (response.ok || response.status === 302) {
      ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
