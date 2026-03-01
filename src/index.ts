import { unfurl } from "cloudflare-workers-unfurl";

const MAX_IMAGE_BYTES = 1024 * 1024 // 1MB for og:image
const MAX_FAVICON_BYTES = 256 * 1024 // 256KB for favicon
const IMAGE_FETCH_TIMEOUT_MS = 5000

/** Fallback when library returns failed-fetch. */
async function unfurlFallback(
  url: string
): Promise<{ title?: string; description?: string; image?: string; favicon?: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Commently-Bot/1.0 (+https://commently.com)" },
    })
    if (!res.ok) return null
    const html = await res.text()
    const base = new URL(url).origin

    const getMeta = (names: string[]): string | undefined => {
      for (const name of names) {
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']|` +
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
          "i"
        )
        const m = html.match(re)
        const v = m ? (m[1] ?? m[2])?.trim() : undefined
        if (v) return v
      }
      return undefined
    }

    let title = getMeta(["og:title", "twitter:title"])
    if (!title) {
      const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
      title = t ? t[1].replace(/<[^>]+>/g, "").trim() : undefined
    }
    const description = getMeta(["og:description", "twitter:description", "description"])
    let image = getMeta(["og:image", "twitter:image"])
    if (image?.startsWith("/")) image = base + image

    let favicon: string | undefined
    const fav =
      html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ??
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i)
    if (fav) {
      favicon = fav[1].trim()
      if (favicon.startsWith("/")) favicon = base + favicon
    }

    return { title, description, image, favicon }
  } catch {
    return null
  }
}

/** Fetch image URL and return base64 data URL, or null. */
async function fetchAsBase64(
  imageUrl: string,
  maxBytes: number
): Promise<{ dataUrl: string; contentType: string } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Commently-Bot/1.0" },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png"
    if (!contentType.startsWith("image/")) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > maxBytes) return null
    const bytes = new Uint8Array(buf)
    let binary = ""
    const chunk = 8192
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    const b64 = btoa(binary)
    return { dataUrl: `data:${contentType};base64,${b64}`, contentType }
  } catch {
    return null
  }
}

/** Decode HTML entities so text displays with proper symbols (e.g. &quot; → "). */
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Script injected into embed pages: sends scroll height to parent via postMessage so outer frame can resize iframe. */
const EMBED_RESIZE_SCRIPT = `
(function() {
  var lastHeight = 0;
  function sendHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight || 0
    );
    if (h !== lastHeight) {
      lastHeight = h;
      try { window.parent.postMessage({ type: "commently-discover-resize", height: h }, "*"); } catch (e) {}
    }
  }
  function scheduleSend() {
    requestAnimationFrame(function() { sendHeight(); });
  }
  sendHeight();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleSend);
    ro.observe(document.body);
    if (document.documentElement !== document.body) ro.observe(document.documentElement);
  }
  var mo = new MutationObserver(scheduleSend);
  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", scheduleSend);
})();
`

