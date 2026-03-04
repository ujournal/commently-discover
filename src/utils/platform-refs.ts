import { unfurl } from "cloudflare-workers-unfurl";
import { MAX_FAVICON_BYTES, MAX_IMAGE_BYTES } from "./constants";
import { fetchAsBase64 } from "./image";
import { shimSiteData } from "./shim";
import { unfurlFallback } from "./unfurl";
import {
  fileTypeTitleFromPath,
  getDecodedFilenameFromUrl,
  getPathForFileDetection,
  getSiteName,
  host,
} from "./url";

/** Ref data for the basic (non-platform) link card: title, description, images, url, siteName. */
export type BasicRef = {
  title: string | undefined;
  description: string | undefined;
  imageDataUrl: string | null;
  faviconDataUrl: string | null;
  url: string;
  siteName: string;
};

/** Unfurl URL (with fallback/shim), fetch images as base64; returns ref for buildBasicEmbedHtml. */
export async function getBasicRef(
  url: string,
  options?: { acceptLanguage?: string | null },
): Promise<BasicRef> {
  let result = await unfurl(url);
  if (!result.ok && result.error === "failed-fetch") {
    const fallback = await unfurlFallback(url, {
      acceptLanguage: options?.acceptLanguage,
    });
    if (fallback) {
      result = { ok: true, value: fallback };
    }
  }
  let data = result.ok ? result.value : shimSiteData(url);
  // If unfurl returned but we still have no meaningful metadata (typical for direct PDFs, images, etc.),
  // fall back to shim so we can derive a sensible title from the filename (e.g. "PDF file").
  if (!data.title && !data.description && !data.image && !data.favicon) {
    data = shimSiteData(url);
  }
  // When we have no title but URL points to a file (e.g. #/media/File.jpg), use decoded filename
  if (!data.title) {
    try {
      const u = new URL(url);
      const pathForFile = getPathForFileDetection(u);
      if (fileTypeTitleFromPath(pathForFile)) {
        const decodedName = getDecodedFilenameFromUrl(u);
        if (decodedName) {
          data = { ...data, title: decodedName };
        }
      }
    } catch {
      /* ignore */
    }
  }
  const siteName = getSiteName(url);
  const [imageDataUrl, faviconDataUrl] = await Promise.all([
    data.image ? fetchAsBase64(data.image, MAX_IMAGE_BYTES) : null,
    data.favicon ? fetchAsBase64(data.favicon, MAX_FAVICON_BYTES) : null,
  ]);
  return {
    title: data.title,
    description: data.description,
    imageDataUrl: imageDataUrl?.dataUrl ?? null,
    faviconDataUrl: faviconDataUrl?.dataUrl ?? null,
    url,
    siteName,
  };
}

/** Facebook post URL for the Embedded Post plugin, or null. */
export function getFacebookPostRef(url: string): string | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "facebook.com" && h !== "fb.com" && h !== "m.facebook.com") {
      return null;
    }
    const path = u.pathname.replace(/^\/+|\/+$/, "");
    if (!path) {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}

/** Twitter/X status: { id, href } or null. */
export function getTwitterStatusRef(
  url: string,
): { id: string; href: string } | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "twitter.com" && h !== "x.com") {
      return null;
    }
    const m = u.pathname.match(/\/status\/(\d+)/);
    if (!m) {
      return null;
    }
    return { id: m[1], href: u.href };
  } catch {
    return null;
  }
}

/** Telegram post ref for the official widget (channel/postid). Returns null if not a Telegram post URL. */
export function getTelegramPostRef(url: string): string | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "t.me" && h !== "telegram.me" && h !== "telegram.dog") {
      return null;
    }
    const path = u.pathname.replace(/^\/+|\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return parts.join("/"); // e.g. "durov/43" or "c/1234567890/99"
    }
    return null;
  } catch {
    return null;
  }
}

