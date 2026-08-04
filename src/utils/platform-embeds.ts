import { DIRECT_EMBED_SPECS, type EmbedSpec } from "./embed-url";
import { buildEmbedPageHtml } from "./embed-page";
import { escapeHtml } from "./html";
import { getViewInPlatformLabel } from "./i18n";
import { host, toUrlSafeBase64 } from "./url";

/** Options shared by all self-served script-widget pages. */
type WidgetPageOptions = {
	title: string;
	/** Platform name used in the "View in {platform}" fallback label. */
	platform: string;
	/** Fallback link URL (the canonical post URL). */
	ref: string;
	bodyContent: string;
	wrapperStyle: string;
	acceptLanguage: string | null;
	bodyStyle?: string;
	/** Show a pulsing skeleton until the widget injects content. Default true. */
	scriptEmbedSkeleton?: boolean;
};

/** Build a script-widget page: shared wrapper, skeleton, localized fallback link. */
function buildWidgetPage(opts: WidgetPageOptions): string {
	return buildEmbedPageHtml({
		title: opts.title,
		bodyContent: opts.bodyContent,
		scriptEmbedSkeleton: opts.scriptEmbedSkeleton ?? true,
		fallbackLabel: getViewInPlatformLabel(opts.acceptLanguage, opts.platform),
		fallbackHref: opts.ref,
		bodyStyle: opts.bodyStyle,
		wrapperStyle: opts.wrapperStyle,
	});
}

/** Twitter/X status: { id, href } or null. */
export function getTwitterStatusRef(
	url: string,
): { id: string; href: string } | null {
	try {
		const u = new URL(url);
		const h = host(u);
		if (h !== "twitter.com" && h !== "x.com") return null;
		const m = u.pathname.match(/\/status\/(\d+)/);
		if (!m) return null;
		return { id: m[1], href: u.href };
	} catch {
		return null;
	}
}

/** Build HTML page that embeds a Twitter/X tweet via the official widgets.js widget. */
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
          if (window.__embedSkeletonHide) window.__embedSkeletonHide();
        }).catch(function() {
          if (window.__embedSkeletonHide) window.__embedSkeletonHide();
        });
      }
    });
  `;
	return buildWidgetPage({
		title: "X post",
		platform: "X",
		ref: tweetHref,
		bodyContent: `  <div id="tweet-container" class="tweet tweet-container"></div>\n  <script>${tweetScript}</script>`,
		wrapperStyle: `
		.embed-wrap blockquote { margin: 0 auto; }
    .embed-wrap .twitter-tweet { margin: 0 auto !important; width: 100% !important; max-width: 100% !important; }
    .embed-wrap .twitter-tweet iframe { width: 100% !important; }`,
		acceptLanguage,
	});
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
		if (!path) return null;
		return u.href;
	} catch {
		return null;
	}
}

/** Build HTML page that embeds a Facebook post via the official Embedded Post plugin. */
export function buildFacebookEmbedHtml(
	postUrl: string,
	acceptLanguage: string | null,
): string {
	const safeHref = escapeHtml(postUrl);
	return buildWidgetPage({
		title: "Facebook post",
		platform: "Facebook",
		ref: postUrl,
		bodyContent: `  <div id="fb-root"></div>
  <div class="fb-post" data-href="${safeHref}" data-width="500"></div>
  <script async defer src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v3.2"></script>`,
		wrapperStyle: `.embed-wrap .fb-post { margin: 0 auto; background-color: #fff; }
    .embed-wrap { max-width: 500px; }`,
		acceptLanguage,
	});
}

/** Telegram post ref for the official widget (channel/postid), or null. */
export function getTelegramPostRef(url: string): string | null {
	try {
		const u = new URL(url);
		const h = host(u);
		if (h !== "t.me" && h !== "telegram.me" && h !== "telegram.dog") {
			return null;
		}
		const parts = u.pathname.replace(/^\/+|\/+$/, "").split("/").filter(Boolean);
		if (parts.length >= 2) return parts.join("/"); // e.g. "durov/43" or "c/1234567890/99"
		return null;
	} catch {
		return null;
	}
}

/** Build HTML page that embeds a Telegram post via the official widget script. */
export function buildTelegramEmbedHtml(
	postRef: string,
	acceptLanguage: string | null,
): string {
	const safeRef = escapeHtml(postRef);
	const postUrl = `https://t.me/${postRef}`;
	return buildWidgetPage({
		title: "Telegram post",
		platform: "Telegram",
		ref: postUrl,
		bodyContent: `    <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-post="${safeRef}" data-width="100%"></script>`,
		wrapperStyle: `.embed-wrap { max-width: 550px; }
    .embed-wrap iframe { max-width: 100%; }`,
		acceptLanguage,
	});
}