/** Deterministic gradient CSS from URL (for cards with no image). */
function urlToGradientCss(url: string): string {
  let h = 0
  for (let i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0
  // Cool base hue (teal–blue–violet), then complementary (soft warm)
  const coolHue = 200 + ((h % 70) + 70) % 70 // 200–270°
  const compHue = (coolHue + 180) % 360
  return `linear-gradient(135deg, hsl(${coolHue}, 38%, 78%), hsl(${compHue}, 32%, 90%))`
}

/** Decode entities then escape for safe HTML output. */
function prepareText(s: string): string {
  return escapeHtml(decodeHtmlEntities(s))
}

/** Build responsive HTML card with base64 images and cache headers. */
function buildCardHtml(opts: {
  title: string | undefined
  description: string | undefined
  imageDataUrl: string | null
  faviconDataUrl: string | null
  url: string
  href?: string
  siteName: string
}): string {
  const { title, description, imageDataUrl, faviconDataUrl, url, href, siteName } = opts
  const displayTitle = title ? prepareText(title) : "Link"
  const displayDesc = description ? prepareText(description) : ""
  const displayUrl = prepareText(url)
  const displaySite = prepareText(siteName)

  const gradientCss = imageDataUrl ? null : urlToGradientCss(url)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${displayTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    .card {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      max-width: 100%;
      background: var(--card-bg);
      color: var(--card-fg);
      overflow: hidden;
      position: relative;
    }
    .card-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: var(--card-image-bg);
      display: block;
    }
    .card-image--gradient {
      background: var(--card-image-bg);
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: clamp(10px, 2.5vw, 18px);
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 70%;
      min-width: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
      z-index: 1;
    }
    .card-site {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: clamp(0.65rem, 2.2vw, 0.8rem);
      color: var(--card-accent);
    }
    .card-site img { width: 1rem; height: 1rem; border-radius: 4px; flex-shrink: 0; }
    .card-title {
      font-size: clamp(0.75rem, 2.8vw, 1rem);
      font-weight: 600;
      line-height: 1.3;
      color: var(--card-fg);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 0;
      flex-shrink: 0;
			padding-inline: 0.25rem;
			margin-inline: -0.25rem;
    }
    .card-desc {
      font-size: clamp(0.7rem, 2.2vw, 0.85rem);
      line-height: 1.45;
      color: var(--card-fg-muted);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 0;
    }
    .card-url {
      font-size: clamp(0.6rem, 1.8vw, 0.75rem);
      color: var(--card-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: auto;
    }
    .card-link {
      display: flex;
      flex-direction: column;
      flex: 1;
			gap: 0.25rem;
      min-height: 0;
      min-width: 0;
      text-decoration: none;
      color: inherit;
      position: relative;
      overflow: hidden;
    }
    /* Subtle gradient overlay so image/gradient blends into card background */
    .card-link::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        var(--card-bg-blend) 0%,
        transparent 45%
      );
      pointer-events: none;
      z-index: 0.5;
    }
    .card-body {
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.25);
    }
    .card-body .card-site { color: rgba(255, 255, 255, 0.85); }
    .card-body .card-title { color: #fff; }
    .card-body .card-desc { color: rgba(255, 255, 255, 0.78); }
    .card-body .card-url { color: rgba(255, 255, 255, 0.65); }
    /* Default: dark theme (gray, similar to base) */
    .card {
      --card-bg: linear-gradient(145deg, #2c2c2c 0%, #242424 100%);
      --card-bg-blend: rgba(28, 32, 44, 0.4);
      --card-fg: #e8e8e8;
      --card-fg-muted: #98989d;
      --card-accent: #b0b0b0;
      --card-muted: #636366;
      --card-image-bg: #383838;
    }
    @media (prefers-color-scheme: light) {
      .card {
        --card-bg: linear-gradient(145deg, #f5f5f5 0%, #ebebeb 100%);
        --card-bg-blend: rgba(245, 245, 245, 0.65);
        --card-fg: #1c1c1e;
        --card-fg-muted: #48484a;
        --card-accent: #636366;
        --card-muted: #8e8e93;
        --card-image-bg: #e8e8e8;
      }
    }
  </style>
</head>
<body>
  <article class="card">
    <a class="card-link" href="${escapeHtml(href ?? url)}" target="_blank" rel="noopener noreferrer">
${gradientCss
  ? `      <div class="card-image card-image--gradient" style="background: ${escapeHtml(gradientCss)}"></div>`
  : `      <img class="card-image" src="${imageDataUrl}" alt="">`}
      <div class="card-body">
        <div class="card-site">
${faviconDataUrl ? `          <img src="${faviconDataUrl}" alt="">` : ""}
          <span>${displaySite}</span>
        </div>
        <h2 class="card-title">${displayTitle}</h2>
      </div>
    </a>
  </article>
  <script>${EMBED_RESIZE_SCRIPT}</script>
</body>
</html>`
}

function getSiteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "Link"
  }
}

/** Normalize host (no www). */
function host(url: URL): string {
  return url.hostname.replace(/^www\./, "")
}

/**
 * If the URL is a known social/video platform with an embed page, return the embed URL; else null.
 * Covers: YouTube, Vimeo, Twitch, TikTok, Dailymotion, Twitter/X, Instagram, Spotify, SoundCloud,
 * Reddit, CodePen, Figma, Loom, Pinterest, LinkedIn, Giphy, Steam.
 * Telegram is handled separately: we serve an HTML page that loads the official post widget (t.me cannot be iframed).
 */
function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const h = host(u)

    // YouTube
    if (h === "youtube.com" || h === "youtu.be") {
      let videoId: string | null = null
      if (h === "youtu.be") {
        videoId = u.pathname.slice(1).split("/")[0] || null
      } else {
        videoId = u.searchParams.get("v") ?? null
        if (!videoId && /^\/shorts\//.test(u.pathname)) {
          videoId = u.pathname.replace(/^\/shorts\//, "").split("/")[0] || null
        }
      }
      if (videoId && /^[\w-]{11}$/.test(videoId)) return `https://www.youtube.com/embed/${videoId}`
      return null
    }

    // Vimeo: vimeo.com/123456789, vimeo.com/channels/name/123
    if (h === "vimeo.com") {
      const m = u.pathname.match(/\/(\d+)(?:\/|$)/)
      if (m) return `https://player.vimeo.com/video/${m[1]}`
      return null
    }

    // Twitch: channel, video, clip
    if (h === "twitch.tv" || h === "www.twitch.tv") {
      const path = u.pathname.replace(/^\/+/, "").split("/")
      if (path[0] === "videos" && path[1]) return `https://player.twitch.tv/?video=${path[1]}`
      if (path[0] === "clip" && path[1]) return `https://clips.twitch.tv/embed?clip=${path[1]}`
      if (path[0] && !path[0].startsWith("videos") && !path[0].startsWith("clip")) {
        return `https://player.twitch.tv/?channel=${path[0]}`
      }
      return null
    }
    if (h === "clips.twitch.tv") {
      const slug = u.pathname.slice(1).split("/")[0]
      if (slug) return `https://clips.twitch.tv/embed?clip=${slug}`
      return null
    }

    // TikTok: tiktok.com/@user/video/1234567890123456789
    if (h === "tiktok.com" || h === "www.tiktok.com") {
      const m = u.pathname.match(/\/video\/(\d+)/)
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`
      return null
    }

    // Dailymotion: dailymotion.com/video/x5abcde
    if (h === "dailymotion.com" || h === "www.dailymotion.com") {
      const m = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/)
      if (m) return `https://www.dailymotion.com/embed/video/${m[1]}`
      return null
    }

    // Twitter/X: handled via HTML page with blockquote + widgets.js (redirect to embed URL gives "Access denied" in iframes)
    if (h === "twitter.com" || h === "x.com") return null

    // Facebook: handled via HTML page with fb-post + SDK (same pattern as X/Telegram)
    if (h === "facebook.com" || h === "fb.com" || h === "m.facebook.com") return null

    // Instagram: handled via HTML page with iframe + resize script (same pattern as tg/fb/x)
    if (h === "instagram.com" || h === "www.instagram.com") return null

    // Spotify: open.spotify.com/track|album|playlist|artist|show|episode/xxx
    if (h === "open.spotify.com") {
      const m = u.pathname.match(/^\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/)
      if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`
      return null
    }

    // SoundCloud: already an embed URL (e.g. iframe src)
    if (h === "w.soundcloud.com") {
      if (/^\/player\/?$/.test(u.pathname)) {
        const embedTarget = u.searchParams.get("url")
        if (embedTarget) return u.href
      }
      return null
    }

    // SoundCloud: api.soundcloud.com/tracks/xxx
    if (h === "api.soundcloud.com") {
      const m = u.pathname.match(/^\/tracks\/(.+)/)
      if (m && m[1]) {
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}`
      }
      return null
    }

    // SoundCloud: player for track pages (user/track-slug); regular embed/card for discover, profiles, etc.
    if (h === "soundcloud.com") {
      const path = u.pathname.replace(/^\/+|\/+$/, "")
      const segments = path.split("/").filter(Boolean)
      const isDiscover = segments[0] === "discover"
      if (!isDiscover && segments.length >= 2) {
        return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + "/" + path)}`
      }
      return null
    }

    // Reddit: reddit.com/r/sub/comments/id/title/
    if (h === "reddit.com" || h === "www.reddit.com" || h === "old.reddit.com") {
      if (/^\/r\/[\w+]+\/comments\/[\w]+\//.test(u.pathname)) {
        const path = u.pathname.replace(/\/?$/, "")
        return `https://www.reddit.com${path}/embed`
      }
      return null
    }

    // CodePen: codepen.io/user/pen/xxx or /user/details/xxx
    if (h === "codepen.io") {
      const m = u.pathname.match(/\/(?:pen|details)\/([^/]+)/)
      if (m) return `https://codepen.io${u.pathname.replace(/\/?$/, "")}/embed`
      return null
    }

    // Figma: figma.com/file/xxx or design/xxx
    if (h === "figma.com" || h === "www.figma.com") {
      if (/^\/(file|design|proto)\/[^/]+/.test(u.pathname)) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
      }
      return null
    }

    // Loom: loom.com/share/xxx
    if (h === "loom.com" || h === "www.loom.com") {
      const m = u.pathname.match(/\/share\/([a-zA-Z0-9]+)/)
      if (m) return `https://www.loom.com/embed/${m[1]}`
      return null
    }

    // Pinterest: pinterest.com/pin/1234567890123456789
    if (h === "pinterest.com" || h === "pinterest.co.uk" || h === "pinterest.ca" || h === "pin.it") {
      let pinId: string | null = null
      if (h === "pin.it") {
        // pin.it short links redirect; we can't resolve here, skip
        return null
      }
      const pinMatch = u.pathname.match(/\/pin\/(\d+)/)
      if (pinMatch) pinId = pinMatch[1]
      if (pinId) return `https://assets.pinterest.com/ext/embed.html?id=${pinId}`
      return null
    }

    // LinkedIn: linkedin.com/posts/...activity-ACTIVITY_ID-... or feed/update/urn:li:activity:ACTIVITY_ID
    if (h === "linkedin.com" || h === "www.linkedin.com") {
      let activityId: string | null = null
      const urnMatch = u.pathname.match(/urn:li:activity:(\d+)/)
      if (urnMatch) activityId = urnMatch[1]
      if (!activityId) {
        const activityMatch = u.pathname.match(/activity-(\d+)/)
        if (activityMatch) activityId = activityMatch[1]
      }
      if (activityId) return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`
      return null
    }

    // Giphy: giphy.com/gifs/.../ID or giphy.com/gifs/ID or media.giphy.com/media/ID/...
    if (h === "giphy.com" || h === "www.giphy.com" || h === "media.giphy.com" || h === "i.giphy.com") {
      let gifId: string | null = null
      if (h === "media.giphy.com") {
        const m = u.pathname.match(/\/media\/([^/]+)/)
        if (m) gifId = m[1]
      } else if (h === "i.giphy.com") {
        const m = u.pathname.match(/\/([^/]+)\.gif$/)
        if (m) gifId = m[1]
      } else {
        const segments = u.pathname.replace(/^\/+|\/+$/, "").split("/")
        if (segments[0] === "gifs" || segments[0] === "stickers") {
          gifId = segments[segments.length - 1] || null
        }
      }
      if (gifId && /^[\w-]+$/.test(gifId)) return `https://giphy.com/embed/${gifId}`
      return null
    }

    // Steam: handled via HTML wrapper page with iframe + resize script (same pattern as tg/fb/x)
    if (h === "store.steampowered.com" || h === "steamcommunity.com") return null

    return null
  } catch {
    return null
  }
}