/** Instagram post/reel embed URL for wrapper page, or null. */
export function getInstagramEmbedRef(url: string): string | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "instagram.com" && h !== "www.instagram.com") {
      return null;
    }
    const m = u.pathname.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    if (!m) {
      return null;
    }
    const path = u.pathname
      .replace(/\/+$/, "")
      .split("/")
      .slice(0, 4)
      .join("/");
    return `https://www.instagram.com${path}/embed/`;
  } catch {
    return null;
  }
}

/** Threads post URL for the official embed (blockquote + embed.js). Returns the post URL or null. */
export function getThreadsPostRef(url: string): string | null {
  try {
    const u = new URL(url);
    const h = host(u);
    const isThreads =
      h === "threads.net" ||
      h === "www.threads.net" ||
      h === "threads.com" ||
      h === "www.threads.com";
    if (!isThreads) {
      return null;
    }
    // Format: /@username/post/{media-shortcode}/ or /t/{conversation-id}
    const path = u.pathname.replace(/^\/+|\/+$/, "");
    const parts = path.split("/").filter(Boolean);
    const canonical = "https://www.threads.net";
    if (
      parts.length >= 2 &&
      parts[0].startsWith("@") &&
      parts[1] === "post" &&
      parts[2]
    ) {
      return `${canonical}/${parts[0]}/post/${parts[2]}/`;
    }
    if (parts[0] === "t" && parts[1]) {
      return `${canonical}/t/${parts[1]}/`;
    }
    return null;
  } catch {
    return null;
  }
}

/** TikTok video: video ID and canonical URL for embed page (same pattern as tg/x/reddit). */
export function getTikTokVideoRef(url: string): {
  videoId: string;
  videoUrl: string;
} | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "tiktok.com" && h !== "www.tiktok.com") {
      return null;
    }
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (!m) {
      return null;
    }
    const videoId = m[1];
    const canonical = `https://www.tiktok.com${u.pathname.replace(/\/+$/, "")}`;
    return { videoId, videoUrl: canonical };
  } catch {
    return null;
  }
}

/** Reddit post: embed URL, post URL, subreddit, and optional title slug for the official blockquote embed. */
export function getRedditPostRef(url: string): {
  embedUrl: string;
  postUrl: string;
  subreddit: string;
  titleSlug: string | null;
} | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (
      h !== "reddit.com" &&
      h !== "www.reddit.com" &&
      h !== "old.reddit.com" &&
      h !== "new.reddit.com"
    )
      return null;
    const path = u.pathname.replace(/^\/+|\/+$/, "");
    const m = path.match(/^r\/([^/]+)\/comments\/([^/]+)(?:\/(.*))?$/);
    if (!m) {
      return null;
    }
    const subreddit = m[1];
    const titleSlug = m[3] && m[3].length > 0 ? m[3] : null;
    const pathNorm = path.replace(/\/+$/, "");
    const pathWithSlash = pathNorm ? `/${pathNorm}/` : "/";
    const canonical = "https://www.reddit.com";
    const pathNoTrailing = pathWithSlash.replace(/\/$/, "");
    const singleTrailing = (url: string) => url.replace(/\/+$/, "/");
    return {
      embedUrl: singleTrailing(
        new URL(`${pathNoTrailing}/embed`, canonical).href,
      ),
      postUrl: singleTrailing(new URL(pathWithSlash, canonical).href),
      subreddit,
      titleSlug,
    };
  } catch {
    return null;
  }
}

/** Steam store app ref: widget URL for store.steampowered.com/app/ID or steamcommunity.com/app/ID, or null. */
export function getSteamWidgetRef(
  url: string,
): { widgetUrl: string; pageUrl: string } | null {
  try {
    const u = new URL(url);
    const h = host(u);
    if (h !== "store.steampowered.com" && h !== "steamcommunity.com") {
      return null;
    }
    const appMatch = u.pathname.match(/\/app\/(\d+)/);
    if (!appMatch) {
      return null;
    }
    const appId = appMatch[1];
    return {
      widgetUrl: `https://store.steampowered.com/widget/${appId}/`,
      pageUrl: u.href,
    };
  } catch {
    return null;
  }
}