/** Threads post URL for the official embed (blockquote + embed.js), or null. */
export function getThreadsPostRef(url: string): string | null {
	try {
		const u = new URL(url);
		const h = host(u);
		const isThreads =
			h === "threads.net" || h === "threads.com";
		if (!isThreads) return null;
		const path = u.pathname.replace(/^\/+|\/+$/, "");
		const parts = path.split("/").filter(Boolean);
		const canonical = "https://www.threads.net";
		if (
			parts.length >= 3 &&
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

/** Build HTML page that embeds a Threads post via the official blockquote + embed.js. */
export function buildThreadsEmbedHtml(
	postUrl: string,
	acceptLanguage: string | null,
): string {
	const safePostUrl = escapeHtml(postUrl);
	return buildWidgetPage({
		title: "Threads post",
		platform: "Threads",
		ref: postUrl,
		bodyContent: `  <blockquote class="text-post-media" data-text-post-permalink="${safePostUrl}"></blockquote>
  <script async src="https://www.threads.net/embed.js" charset="utf-8"></script>`,
		wrapperStyle: `.embed-wrap { max-width: 658px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
		acceptLanguage,
	});
}

/** Bluesky post parts (actor, rkey, canonical post URL) or null. */
export function getBlueskyPostParts(url: string): {
	actor: string;
	rkey: string;
	postUrl: string;
} | null {
	try {
		const u = new URL(url);
		const h = host(u);
		if (h !== "bsky.app" && h !== "www.bsky.app") return null;
		const m = u.pathname.match(/^\/profile\/([^/]+)\/post\/([^/?#]+)\/?$/);
		if (!m) return null;
		return {
			actor: m[1],
			rkey: m[2],
			postUrl: `https://bsky.app/profile/${m[1]}/post/${m[2]}`,
		};
	} catch {
		return null;
	}
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
		if (!res.ok) return null;
		const data = (await res.json()) as { html?: unknown };
		if (typeof data.html !== "string" || !data.html.includes("bluesky-embed")) {
			return null;
		}
		return data.html;
	} catch {
		return null;
	}
}

/** Build HTML page that embeds a Bluesky post via the oEmbed snippet + embed.bsky.app/static/embed.js. */
export function buildBlueskyEmbedHtml(
	oembedHtmlFragment: string,
	postUrl: string,
	acceptLanguage: string | null,
): string {
	const inner = oembedHtmlFragment.trim();
	return buildWidgetPage({
		title: "Bluesky post",
		platform: "Bluesky",
		ref: postUrl,
		bodyContent: `  ${inner}`,
		wrapperStyle: `.embed-wrap { max-width: 600px; }
    .embed-wrap blockquote { margin: 0 auto; }
    .embed-wrap .bluesky-embed { margin-top: 0 !important; margin-bottom: 0 !important; }`,
		acceptLanguage,
	});
}

/** Build HTML page that embeds a Bluesky post via the official embed.bsky.app iframe (oEmbed-free fallback). */
export function buildBlueskyIframeHtml(
	actor: string,
	rkey: string,
	postUrl: string,
	acceptLanguage: string | null,
): string {
	const iframeSrc = `https://embed.bsky.app/iframe/${encodeURIComponent(actor)}/${encodeURIComponent(rkey)}`;
	const safeSrc = escapeHtml(iframeSrc);
	return buildWidgetPage({
		title: "Bluesky post",
		platform: "Bluesky",
		ref: postUrl,
		bodyContent: `    <iframe src="${safeSrc}" title="Bluesky post" loading="lazy"></iframe>`,
		bodyStyle: "background: #fff;",
		wrapperStyle: `.embed-wrap { width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; }
    .embed-wrap iframe { width: 100%; height: 600px; }`,
		scriptEmbedSkeleton: false,
		acceptLanguage,
	});
}

/** Reddit post ref: canonical post URL, subreddit, and optional title slug. */
export function getRedditPostRef(url: string): {
	postUrl: string;
	subreddit: string;
	titleSlug: string | null;
} | null {
	try {
		const u = new URL(url);
		const h = host(u);
		if (h !== "reddit.com" && h !== "old.reddit.com" && h !== "new.reddit.com") {
			return null;
		}
		const path = u.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
		const m = path.match(/^r\/([^/]+)\/comments\/([^/]+)(?:\/(.*))?$/);
		if (!m) return null;
		const subreddit = m[1];
		const titleSlug = m[3] && m[3].length > 0 ? m[3] : null;
		const postUrl = `https://www.reddit.com/${path}/`.replace(/\/+$/, "/");
		return { postUrl, subreddit, titleSlug };
	} catch {
		return null;
	}
}

/** Lowercase percent-encoding in a URL so it matches Reddit's embed format (e.g. %d1%87 not %D1%87). */
function redditEmbedHref(url: string): string {
	return url.replace(/%[0-9A-Fa-f]{2}/g, (m) => m.toLowerCase());
}

/** Build HTML page that embeds a Reddit post via the official embed.reddit.com/widgets.js widget. */
export function buildRedditEmbedHtml(
	postUrl: string,
	titleSlug: string | null,
	acceptLanguage: string | null,
): string {
	const safePostUrl = escapeHtml(redditEmbedHref(postUrl));
	const titleText =
		titleSlug != null ? titleSlug.replace(/_/g, " ") : "Reddit post";
	const safeTitleText = escapeHtml(titleText);
	return buildWidgetPage({
		title: "Reddit post",
		platform: "Reddit",
		ref: postUrl,
		bodyContent: `  <blockquote class="reddit-embed-bq" style="height:500px" data-embed-height="372">
  <a href="${safePostUrl}">${safeTitleText}</a>
</blockquote>
  <script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`,
		wrapperStyle: `.embed-wrap { max-width: 640px; }
    .embed-wrap blockquote { margin: 0 auto; }`,
		acceptLanguage,
	});
}

/**
 * Platforms without a direct iframe URL (X, Facebook, Telegram, Threads, Bluesky,
 * Reddit) — the client iframes our self-served page, which loads the platform's
 * official widget script (frame-in-frame).
 */
export const WIDGET_EMBED_SPECS: EmbedSpec[] = [
	{
		name: "reddit",
		detect: (url) => {
			const r = getRedditPostRef(url);
			return r ? { url: r.postUrl } : null;
		},
		buildPage: (url, acceptLanguage) => {
			const r = getRedditPostRef(url);
			return r ? buildRedditEmbedHtml(r.postUrl, r.titleSlug, acceptLanguage) : null;
		},
	},
	{
		name: "twitter",
		detect: (url) => {
			const r = getTwitterStatusRef(url);
			return r ? { url: r.href } : null;
		},
		buildPage: (url, acceptLanguage) => {
			const r = getTwitterStatusRef(url);
			return r ? buildTwitterEmbedHtml(r.id, r.href, acceptLanguage) : null;
		},
	},
	{
		name: "facebook",
		detect: (url) => {
			const r = getFacebookPostRef(url);
			return r ? { url: r } : null;
		},
		buildPage: (url, acceptLanguage) => {
			const r = getFacebookPostRef(url);
			return r ? buildFacebookEmbedHtml(r, acceptLanguage) : null;
		},
	},
	{
		name: "telegram",
		detect: (url) => {
			const r = getTelegramPostRef(url);
			return r ? { url: `https://t.me/${r}` } : null;
		},
		buildPage: (url, acceptLanguage) => {
			const r = getTelegramPostRef(url);
			return r ? buildTelegramEmbedHtml(r, acceptLanguage) : null;
		},
	},
	{
		name: "threads",
		detect: (url) => {
			const r = getThreadsPostRef(url);
			return r ? { url: r } : null;
		},
		buildPage: (url, acceptLanguage) => {
			const r = getThreadsPostRef(url);
			return r ? buildThreadsEmbedHtml(r, acceptLanguage) : null;
		},
	},
	{
		name: "bluesky",
		detect: (url) => {
			const r = getBlueskyPostParts(url);
			return r ? { url: r.postUrl } : null;
		},
		buildPage: async (url, acceptLanguage) => {
			const r = getBlueskyPostParts(url);
			if (!r) return null;
			const fragment = await fetchBlueskyOembedFragment(r.postUrl);
			if (fragment) {
				return buildBlueskyEmbedHtml(fragment, r.postUrl, acceptLanguage);
			}
			// oEmbed unavailable → fall back to the official embed.bsky.app iframe
			return buildBlueskyIframeHtml(r.actor, r.rkey, r.postUrl, acceptLanguage);
		},
	},
];

/** Single registry of all embeddable platforms: direct iframes first, then self-served widgets. */
export const EMBED_SPECS: EmbedSpec[] = [
	...DIRECT_EMBED_SPECS,
	...WIDGET_EMBED_SPECS,
];

/** Worker-served embed page URL for script-widget platforms. */
function embedPageIframeSrc(origin: string, url: string): string {
	return `${origin}/embed/${toUrlSafeBase64(url)}`;
}

/**
 * Resolve a URL to its iframe source. Direct iframe endpoints (YouTube, Steam, …)
 * are returned as-is; script-widget platforms are served by our own embed page —
 * pass `origin` (the worker's origin) to get `${origin}/embed/{base64url}`.
 * Returns null if the URL isn't embeddable (caller falls back to a link card).
 */
export function getEmbedUrl(url: string, origin?: string): string | null {
	for (const spec of EMBED_SPECS) {
		if (!spec.detect(url)) continue;
		if (spec.directSrc) {
			return spec.directSrc(url) ?? null;
		}
		if (spec.buildPage && origin) {
			return embedPageIframeSrc(origin, url);
		}
		return null;
	}
	return null;
}

/** Build the self-served script-widget embed page HTML for a known platform URL, or null. */
export async function buildEmbedHtmlForUrl(
	url: string,
	acceptLanguage: string | null,
): Promise<string | null> {
	for (const spec of EMBED_SPECS) {
		if (!spec.buildPage) continue;
		if (!spec.detect(url)) continue;
		return (await spec.buildPage(url, acceptLanguage)) ?? null;
	}
	return null;
}
