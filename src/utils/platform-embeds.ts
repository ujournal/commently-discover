import { buildBasicLinkCardSvg } from "./basic-link-svg";
import { EMBED_RESIZE_SCRIPT_MAX_HEIGHT } from "./constants";
import { buildEmbedPageHtml } from "./embed-page";
import { escapeHtml } from "./html";
import { getViewInPlatformLabel } from "./i18n";
import type { BasicRef } from "./platform-refs";

/** Build HTML page that embeds a Twitter/X tweet (programmatic API + fallback link so it's never blank). */
export function buildTwitterEmbedHtml(
  tweetId: string,
  tweetHref: string,
  acceptLanguage: string | null,
): string {
  const safeId = escapeHtml(tweetId);
  const tweetScript = `
    window.twttr = (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0], t = window.twttr || {};
      if (d.getElementById(id)) return t;
      js = d.createElement(s); js.id = id; js.async = true; js.src = "https://platform.twitter.com/widgets.js";
      fjs.parentNode.insertBefore(js, fjs);
      t._e = []; t.ready = function(f) { t._e.push(f); };
      return t;
    }(document, "script", "twitter-wjs"));
    twttr.ready(function() {
      var p = twttr.widgets.createTweet("${safeId}", document.getElementById("tweet-container"), { dnt: true, chrome: "nofooter" });
      if (p && typeof p.then === "function") {
        p.then(function() {
          if (window.__commentlyDiscoverHideEmbedSkeleton) window.__commentlyDiscoverHideEmbedSkeleton();
        }).catch(function() {
          if (window.__commentlyDiscoverHideEmbedSkeleton) window.__commentlyDiscoverHideEmbedSkeleton();
        });
      }
    });
  `;
  return buildEmbedPageHtml({
    title: "X post",
    bodyContent: `  <div id="tweet-container" class="tweet tweet-container"></div>\n  <script>${tweetScript}</script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "X"),
    fallbackHref: tweetHref,
    wrapperStyle: `.embed-wrap { padding: 1rem; }
		.embed-wrap blockquote { margin: 0 auto; }
    .embed-wrap .twitter-tweet { margin: 0 auto !important; }`,
  });
}

/** Build HTML page that embeds a Facebook post via the official Embedded Post plugin (same pattern as X/Telegram). */
export function buildFacebookEmbedHtml(
  postUrl: string,
  acceptLanguage: string | null,
): string {
  const safeHref = escapeHtml(postUrl);
  return buildEmbedPageHtml({
    title: "Facebook post",
    bodyContent: `  <div id="fb-root"></div>
  <div class="fb-post" data-href="${safeHref}" data-width="500"></div>
  <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v3.2"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Facebook"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap .fb-post { margin: 0 auto; background-color: #fff; }
    .embed-wrap { padding: 1rem 1rem 1rem 0; max-width: 500px; }`,
  });
}

/** Build HTML page that embeds an Instagram post/reel via official blockquote + embed.js (same pattern as Threads/Twitter). */
export function buildInstagramEmbedHtml(
  _embedUrl: string,
  postUrl: string,
  acceptLanguage: string | null,
): string {
  const safePermalink = escapeHtml(postUrl);
  return buildEmbedPageHtml({
    title: "Instagram post",
    bodyContent: `  <blockquote class="instagram-media" data-instgrm-permalink="${safePermalink}" data-instgrm-version="14" style="width:100%; max-width:540px; margin: 0 auto;"></blockquote>
  <script async src="https://www.instagram.com/embed.js"></script>
  <script>
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
  </script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Instagram"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 540px; margin: 0 auto; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Build HTML page that embeds a Steam game widget in an iframe with height resize to parent (same pattern as tg/fb/x/instagram). */
export function buildSteamEmbedHtml(
  widgetUrl: string,
  pageUrl: string,
  acceptLanguage: string | null,
): string {
  const safeWidgetUrl = escapeHtml(widgetUrl);
  return buildEmbedPageHtml({
    title: "Steam store",
    bodyContent: `    <iframe src="${safeWidgetUrl}" title="Steam store widget"></iframe>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Steam"),
    fallbackHref: pageUrl,
    bodyStyle:
      "display: flex; flex-direction: column; justify-content: center;",
    wrapperStyle: `.embed-wrap { padding: 1rem; width: 100%; display: flex; flex-direction: column; align-items: center; }
    .embed-wrap iframe { width: 100%; height: 200px; }`,
    resizeScript: EMBED_RESIZE_SCRIPT_MAX_HEIGHT,
  });
}

/** Build HTML page that embeds a Telegram post via the official widget script. */
export function buildTelegramEmbedHtml(
  postRef: string,
  acceptLanguage: string | null,
): string {
  const safeRef = escapeHtml(postRef);
  const postUrl = `https://t.me/${postRef}`;
  return buildEmbedPageHtml({
    title: "Telegram post",
    bodyContent: `    <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-post="${safeRef}" data-width="100%"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Telegram"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 550px; }
    .embed-wrap iframe { max-width: 100%; }`,
  });
}

const BLUESKY_OEMBED_URL = "https://embed.bsky.app/oembed";

/** Fetch official post embed markup (blockquote + script) from Bluesky oEmbed. */
export async function fetchBlueskyOembedFragment(
  postUrl: string,
): Promise<string | null> {
  try {
    const endpoint = `${BLUESKY_OEMBED_URL}?url=${encodeURIComponent(postUrl)}`;
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { html?: unknown };
    if (typeof data.html !== "string" || !data.html.includes("bluesky-embed")) {
      return null;
    }
    return data.html;
  } catch {
    return null;
  }
}

/** Build HTML page that embeds a Bluesky post via oEmbed snippet + embed.bsky.app/static/embed.js. */
export function buildBlueskyEmbedHtml(
  oembedHtmlFragment: string,
  postUrl: string,
  acceptLanguage: string | null,
): string {
  const inner = oembedHtmlFragment.trim();
  return buildEmbedPageHtml({
    title: "Bluesky post",
    bodyContent: `  ${inner}`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Bluesky"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 600px; margin: 0 auto; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Official Mastodon logo path (static SVG, same as instance “Embed” snippet). */
const MASTODON_EMBED_SVG_PATH =
  "M63 45.3v-20c0-4.1-1-7.3-3.2-9.7-2.1-2.4-5-3.7-8.5-3.7-4.1 0-7.2 1.6-9.3 4.7l-2 3.3-2-3.3c-2-3.1-5.1-4.7-9.2-4.7-3.5 0-6.4 1.3-8.6 3.7-2.1 2.4-3.1 5.6-3.1 9.7v20h8V25.9c0-4.1 1.7-6.2 5.2-6.2 3.8 0 5.8 2.5 5.8 7.4V37.7H44V27.1c0-4.9 1.9-7.4 5.8-7.4 3.5 0 5.2 2.1 5.2 6.2V45.3h8ZM74.7 16.6c.6 6 .1 15.7.1 17.3 0 .5-.1 4.8-.1 5.3-.7 11.5-8 16-15.6 17.5-.1 0-.2 0-.3 0-4.9 1-10 1.2-14.9 1.4-1.2 0-2.4 0-3.6 0-4.8 0-9.7-.6-14.4-1.7-.1 0-.1 0-.1 0s-.1 0-.1 0 0 .1 0 .1 0 0 0 0c.1 1.6.4 3.1 1 4.5.6 1.7 2.9 5.7 11.4 5.7 5 0 9.9-.6 14.8-1.7 0 0 0 0 0 0 .1 0 .1 0 .1 0 0 .1 0 .1 0 .1.1 0 .1 0 .1.1v5.6s0 .1-.1.1c0 0 0 0 0 .1-1.6 1.1-3.7 1.7-5.6 2.3-.8.3-1.6.5-2.4.7-7.5 1.7-15.4 1.3-22.7-1.2-6.8-2.4-13.8-8.2-15.5-15.2-.9-3.8-1.6-7.6-1.9-11.5-.6-5.8-.6-11.7-.8-17.5C3.9 24.5 4 20 4.9 16 6.7 7.9 14.1 2.2 22.3 1c1.4-.2 4.1-1 16.5-1h.1C51.4 0 56.7.8 58.1 1c8.4 1.2 15.5 7.5 16.6 15.6Z";

/** Build HTML page that embeds a Mastodon post via official blockquote + instance embed.js. */
export function buildMastodonEmbedHtml(
  postUrl: string,
  acceptLanguage: string | null,
): string {
  const u = new URL(postUrl);
  const postNorm = postUrl.replace(/\/+$/, "");
  const embedDataUrl = `${postNorm}/embed`;
  const origin = u.origin;
  const scriptSrc = `${origin}/embed.js`;
  const allowedPrefixes = `${origin}/`;
  const handleMatch = u.pathname.match(/^\/@([^/]+)\/\d+/);
  const handle = handleMatch?.[1] ?? "";
  const postByLine =
    handle !== ""
      ? `Post by @${handle}@${u.hostname}`
      : "Post on Mastodon";
  const safePost = escapeHtml(postNorm);
  const safeEmbed = escapeHtml(embedDataUrl);
  const safeScript = escapeHtml(scriptSrc);
  const safePrefixes = escapeHtml(allowedPrefixes);
  const safePostBy = escapeHtml(postByLine);
  return buildEmbedPageHtml({
    title: "Mastodon post",
    bodyContent: `  <blockquote class="mastodon-embed" data-embed-url="${safeEmbed}" style="background: #FCF8FF; border-radius: 8px; border: 1px solid #C9C4DA; margin: 0; max-width: 540px; min-width: 270px; overflow: hidden; padding: 0;">
  <a href="${safePost}" target="_blank" rel="noopener noreferrer" style="align-items: center; color: #1C1A25; display: flex; flex-direction: column; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Roboto, sans-serif; font-size: 14px; justify-content: center; letter-spacing: 0.25px; line-height: 20px; padding: 24px; text-decoration: none;">
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="32" height="32" viewBox="0 0 79 75"><path d="${MASTODON_EMBED_SVG_PATH}" fill="currentColor"/></svg>
  <div style="color: #787588; margin-top: 16px;">${safePostBy}</div>
  <div style="font-weight: 500;">View on Mastodon</div>
  </a>
  </blockquote>
  <script data-allowed-prefixes="${safePrefixes}" async src="${safeScript}"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Mastodon"),
    fallbackHref: postNorm,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 560px; margin: 0 auto; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Build HTML page that embeds a Threads post via the official blockquote + embed.js (same pattern as X/Telegram). */
export function buildThreadsEmbedHtml(
  postUrl: string,
  acceptLanguage: string | null,
): string {
  const safePostUrl = escapeHtml(postUrl);
  return buildEmbedPageHtml({
    title: "Threads post",
    bodyContent: `  <blockquote class="text-post-media" data-text-post-permalink="${safePostUrl}"></blockquote>
  <script async src="https://www.threads.net/embed.js" charset="utf-8"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Threads"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 658px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Build HTML page that embeds a TikTok video via blockquote + embed.js (same pattern as Reddit). */
export function buildTikTokEmbedHtml(
  videoId: string,
  videoUrl: string,
  acceptLanguage: string | null,
): string {
  const safeVideoId = escapeHtml(videoId);
  const safeVideoUrl = escapeHtml(videoUrl);
  return buildEmbedPageHtml({
    title: "TikTok video",
    bodyContent: `  <blockquote class="tiktok-embed" cite="${safeVideoUrl}" data-video-id="${safeVideoId}" style="max-width: 605px;min-width: 325px;">
  <a href="${safeVideoUrl}">TikTok video</a>
</blockquote>
  <script async src="https://www.tiktok.com/embed.js"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "TikTok"),
    fallbackHref: videoUrl,
    bodyStyle: "background: #fff;",
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 640px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Lowercase percent-encoding in a URL so it matches Reddit's embed format (e.g. %d1%87 not %D1%87). */
function redditEmbedHref(url: string): string {
  return url.replace(/%[0-9A-Fa-f]{2}/g, (m) => m.toLowerCase());
}

/** Build HTML page that embeds a single Reddit POST via embed.reddit.com/widgets.js. Blockquote must contain ONLY the post link so the widget picks the post (not the subreddit link, which would show a feed). */
export function buildRedditEmbedHtml(
  postUrl: string,
  subreddit: string,
  titleSlug: string | null,
  acceptLanguage: string | null,
): string {
  const embedPostUrl = redditEmbedHref(postUrl);
  const safePostUrl = escapeHtml(embedPostUrl);
  const titleText =
    titleSlug != null ? titleSlug.replace(/_/g, " ") : "Reddit post";
  const safeTitleText = escapeHtml(titleText);
  return buildEmbedPageHtml({
    title: "Reddit post",
    bodyContent: `  <blockquote class="reddit-embed-bq" style="height:500px" data-embed-height="372">
  <a href="${safePostUrl}">${safeTitleText}</a>
</blockquote>
  <script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`,
    scriptEmbedSkeleton: true,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Reddit"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 640px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Build SVG for the basic (non-platform) link card from getBasicRef result. */
export function buildBasicEmbedHtml(ref: BasicRef): string {
  return buildBasicLinkCardSvg(ref);
}
