import { describe, it, expect } from "vitest";
import { getEmbedUrl } from "../../src/utils/embed-url";

describe("getEmbedUrl", () => {
	it("returns YouTube embed URL", () => {
		expect(getEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
			"https://www.youtube.com/embed/dQw4w9WgXcQ",
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

	it("returns Reddit embed URL", () => {
		expect(
			getEmbedUrl("https://www.reddit.com/r/test/comments/abc123/title/"),
		).toBe("https://www.reddit.com/r/test/comments/abc123/title/embed/");
	});

	it("returns null for script-only platforms (X, Telegram)", () => {
		expect(
			getEmbedUrl("https://x.com/user/status/1234567890"),
		).toBeNull();
		expect(getEmbedUrl("https://t.me/durov/43")).toBeNull();
	});

	it("returns null for Bluesky (no direct iframe)", () => {
		expect(
			getEmbedUrl(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
			),
		).toBeNull();
	});
});