/** Facebook post URL for the Embedded Post plugin, or null. */
function getFacebookPostRef(url: string): string | null {
  try {
    const u = new URL(url)
    const h = host(u)
    if (h !== "facebook.com" && h !== "fb.com" && h !== "m.facebook.com") return null
    const path = u.pathname.replace(/^\/+|\/+$/, "")
    if (!path) return null
    return u.href
  } catch {
    return null
  }
}

/** Twitter/X status: { id, href } or null. */
function getTwitterStatusRef(url: string): { id: string; href: string } | null {
  try {
    const u = new URL(url)
    const h = host(u)
    if (h !== "twitter.com" && h !== "x.com") return null
    const m = u.pathname.match(/\/status\/(\d+)/)
    if (!m) return null
    return { id: m[1], href: u.href }
  } catch {
    return null
  }
}

/** Build HTML page that embeds a Twitter/X tweet (programmatic API + fallback link so it's never blank). */
function buildTwitterEmbedHtml(tweetId: string, tweetHref: string): string {
  const safeHref = escapeHtml(tweetHref)
  const safeId = escapeHtml(tweetId)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>X post</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; background: #f7f9f9; padding: 1rem; font-family: system-ui, sans-serif; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    @media (prefers-color-scheme: dark) { html, body { background: #16181c; } }
    .tweet-container { margin: 0 auto; max-width: 550px; min-height: 100px; display: flex; justify-content: center; }
    .tweet-container blockquote { margin: 0 auto; }
    .fallback { margin-top: 0.75rem; margin-bottom: 0.75rem; text-align: center; }
    .fallback a { color: #1d9bf0; text-decoration: none; font-size: 0.9rem; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="tweet-container" id="tweet-container"></div>
  <p class="fallback">\u2197 <a href="${safeHref}" target="_blank" rel="noopener noreferrer">View post on X</a></p>
  <script>
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
  </script>
  <script>${EMBED_RESIZE_SCRIPT}</script>
</body>
</html>`
}

/** Build HTML page that embeds a Facebook post via the official Embedded Post plugin (same pattern as X/Telegram). */
function buildFacebookEmbedHtml(postUrl: string): string {
  const safeHref = escapeHtml(postUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Facebook post</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; background: #f0f2f5; padding: 1rem; font-family: system-ui, sans-serif; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    @media (prefers-color-scheme: dark) { html, body { background: #18191a; } }
    .fb-embed-wrap { margin: 0 auto; max-width: 550px; min-height: 100px; display: flex; justify-content: center; }
    .fb-embed-wrap .fb-post { margin: 0 auto; }
    .fallback { margin-top: 0.75rem; margin-bottom: 0.75rem; text-align: center; }
    .fallback a { color: #0866ff; text-decoration: none; font-size: 0.9rem; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div id="fb-root"></div>
  <div class="fb-embed-wrap">
    <div class="fb-post" data-href="${safeHref}" data-width="500"></div>
  </div>
  <p class="fallback">\u2197 <a href="${safeHref}" target="_blank" rel="noopener noreferrer">View post on Facebook</a></p>
  <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v3.2"></script>
  <script>${EMBED_RESIZE_SCRIPT}</script>
</body>
</html>`
}

/** Telegram post ref for the official widget (channel/postid). Returns null if not a Telegram post URL. */
function getTelegramPostRef(url: string): string | null {
  try {
    const u = new URL(url)
    const h = host(u)
    if (h !== "t.me" && h !== "telegram.me" && h !== "telegram.dog") return null
    const path = u.pathname.replace(/^\/+|\/+$/, "")
    const parts = path.split("/").filter(Boolean)
    if (parts.length >= 2) return parts.join("/") // e.g. "durov/43" or "c/1234567890/99"
    return null
  } catch {
    return null
  }
}

/** Instagram post/reel embed URL for wrapper page, or null. */
function getInstagramEmbedRef(url: string): string | null {
  try {
    const u = new URL(url)
    const h = host(u)
    if (h !== "instagram.com" && h !== "www.instagram.com") return null
    const m = u.pathname.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)
    if (!m) return null
    const path = u.pathname.replace(/\/+$/, "").split("/").slice(0, 4).join("/")
    return `https://www.instagram.com${path}/embed/`
  } catch {
    return null
  }
}

