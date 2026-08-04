import { host } from "./url";

/** Base ref every platform spec produces. Platform-specific fields are allowed. */
export type EmbedRef = { url: string };

/**
 * A platform's embed capability. `detect` decides whether a URL is an
 * embeddable post/content of this platform (single source of truth used by both
 * the discover iframe decision and the self-served embed page route).
 */
export type EmbedSpec = {
	name: string;
	/** Extract a ref if `url` is an embeddable post/content of this platform. */
	detect(url: string): EmbedRef | null;
	/** Direct third-party iframe URL (Steam widget, YouTube embed, …) or null. */
	directSrc?(url: string): string | null;
	/** Self-served script-widget page (frame-in-frame) for platforms without a direct iframe URL. */
	buildPage?(
		url: string,
		acceptLanguage: string | null,
	): string | null | Promise<string | null>;
};

/** Detect helper for host-based platforms (host() already strips "www."). */
function hosts(...names: string[]): (url: string) => EmbedRef | null {
	return (url: string) => {
		try {
			const u = new URL(url);
			return names.includes(host(u)) ? { url } : null;
		} catch {
			return null;
		}
	};
}

/**
 * Platforms with a direct iframe-able URL (YouTube, Steam, Mastodon, …).
 * The client can point `<iframe src>` straight at `directSrc`.
 */
