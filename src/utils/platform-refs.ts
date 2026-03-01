import { host } from "./url"

/** Facebook post URL for the Embedded Post plugin, or null. */
export function getFacebookPostRef(url: string): string | null {
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
export function getTwitterStatusRef(url: string): { id: string; href: string } | null {
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

/** Telegram post ref for the official widget (channel/postid). Returns null if not a Telegram post URL. */
export function getTelegramPostRef(url: string): string | null {
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
export function getInstagramEmbedRef(url: string): string | null {
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

/** Steam store app ref: widget URL for store.steampowered.com/app/ID or steamcommunity.com/app/ID, or null. */
export function getSteamWidgetRef(url: string): { widgetUrl: string; pageUrl: string } | null {
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
