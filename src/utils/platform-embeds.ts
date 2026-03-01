import { EMBED_RESIZE_SCRIPT_MAX_HEIGHT } from "./constants"
import { buildEmbedPageHtml } from "./embed-page"
import { escapeHtml } from "./html"
import { getViewInPlatformLabel } from "./i18n"

/** Build HTML page that embeds a Twitter/X tweet (programmatic API + fallback link so it's never blank). */
export function buildTwitterEmbedHtml(tweetId: string, tweetHref: string, acceptLanguage: string | null): string {
  const safeId = escapeHtml(tweetId)
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
  `
  return buildEmbedPageHtml({
    title: "X post",
    bodyContent: `  <div id="tweet-container" class="tweet-container"></div>\n  <script>${tweetScript}</script>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "X"),
    fallbackHref: tweetHref,
    fallbackLinkColor: "#1d9bf0",
    bodyStyle: "background: #f7f9f9;",
    wrapperStyle: `.embed-wrap { padding: 1rem; }
		.embed-wrap blockquote { margin: 0 auto; }
    .embed-wrap > .tweet-container > .twitter-tweet { margin: 0 auto !important; }`,
  })
}

/** Build HTML page that embeds a Facebook post via the official Embedded Post plugin (same pattern as X/Telegram). */
export function buildFacebookEmbedHtml(postUrl: string, acceptLanguage: string | null): string {
  const safeHref = escapeHtml(postUrl)
  return buildEmbedPageHtml({
    title: "Facebook post",
    bodyContent: `  <div id="fb-root"></div>
  <div class="fb-post" data-href="${safeHref}" data-width="500"></div>
  <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v3.2"></script>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Facebook"),
    fallbackHref: postUrl,
    fallbackLinkColor: "#0866ff",
    bodyStyle: "background: #f0f2f5;",
    wrapperStyle: ".embed-wrap .fb-post { margin: 0 auto; }",
  })
}

/** Build HTML page that embeds an Instagram post/reel in an iframe with height resize message (same pattern as tg/fb/x). */
export function buildInstagramEmbedHtml(embedUrl: string, postUrl: string, acceptLanguage: string | null): string {
  const safeEmbedUrl = escapeHtml(embedUrl)
  return buildEmbedPageHtml({
    title: "Instagram post",
    bodyContent: `    <iframe src="${safeEmbedUrl}" title="Instagram post" scrolling="no"></iframe>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Instagram"),
    fallbackHref: postUrl,
    fallbackLinkColor: "#0095f6",
    bodyStyle: "background: #f7f9f9; overflow: hidden;",
    wrapperStyle: `.embed-wrap { overflow: hidden; padding: 1rem; }
    .embed-wrap iframe { width: 100%; height: 800px; overflow: hidden; outline: 1px solid rgba(0, 0, 0, 0.08); outline-offset: -1px; border-radius: 0.5rem; }
    @media (prefers-color-scheme: dark) { .embed-wrap iframe { outline-color: rgba(255, 255, 255, 0.08); } }`,
  })
}

/** Build HTML page that embeds a Steam game widget in an iframe with height resize to parent (same pattern as tg/fb/x/instagram). */
export function buildSteamEmbedHtml(widgetUrl: string, pageUrl: string, acceptLanguage: string | null): string {
  const safeWidgetUrl = escapeHtml(widgetUrl)
  return buildEmbedPageHtml({
    title: "Steam store",
    bodyContent: `    <iframe src="${safeWidgetUrl}" title="Steam store widget"></iframe>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Steam"),
    fallbackHref: pageUrl,
    bodyStyle: "background: transparent; display: flex; flex-direction: column; justify-content: center;",
    wrapperStyle: `.embed-wrap { padding: 1rem; width: 100%; display: flex; flex-direction: column; align-items: center; }
    .embed-wrap iframe { width: 100%; height: 200px; }`,
    resizeScript: EMBED_RESIZE_SCRIPT_MAX_HEIGHT,
  })
}

/** Build HTML page that embeds a Telegram post via the official widget script. */
export function buildTelegramEmbedHtml(postRef: string, acceptLanguage: string | null): string {
  const safeRef = escapeHtml(postRef)
  const postUrl = `https://t.me/${postRef}`
  return buildEmbedPageHtml({
    title: "Telegram post",
    bodyContent: `    <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-post="${safeRef}" data-width="100%"></script>`,
    fallbackLabel: getViewInPlatformLabel(acceptLanguage, "Telegram"),
    fallbackHref: postUrl,
    bodyStyle: "background: transparent;",
    wrapperStyle: `.embed-wrap { padding: 1rem; max-width: 550px; }
    .embed-wrap iframe { max-width: 100%; }`,
  })
}
