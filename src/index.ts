import { unfurl } from "cloudflare-workers-unfurl";
import { buildCardHtml } from "./utils/card";
import {
  CACHE_HEADERS,
  MAX_FAVICON_BYTES,
  MAX_IMAGE_BYTES,
} from "./utils/constants";
import { getEmbedUrl } from "./utils/embed-url";
import { fetchAsBase64 } from "./utils/image";
import {
  buildFacebookEmbedHtml,
  buildInstagramEmbedHtml,
  buildRedditEmbedHtml,
  buildSteamEmbedHtml,
  buildTelegramEmbedHtml,
  buildThreadsEmbedHtml,
  buildTikTokEmbedHtml,
  buildTwitterEmbedHtml,
} from "./utils/platform-embeds";
import {
  getFacebookPostRef,
  getInstagramEmbedRef,
  getRedditPostRef,
  getSteamWidgetRef,
  getTelegramPostRef,
  getThreadsPostRef,
  getTikTokVideoRef,
  getTwitterStatusRef,
} from "./utils/platform-refs";
import { shimSiteData } from "./utils/shim";
import { unfurlFallback } from "./utils/unfurl";
import { getSiteName } from "./utils/url";

export type { EmbedPageOptions } from "./utils/embed-page";

const headers = {
  "content-type": "text/html; charset=utf-8",
  ...CACHE_HEADERS,
};

export default {
  async fetch(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    let target = searchParams.get("url");
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

    const acceptLanguage = request.headers.get("Accept-Language");

    const twitterStatus = getTwitterStatusRef(target);
    if (twitterStatus) {
      const html = buildTwitterEmbedHtml(
        twitterStatus.id,
        twitterStatus.href,
        acceptLanguage,
      );
      return new Response(html, {
        headers,
      });
    }

    const facebookPostUrl = getFacebookPostRef(target);
    if (facebookPostUrl) {
      const html = buildFacebookEmbedHtml(facebookPostUrl, acceptLanguage);
      return new Response(html, {
        headers,
      });
    }

    const instagramEmbedUrl = getInstagramEmbedRef(target);
    if (instagramEmbedUrl) {
      const html = buildInstagramEmbedHtml(
        instagramEmbedUrl,
        target,
        acceptLanguage,
      );
      return new Response(html, {
        headers,
      });
    }

    const steamRef = getSteamWidgetRef(target);
    if (steamRef) {
      const html = buildSteamEmbedHtml(
        steamRef.widgetUrl,
        steamRef.pageUrl,
        acceptLanguage,
      );
      return new Response(html, {
        headers,
      });
    }

    const telegramPostRef = getTelegramPostRef(target);
    if (telegramPostRef) {
      const html = buildTelegramEmbedHtml(telegramPostRef, acceptLanguage);
      return new Response(html, {
        headers,
      });
    }

    const threadsPostUrl = getThreadsPostRef(target);
    if (threadsPostUrl) {
      const html = buildThreadsEmbedHtml(threadsPostUrl, acceptLanguage);
      return new Response(html, {
        headers,
      });
    }

    const redditRef = getRedditPostRef(target);
    if (redditRef) {
      const html = buildRedditEmbedHtml(
        redditRef.postUrl,
        redditRef.subreddit,
        redditRef.titleSlug,
        acceptLanguage,
      );
      return new Response(html, {
        headers,
      });
    }

    const tiktokRef = getTikTokVideoRef(target);
    if (tiktokRef) {
      const html = buildTikTokEmbedHtml(
        tiktokRef.videoId,
        tiktokRef.videoUrl,
        acceptLanguage,
      );
      return new Response(html, {
        headers,
      });
    }

    const embedUrl = getEmbedUrl(target);
    if (embedUrl) {
      return Response.redirect(embedUrl, 302);
    }

    let result = await unfurl(target);

    if (!result.ok && result.error === "failed-fetch") {
      const fallback = await unfurlFallback(target);
      if (fallback) result = { ok: true, value: fallback };
    }

    // On any unfurl failure (bad-param, failed-fetch, etc.) use shim data and return a card, never JSON
    const data = result.ok ? result.value : shimSiteData(target);
    const siteName = getSiteName(target);

    const [imageDataUrl, faviconDataUrl] = await Promise.all([
      data.image ? fetchAsBase64(data.image, MAX_IMAGE_BYTES) : null,
      data.favicon ? fetchAsBase64(data.favicon, MAX_FAVICON_BYTES) : null,
    ]);

    const html = buildCardHtml({
      title: data.title,
      description: data.description,
      imageDataUrl: imageDataUrl?.dataUrl ?? null,
      faviconDataUrl: faviconDataUrl?.dataUrl ?? null,
      url: target,
      siteName,
    });

    return new Response(html, {
      headers,
    });
  },
};