/** Build HTML page that embeds an Instagram post/reel in an iframe with height resize message (same pattern as tg/fb/x). */
function buildInstagramEmbedHtml(embedUrl: string, postUrl: string): string {
  const safeEmbedUrl = escapeHtml(embedUrl)
  const safePostUrl = escapeHtml(postUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Instagram post</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; background: #f7f9f9; padding: 1rem; font-family: system-ui, sans-serif; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    @media (prefers-color-scheme: dark) { html, body { background: #16181c; } .ig-embed-wrap iframe { outline-color: rgba(255, 255, 255, 0.08); } }
    .ig-embed-wrap { margin: 0 auto; max-width: 550px; min-height: 100px; display: flex; justify-content: center; overflow: hidden; }
    .ig-embed-wrap iframe { width: 100%; min-width: 326px; height: 800px; border: 0; display: block; margin: 0 auto; overflow: hidden; outline: 1px solid rgba(0, 0, 0, 0.08); outline-offset: -1px; }
    .fallback { margin-top: 0.75rem; margin-bottom: 0.75rem; text-align: center; }
    .fallback a { color: #0095f6; text-decoration: none; font-size: 0.9rem; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="ig-embed-wrap">
    <iframe src="${safeEmbedUrl}" title="Instagram post" scrolling="no"></iframe>
  </div>
  <p class="fallback">\u2197 <a href="${safePostUrl}" target="_blank" rel="noopener noreferrer">View on Instagram</a></p>
  <script>${EMBED_RESIZE_SCRIPT}</script>
</body>
</html>`
}

/** Steam store app ref: widget URL for store.steampowered.com/app/ID or steamcommunity.com/app/ID, or null. */
function getSteamWidgetRef(url: string): { widgetUrl: string; pageUrl: string } | null {
  try {
    const u = new URL(url)
    const h = host(u)
    if (h !== "store.steampowered.com" && h !== "steamcommunity.com") return null
    const appMatch = u.pathname.match(/\/app\/(\d+)/)
    if (!appMatch) return null
    const appId = appMatch[1]
    return {
      widgetUrl: `https://store.steampowered.com/widget/${appId}/`,
      pageUrl: u.href,
    }
  } catch {
    return null
  }
}