export const DIRECT_EMBED_SPECS: EmbedSpec[] = [
	{
		name: "youtube",
		detect: hosts("youtube.com", "youtu.be"),
		directSrc: (url) => {
			const u = new URL(url);
			const h = host(u);
			let videoId: string | null = null;
			if (h === "youtu.be") {
				videoId = u.pathname.slice(1).split("/")[0] || null;
			} else {
				videoId = u.searchParams.get("v") ?? null;
				if (!videoId && /^\/shorts\//.test(u.pathname)) {
					videoId = u.pathname.replace(/^\/shorts\//, "").split("/")[0] || null;
				}
			}
			return videoId && /^[\w-]{11}$/.test(videoId)
				? `https://www.youtube.com/embed/${videoId}`
				: null;
		},
	},
	{
		name: "vimeo",
		detect: hosts("vimeo.com"),
		directSrc: (url) => {
			const m = new URL(url).pathname.match(/\/(\d+)(?:\/|$)/);
			return m ? `https://player.vimeo.com/video/${m[1]}` : null;
		},
	},
	{
		name: "twitch",
		detect: hosts("twitch.tv", "clips.twitch.tv"),
		directSrc: (url) => {
			const u = new URL(url);
			if (host(u) === "clips.twitch.tv") {
				const slug = u.pathname.slice(1).split("/")[0];
				return slug ? `https://clips.twitch.tv/embed?clip=${slug}` : null;
			}
			const path = u.pathname.replace(/^\/+/, "").split("/");
			if (path[0] === "videos" && path[1]) {
				return `https://player.twitch.tv/?video=${path[1]}`;
			}
			if (path[0] === "clip" && path[1]) {
				return `https://clips.twitch.tv/embed?clip=${path[1]}`;
			}
			if (
				path[0] &&
				!path[0].startsWith("videos") &&
				!path[0].startsWith("clip")
			) {
				return `https://player.twitch.tv/?channel=${path[0]}`;
			}
			return null;
		},
	},
	{
		name: "tiktok",
		detect: hosts("tiktok.com"),
		directSrc: (url) => {
			const m = new URL(url).pathname.match(/\/video\/(\d+)/);
			return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
		},
	},
	{
		name: "dailymotion",
		detect: hosts("dailymotion.com"),
		directSrc: (url) => {
			const m = new URL(url).pathname.match(/\/video\/([a-zA-Z0-9]+)/);
			return m ? `https://www.dailymotion.com/embed/video/${m[1]}` : null;
		},
	},
	{
		name: "instagram",
		detect: hosts("instagram.com"),
		directSrc: (url) => {
			const u = new URL(url);
			const m = u.pathname.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
			if (!m) return null;
			const path = u.pathname
				.replace(/\/+$/, "")
				.split("/")
				.slice(0, 4)
				.join("/");
			return `https://www.instagram.com${path}/embed/`;
		},
	},
	{
		name: "spotify",
		detect: hosts("open.spotify.com"),
		directSrc: (url) => {
			const m = new URL(url).pathname.match(
				/^\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/,
			);
			return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
		},
	},
	{
		name: "soundcloud",
		detect: hosts("w.soundcloud.com", "api.soundcloud.com", "soundcloud.com"),
		directSrc: (url) => {
			const u = new URL(url);
			const h = host(u);
			if (h === "w.soundcloud.com") {
				if (/^\/player\/?$/.test(u.pathname)) {
					const embedTarget = u.searchParams.get("url");
					if (embedTarget) return u.href;
				}
				return null;
			}
			if (h === "api.soundcloud.com") {
				const m = u.pathname.match(/^\/tracks\/(.+)/);
				return m?.[1]
					? `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}`
					: null;
			}
			const path = u.pathname.replace(/^\/+|\/+$/, "");
			const segments = path.split("/").filter(Boolean);
			return segments[0] !== "discover" && segments.length >= 2
				? `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + "/" + path)}`
				: null;
		},
	},
	{
		name: "codepen",
		detect: hosts("codepen.io"),
		directSrc: (url) => {
			const u = new URL(url);
			const m = u.pathname.match(/\/(?:pen|details)\/([^/]+)/);
			return m
				? `https://codepen.io${u.pathname.replace(/\/?$/, "")}/embed`
				: null;
		},
	},
	{
		name: "figma",
		detect: hosts("figma.com"),
		directSrc: (url) => {
			const u = new URL(url);
			return /^\/(file|design|proto)\/[^/]+/.test(u.pathname)
				? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
				: null;
		},
	},
	{
		name: "loom",
		detect: hosts("loom.com"),
		directSrc: (url) => {
			const u = new URL(url);
			const m = u.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
			return m ? `https://www.loom.com/embed/${m[1]}` : null;
		},
	},
	{
		name: "pinterest",
		detect: hosts("pinterest.com", "pinterest.co.uk", "pinterest.ca", "pin.it"),
		directSrc: (url) => {
			const u = new URL(url);
			if (host(u) === "pin.it") return null;
			const pinMatch = u.pathname.match(/\/pin\/(\d+)/);
			return pinMatch
				? `https://assets.pinterest.com/ext/embed.html?id=${pinMatch[1]}`
				: null;
		},
	},
	{
		name: "linkedin",
		detect: hosts("linkedin.com"),
		directSrc: (url) => {
			const u = new URL(url);
			let activityId: string | null = null;
			const urnMatch = u.pathname.match(/urn:li:activity:(\d+)/);
			if (urnMatch) activityId = urnMatch[1];
			if (!activityId) {
				const activityMatch = u.pathname.match(/activity-(\d+)/);
				if (activityMatch) activityId = activityMatch[1];
			}
			return activityId
				? `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`
				: null;
		},
	},
	{
		name: "giphy",
		detect: hosts("giphy.com", "media.giphy.com", "i.giphy.com"),
		directSrc: (url) => {
			const u = new URL(url);
			const h = host(u);
			let gifId: string | null = null;
			if (h === "media.giphy.com") {
				const m = u.pathname.match(/\/media\/([^/]+)/);
				if (m) gifId = m[1];
			} else if (h === "i.giphy.com") {
				const m = u.pathname.match(/\/([^/]+)\.gif$/);
				if (m) gifId = m[1];
			} else {
				const segments = u.pathname.replace(/^\/+|\/+$/, "").split("/");
				if (segments[0] === "gifs" || segments[0] === "stickers") {
					gifId = segments[segments.length - 1] || null;
				}
			}
			return gifId && /^[\w-]+$/.test(gifId)
				? `https://giphy.com/embed/${gifId}`
				: null;
		},
	},
	{
		name: "steam",
		detect: hosts("store.steampowered.com", "steamcommunity.com"),
		directSrc: (url) => {
			const m = new URL(url).pathname.match(/\/app\/(\d+)/);
			return m ? `https://store.steampowered.com/widget/${m[1]}/` : null;
		},
	},
	{
		name: "mastodon",
		detect: (url) => {
			try {
				const u = new URL(url);
				if (u.protocol !== "http:" && u.protocol !== "https:") return null;
				let path = u.pathname.replace(/\/+$/, "");
				if (path.endsWith("/embed")) path = path.slice(0, -"/embed".length);
				return /^\/@([^/]+)\/(\d+)$/.test(path) ? { url } : null;
			} catch {
				return null;
			}
		},
		directSrc: (url) => {
			const u = new URL(url);
			let path = u.pathname.replace(/\/+$/, "");
			if (path.endsWith("/embed")) path = path.slice(0, -"/embed".length);
			const m = path.match(/^\/@([^/]+)\/(\d+)$/);
			return m ? `${u.origin}/@${m[1]}/${m[2]}/embed` : null;
		},
	},
];
