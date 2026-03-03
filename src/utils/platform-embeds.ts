import { EMBED_RESIZE_SCRIPT_MAX_HEIGHT } from "./constants";
import { buildEmbedPageHtml } from "./embed-page";
import { escapeHtml } from "./html";
import { getViewInPlatformLabel } from "./i18n";
import type { BasicRef } from "./platform-refs";
import { buildCardHtml } from "./card";

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
      twttr.widgets.createTweet("${safeId}", document.getElementById("tweet-container"), { dnt: true });
    });
  `;
  return buildEmbedPageHtml({
    title: "X post",
    bodyContent: `  <div id="tweet-container" class="tweet-container"></div>\n  <script>${tweetScript}</script>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "X"),
    fallbackHref: tweetHref,
    wrapperStyle: `.embed-wrap { padding: 1rem; }
		.embed-wrap blockquote { margin: 0 auto; }
    .embed-wrap > .tweet-container > .twitter-tweet { margin: 0 auto !important; }`,
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
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Telegram"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 550px; }
    .embed-wrap iframe { max-width: 100%; }`,
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
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Reddit"),
    fallbackHref: postUrl,
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 640px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
  });
}

/** Build HTML for the basic (non-platform) link card from getBasicRef result. */
export function buildBasicEmbedHtml(ref: BasicRef): string {
  return buildCardHtml(ref);
}