/** Build HTML page that embeds a Steam game widget in an iframe with height resize to parent (same pattern as tg/fb/x/instagram). */
function buildSteamEmbedHtml(widgetUrl: string, pageUrl: string): string {
  const safeWidgetUrl = escapeHtml(widgetUrl)
  const safePageUrl = escapeHtml(pageUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Steam store</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; background: transparent; display: flex; flex-direction: column; justify-content: center; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    .steam-embed-wrap { padding: 1rem; width: 100%; display: flex; flex-direction: column; align-items: center; }
    .steam-embed-wrap iframe { width: 100%; border: 0; display: block; height: 200px; }
    .fallback { margin-top: 0.75rem; margin-bottom: 0.75rem; text-align: center; }
    .fallback a { color: #1d9bf0; text-decoration: none; font-size: 0.9rem; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="steam-embed-wrap">
    <iframe src="${safeWidgetUrl}" title="Steam store widget"></iframe>
  </div>
  <p class="fallback">\u2197 <a href="${safePageUrl}" target="_blank" rel="noopener noreferrer">View on Steam</a></p>
  <script>
  (function() {
    var MAX_HEIGHT = 280;
    var lastHeight = 0;
    function sendHeight() {
      var h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.offsetHeight || 0
      );
      h = Math.min(h, MAX_HEIGHT);
      if (h !== lastHeight) {
        lastHeight = h;
        try { window.parent.postMessage({ type: "commently-discover-resize", height: h }, "*"); } catch (e) {}
      }
    }
    function scheduleSend() {
      requestAnimationFrame(function() { sendHeight(); });
    }
    sendHeight();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(scheduleSend);
      ro.observe(document.body);
      if (document.documentElement !== document.body) ro.observe(document.documentElement);
    }
    var mo = new MutationObserver(scheduleSend);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", scheduleSend);
  })();
  </script>
</body>
</html>`
}

/** Build HTML page that embeds a Telegram post via the official widget script. */
function buildTelegramEmbedHtml(postRef: string): string {
  const safeRef = escapeHtml(postRef)
  const postUrl = `https://t.me/${postRef}`
  const safePostUrl = escapeHtml(postUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Telegram post</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; background: transparent; scrollbar-width: none; -ms-overflow-style: none; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    .telegram-embed-wrap { padding: 1rem; width: 100%; max-width: 550px; margin: 0 auto; display: flex; justify-content: center; }
    .telegram-embed-wrap iframe { max-width: 100%; display: block; margin: 0 auto; }
    .fallback { margin-top: 0.75rem; margin-bottom: 0.75rem; text-align: center; }
    .fallback a { color: #1d9bf0; text-decoration: none; font-size: 0.9rem; }
    .fallback a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="telegram-embed-wrap">
    <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-post="${safeRef}" data-width="100%"></script>
  </div>
  <p class="fallback">\u2197 <a href="${safePostUrl}" target="_blank" rel="noopener noreferrer">View on Telegram</a></p>
  <script>${EMBED_RESIZE_SCRIPT}</script>
</body>
</html>`
}

/** Shim site data when fetch fails: title and site from URL only. */
function shimSiteData(url: string): { title?: string; description?: string; image?: string; favicon?: string } {
  const siteName = getSiteName(url)
  return { title: siteName, description: undefined, image: undefined, favicon: undefined }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get("url")

    if (!target || !target.match(/^https?:\/\//)) {
      const html = buildCardHtml({
        title: "Invalid URL",
        description: "Provide a full URL via ?url=https://example.com",
        imageDataUrl: null,
        faviconDataUrl: null,
        url: "Missing or invalid ?url parameter",
        href: "about:blank",
        siteName: "Commently",
      })
      return new Response(html, {
        status: 400,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      })
    }

    const twitterStatus = getTwitterStatusRef(target)
    if (twitterStatus) {
      const html = buildTwitterEmbedHtml(twitterStatus.id, twitterStatus.href)
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...CACHE_HEADERS,
        },
      })
    }

    const facebookPostUrl = getFacebookPostRef(target)
    if (facebookPostUrl) {
      const html = buildFacebookEmbedHtml(facebookPostUrl)
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...CACHE_HEADERS,
        },
      })
    }

    const instagramEmbedUrl = getInstagramEmbedRef(target)
    if (instagramEmbedUrl) {
      const html = buildInstagramEmbedHtml(instagramEmbedUrl, target)
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...CACHE_HEADERS,
        },
      })
    }

    const steamRef = getSteamWidgetRef(target)
    if (steamRef) {
      const html = buildSteamEmbedHtml(steamRef.widgetUrl, steamRef.pageUrl)
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...CACHE_HEADERS,
        },
      })
    }

    const embedUrl = getEmbedUrl(target)
    if (embedUrl) {
      return Response.redirect(embedUrl, 302)
    }

    const telegramPostRef = getTelegramPostRef(target)
    if (telegramPostRef) {
      const html = buildTelegramEmbedHtml(telegramPostRef)
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...CACHE_HEADERS,
        },
      })
    }

    let result = await unfurl(target)
    if (!result.ok && result.error === "failed-fetch") {
      const fallback = await unfurlFallback(target)
      if (fallback) result = { ok: true, value: fallback }
    }

    if (!result.ok && result.error === "bad-param") {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    }

    const data = result.ok ? result.value : shimSiteData(target)
    const siteName = getSiteName(target)

    const [imageDataUrl, faviconDataUrl] = await Promise.all([
      data.image ? fetchAsBase64(data.image, MAX_IMAGE_BYTES) : null,
      data.favicon ? fetchAsBase64(data.favicon, MAX_FAVICON_BYTES) : null,
    ])

    const html = buildCardHtml({
      title: data.title,
      description: data.description,
      imageDataUrl: imageDataUrl?.dataUrl ?? null,
      faviconDataUrl: faviconDataUrl?.dataUrl ?? null,
      url: target,
      siteName,
    })

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        ...CACHE_HEADERS,
      },
    })
  },
}
