import { describe, it, expect } from "vitest";
import { getEmbedUrl } from "../../src/utils/platform-embeds";
import { toUrlSafeBase64 } from "../../src/utils/url";

describe("getEmbedUrl", () => {
	it("returns YouTube embed URL", () => {
		expect(getEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ",
		);
		expect(getEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ",
		);
		expect(
			getEmbedUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
		).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
	});

	it("returns Vimeo embed URL", () => {
		expect(getEmbedUrl("https://vimeo.com/123456789")).toBe(
			"https://player.vimeo.com/video/123456789",
		);
	});

	it("returns Twitch embed URL", () => {
		expect(getEmbedUrl("https://www.twitch.tv/monstercat")).toBe(
			"https://player.twitch.tv/?channel=monstercat",
		);
		expect(getEmbedUrl("https://www.twitch.tv/videos/1234567890")).toBe(
			"https://player.twitch.tv/?video=1234567890",
		);
		expect(getEmbedUrl("https://clips.twitch.tv/Slug")).toBe(
			"https://clips.twitch.tv/embed?clip=Slug",
		);
	});

	it("returns Instagram embed URL", () => {
		expect(
			getEmbedUrl("https://www.instagram.com/p/AbCdEfGhIjK/"),
		).toBe("https://www.instagram.com/p/AbCdEfGhIjK/embed/");
	});

	it("returns TikTok embed URL", () => {
		expect(
			getEmbedUrl("https://www.tiktok.com/@user/video/7123456789012345678"),
		).toBe("https://www.tiktok.com/embed/v2/7123456789012345678");
	});

	it("returns Dailymotion embed URL", () => {
		expect(getEmbedUrl("https://www.dailymotion.com/video/x5abcde")).toBe(
			"https://www.dailymotion.com/embed/video/x5abcde",
		);
	});

	it("returns Spotify embed URL", () => {
		expect(getEmbedUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC")).toBe(
			"https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
		);
	});

	it("returns SoundCloud player URL", () => {
		expect(getEmbedUrl("https://soundcloud.com/user/track")).toBe(
			"https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fuser%2Ftrack",
		);
		expect(
			getEmbedUrl(
				"https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fuser%2Ftrack",
			),
		).toBe(
			"https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fuser%2Ftrack",
		);
	});

	it("returns CodePen embed URL", () => {
		expect(getEmbedUrl("https://codepen.io/user/pen/abc123")).toBe(
			"https://codepen.io/user/pen/abc123/embed",
		);
	});

	it("returns Figma embed URL", () => {
		expect(getEmbedUrl("https://www.figma.com/file/abc123/Name")).toContain(
			"https://www.figma.com/embed?embed_host=share&url=",
		);
	});

	it("returns Loom embed URL", () => {
		expect(getEmbedUrl("https://www.loom.com/share/abcdef123456")).toBe(
			"https://www.loom.com/embed/abcdef123456",
		);
	});

	it("returns Pinterest embed URL", () => {
		expect(getEmbedUrl("https://www.pinterest.com/pin/1234567890123456789")).toBe(
			"https://assets.pinterest.com/ext/embed.html?id=1234567890123456789",
		);
	});

	it("returns LinkedIn embed URL", () => {
		expect(
			getEmbedUrl("https://www.linkedin.com/posts/user_activity-1234567890-foo"),
		).toBe(
			"https://www.linkedin.com/embed/feed/update/urn:li:activity:1234567890",
		);
	});

	it("returns Giphy embed URL", () => {
		expect(getEmbedUrl("https://giphy.com/gifs/cat-abc123")).toBe(
			"https://giphy.com/embed/cat-abc123",
		);
	});

	it("returns Steam widget URL", () => {
		expect(
			getEmbedUrl("https://store.steampowered.com/app/570/Dota_2/"),
		).toBe("https://store.steampowered.com/widget/570/");
	});

	it("returns Mastodon embed URL for any instance", () => {
		expect(
			getEmbedUrl("https://mastodon.social/@randahl/116344336708355476"),
		).toBe("https://mastodon.social/@randahl/116344336708355476/embed");
		expect(
			getEmbedUrl(
				"https://mastodon.green/@VQuaschning/116344907918079968/embed/",
			),
		).toBe("https://mastodon.green/@VQuaschning/116344907918079968/embed");
	});

	it("returns null for Reddit without origin (script widget, no direct iframe)", () => {
		expect(
			getEmbedUrl("https://www.reddit.com/r/test/comments/abc123/title/"),
		).toBeNull();
		expect(
			getEmbedUrl("https://old.reddit.com/r/test/comments/abc123"),
		).toBeNull();
	});

	it("returns null for script-only platforms without origin (X, Telegram)", () => {
		expect(
			getEmbedUrl("https://x.com/user/status/1234567890"),
		).toBeNull();
		expect(getEmbedUrl("https://t.me/durov/43")).toBeNull();
	});

	it("returns null for Bluesky without origin (no direct iframe)", () => {
		expect(
			getEmbedUrl(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
			),
		).toBeNull();
	});

	it("returns null for non-embeddable URLs", () => {
		expect(getEmbedUrl("https://example.com/page")).toBeNull();
		expect(getEmbedUrl("https://www.youtube.com/watch")).toBeNull();
		expect(getEmbedUrl("https://t.me/durov")).toBeNull();
	});

	it("returns worker embed page for script-only platforms when origin is given", () => {
		const origin = "https://commently-discover.workers.dev";
		expect(
			getEmbedUrl("https://x.com/user/status/1234567890", origin),
		).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://x.com/user/status/1234567890")}`,
		);
		expect(getEmbedUrl("https://t.me/durov/43", origin)).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://t.me/durov/43")}`,
		);
		expect(
			getEmbedUrl(
				"https://www.threads.net/@user/post/AbCdEfG",
				origin,
			),
		).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://www.threads.net/@user/post/AbCdEfG")}`,
		);
		expect(
			getEmbedUrl(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
				origin,
			),
		).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w")}`,
		);
		expect(getEmbedUrl("https://facebook.com/some/post/123", origin)).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://facebook.com/some/post/123")}`,
		);
		expect(
			getEmbedUrl(
				"https://www.reddit.com/r/test/comments/abc123/title/",
				origin,
			),
		).toBe(
			`${origin}/embed/${toUrlSafeBase64("https://www.reddit.com/r/test/comments/abc123/title/")}`,
		);
	});
});
