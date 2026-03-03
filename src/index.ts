import { buildCardHtml } from "./utils/card";
import { getUrlFromBase64PathSegment } from "./utils/url";
import { runProcessors } from "./processors";

export type { EmbedPageOptions } from "./utils/embed-page";
export type { Processor, ProcessorContext, ProcessorResult } from "./processors";
export { runProcessors, defaultProcessors } from "./processors";

export default {
  async fetch(request: Request): Promise<Response> {
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

    return runProcessors(target, {
      acceptLanguage: request.headers.get("Accept-Language"),
    });
  },
};
