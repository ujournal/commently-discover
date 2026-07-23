import { host } from "./url";

/**
 * If the URL has a known iframe-able embed page, return that URL; else null.
 * Platforms that only support script widgets (X, Facebook, Telegram, Threads, Bluesky)
 * return null so the caller falls back to a link card.
 */
export function getEmbedUrl(url: string): string | null {
	try {
		const u = new URL(url);
		const h = host(u);

		// YouTube
		if (h === "youtube.com" || h === "youtu.be") {
			let videoId: string | null = null;
			if (h === "youtu.be") {
				videoId = u.pathname.slice(1).split("/")[0] || null;
			} else {
				videoId = u.searchParams.get("v") ?? null;
				if (!videoId && /^\/shorts\//.test(u.pathname)) {
					videoId = u.pathname.replace(/^\/shorts\//, "").split("/")[0] || null;
				}
			}
			if (videoId && /^[\w-]{11}$/.test(videoId)) {
				return `https://www.youtube.com/embed/${videoId}`;
			}
			return null;
		}

		// Vimeo
		if (h === "vimeo.com") {
			const m = u.pathname.match(/\/(\d+)(?:\/|$)/);
			if (m) return `https://player.vimeo.com/video/${m[1]}`;
			return null;
		}

		// Twitch
		if (h === "twitch.tv" || h === "www.twitch.tv") {
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
		}
		if (h === "clips.twitch.tv") {
			const slug = u.pathname.slice(1).split("/")[0];
			if (slug) return `https://clips.twitch.tv/embed?clip=${slug}`;
			return null;
		}

		// TikTok
		if (h === "tiktok.com" || h === "www.tiktok.com") {
			const m = u.pathname.match(/\/video\/(\d+)/);
			if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
			return null;
		}

		// Dailymotion
		if (h === "dailymotion.com" || h === "www.dailymotion.com") {
			const m = u.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
			if (m) return `https://www.dailymotion.com/embed/video/${m[1]}`;
			return null;
		}

		// Instagram
		if (h === "instagram.com" || h === "www.instagram.com") {
			const m = u.pathname.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
			if (!m) return null;
			const path = u.pathname
				.replace(/\/+$/, "")
				.split("/")
				.slice(0, 4)
				.join("/");
			return `https://www.instagram.com${path}/embed/`;
		}

		// Spotify
		if (h === "open.spotify.com") {
			const m = u.pathname.match(
				/^\/(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/,
			);
			if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
			return null;
		}

		// SoundCloud
		if (h === "w.soundcloud.com") {
			if (/^\/player\/?$/.test(u.pathname)) {
				const embedTarget = u.searchParams.get("url");
				if (embedTarget) return u.href;
			}
			return null;
		}
		if (h === "api.soundcloud.com") {
			const m = u.pathname.match(/^\/tracks\/(.+)/);
			if (m?.[1]) {
				return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}`;
			}
			return null;
		}
		if (h === "soundcloud.com") {
			const path = u.pathname.replace(/^\/+|\/+$/, "");
			const segments = path.split("/").filter(Boolean);
			if (segments[0] !== "discover" && segments.length >= 2) {
				return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + "/" + path)}`;
			}
			return null;
		}

		// Reddit
		if (
			h === "reddit.com" ||
			h === "www.reddit.com" ||
			h === "old.reddit.com" ||
			h === "new.reddit.com"
		) {
			const path = u.pathname.replace(/^\/+|\/+$/, "");
			const m = path.match(/^r\/([^/]+)\/comments\/([^/]+)/);
			if (!m) return null;
			const pathNorm = path.replace(/\/+$/, "");
			return `https://www.reddit.com/${pathNorm}/embed/`.replace(
				/\/+$/,
				"/",
			);
		}

		// CodePen
		if (h === "codepen.io") {
			const m = u.pathname.match(/\/(?:pen|details)\/([^/]+)/);
			if (m) return `https://codepen.io${u.pathname.replace(/\/?$/, "")}/embed`;
			return null;
		}

		// Figma
		if (h === "figma.com" || h === "www.figma.com") {
			if (/^\/(file|design|proto)\/[^/]+/.test(u.pathname)) {
				return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
			}
			return null;
		}

		// Loom
		if (h === "loom.com" || h === "www.loom.com") {
			const m = u.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
			if (m) return `https://www.loom.com/embed/${m[1]}`;
			return null;
		}

		// Pinterest
		if (
			h === "pinterest.com" ||
			h === "pinterest.co.uk" ||
			h === "pinterest.ca" ||
			h === "pin.it"
		) {
			if (h === "pin.it") return null;
			const pinMatch = u.pathname.match(/\/pin\/(\d+)/);
			if (pinMatch) {
				return `https://assets.pinterest.com/ext/embed.html?id=${pinMatch[1]}`;
			}
			return null;
		}

		// LinkedIn
		if (h === "linkedin.com" || h === "www.linkedin.com") {
			let activityId: string | null = null;
			const urnMatch = u.pathname.match(/urn:li:activity:(\d+)/);
			if (urnMatch) activityId = urnMatch[1];
			if (!activityId) {
				const activityMatch = u.pathname.match(/activity-(\d+)/);
				if (activityMatch) activityId = activityMatch[1];
			}
			if (activityId) {
				return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activityId}`;
			}
			return null;
		}

		// Giphy
		if (
			h === "giphy.com" ||
			h === "www.giphy.com" ||
			h === "media.giphy.com" ||
			h === "i.giphy.com"
		) {
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
			if (gifId && /^[\w-]+$/.test(gifId)) {
				return `https://giphy.com/embed/${gifId}`;
			}
			return null;
		}

		// Steam
		if (h === "store.steampowered.com" || h === "steamcommunity.com") {
			const appMatch = u.pathname.match(/\/app\/(\d+)/);
			if (appMatch) {
				return `https://store.steampowered.com/widget/${appMatch[1]}/`;
			}
			return null;
		}

		// Mastodon: /@handle/{numeric-id} on any instance
		{
			let path = u.pathname.replace(/\/+$/, "");
			if (path.endsWith("/embed")) {
				path = path.slice(0, -"/embed".length);
			}
			const m = path.match(/^\/@([^/]+)\/(\d+)$/);
			if (m && (u.protocol === "http:" || u.protocol === "https:")) {
				return `${u.origin}/@${m[1]}/${m[2]}/embed`;
			}
		}

		return null;
	} catch {
		return null;
	}
}
