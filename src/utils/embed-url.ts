import { host } from "./url"

/**
 * If the URL is a known social/video platform with an embed page, return the embed URL; else null.
 * Covers: YouTube, Vimeo, Twitch, TikTok, Dailymotion, Twitter/X, Instagram, Spotify, SoundCloud,
 * Reddit, CodePen, Figma, Loom, Pinterest, LinkedIn, Giphy, Steam.
 * Telegram is handled separately: we serve an HTML page that loads the official post widget (t.me cannot be iframed).
 */
export function getEmbedUrl(url: string): string | null {
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

    // Reddit: handled via HTML page with iframe (same pattern as Instagram/Steam)
    if (
      h === "reddit.com" ||
      h === "www.reddit.com" ||
      h === "old.reddit.com" ||
      h === "new.reddit.com"
    )
      return null

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

    // Threads: handled via HTML page with blockquote + embed.js (same pattern as X/Telegram)
    if (h === "threads.net" || h === "www.threads.net" || h === "threads.com" || h === "www.threads.com") return null

    return null
  } catch {
    return null
  }
}
