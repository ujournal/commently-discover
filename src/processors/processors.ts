import type { Processor, ProcessorContext, ProcessorResult } from "./types";
import {
  buildBasicEmbedHtml,
  buildFacebookEmbedHtml,
  buildInstagramEmbedHtml,
  buildRedditEmbedHtml,
  buildSteamEmbedHtml,
  buildTelegramEmbedHtml,
  buildThreadsEmbedHtml,
  buildTikTokEmbedHtml,
  buildTwitterEmbedHtml,
} from "../utils/platform-embeds";
import { getEmbedUrl } from "../utils/embed-url";
import {
  getBasicRef,
  getFacebookPostRef,
  getInstagramEmbedRef,
  getRedditPostRef,
  getSteamWidgetRef,
  getTelegramPostRef,
  getThreadsPostRef,
  getTikTokVideoRef,
  getTwitterStatusRef,
} from "../utils/platform-refs";

function htmlResponse(html: string, context: ProcessorContext): Response {
  return new Response(html, { headers: context.htmlHeaders });
}

/** Twitter/X status embed. */
const twitterProcessor: Processor = {
  name: "twitter",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const ref = getTwitterStatusRef(url);
    if (!ref) return { handled: false };
    const html = buildTwitterEmbedHtml(ref.id, ref.href, context.acceptLanguage);
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Facebook post embed. */
const facebookProcessor: Processor = {
  name: "facebook",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const postUrl = getFacebookPostRef(url);
    if (!postUrl) return { handled: false };
    const html = buildFacebookEmbedHtml(postUrl, context.acceptLanguage);
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Instagram post/reel embed. */
const instagramProcessor: Processor = {
  name: "instagram",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const embedUrl = getInstagramEmbedRef(url);
    if (!embedUrl) return { handled: false };
    const html = buildInstagramEmbedHtml(
      embedUrl,
      url,
      context.acceptLanguage,
    );
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Steam store widget embed. */
const steamProcessor: Processor = {
  name: "steam",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const ref = getSteamWidgetRef(url);
    if (!ref) return { handled: false };
    const html = buildSteamEmbedHtml(
      ref.widgetUrl,
      ref.pageUrl,
      context.acceptLanguage,
    );
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Telegram post embed. */
const telegramProcessor: Processor = {
  name: "telegram",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const ref = getTelegramPostRef(url);
    if (!ref) return { handled: false };
    const html = buildTelegramEmbedHtml(ref, context.acceptLanguage);
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Threads post embed. */
const threadsProcessor: Processor = {
  name: "threads",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const postUrl = getThreadsPostRef(url);
    if (!postUrl) return { handled: false };
    const html = buildThreadsEmbedHtml(postUrl, context.acceptLanguage);
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Reddit post embed. */
const redditProcessor: Processor = {
  name: "reddit",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const ref = getRedditPostRef(url);
    if (!ref) return { handled: false };
    const html = buildRedditEmbedHtml(
      ref.postUrl,
      ref.subreddit,
      ref.titleSlug,
      context.acceptLanguage,
    );
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** TikTok video embed. */
const tiktokProcessor: Processor = {
  name: "tiktok",
  handle(url: string, context: ProcessorContext): ProcessorResult {
    const ref = getTikTokVideoRef(url);
    if (!ref) return { handled: false };
    const html = buildTikTokEmbedHtml(
      ref.videoId,
      ref.videoUrl,
      context.acceptLanguage,
    );
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/** Redirect to embed URL (YouTube, Vimeo, Twitch, Spotify, etc.). */
const embedRedirectProcessor: Processor = {
  name: "embed-redirect",
  handle(url: string): ProcessorResult {
    const embedUrl = getEmbedUrl(url);
    if (!embedUrl) return { handled: false };
    return { handled: true, response: Response.redirect(embedUrl, 302) };
  },
};

/** Final processor: basic link card (unfurl). Always handles. */
const basicProcessor: Processor = {
  name: "basic",
  async handle(url: string, context: ProcessorContext): Promise<ProcessorResult> {
    const ref = await getBasicRef(url, {
      acceptLanguage: context.acceptLanguage,
    });
    const html = buildBasicEmbedHtml(ref);
    return { handled: true, response: htmlResponse(html, context) };
  },
};

/**
 * Default ordered list of URL processors.
 * Each runs in order; first to return handled: true wins.
 * The last processor (basic) always handles and serves a link card.
 */
export const defaultProcessors: Processor[] = [
  twitterProcessor,
  facebookProcessor,
  instagramProcessor,
  steamProcessor,
  telegramProcessor,
  threadsProcessor,
  redditProcessor,
  tiktokProcessor,
  embedRedirectProcessor,
  basicProcessor,
];
