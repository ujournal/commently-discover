import { describe, it, expect } from "vitest";
import {
	buildBlueskyIframeHtml,
	buildEmbedHtmlForUrl,
	getBlueskyPostParts,
	getFacebookPostRef,
	getRedditPostRef,
	getTelegramPostRef,
	getThreadsPostRef,
	getTwitterStatusRef,
} from "../../src/utils/platform-embeds";
import { getUrlFromBase64PathSegment, toUrlSafeBase64 } from "../../src/utils/url";

describe("script-widget embed refs", () => {
	it("extracts Twitter/X status id", () => {
		expect(
			getTwitterStatusRef("https://x.com/user/status/1234567890"),
		).toEqual({ id: "1234567890", href: "https://x.com/user/status/1234567890" });
		expect(getTwitterStatusRef("https://twitter.com/a/status/1?lang=en")).toEqual({
			id: "1",
			href: "https://twitter.com/a/status/1?lang=en",
		});
		expect(getTwitterStatusRef("https://x.com/user/123")).toBeNull();
	});

	it("extracts Telegram post ref", () => {
		expect(getTelegramPostRef("https://t.me/durov/43")).toBe("durov/43");
		expect(getTelegramPostRef("https://t.me/c/1234567890/99")).toBe(
			"c/1234567890/99",
		);
		expect(getTelegramPostRef("https://t.me/durov")).toBeNull();
	});

	it("extracts Facebook post URL", () => {
		expect(getFacebookPostRef("https://facebook.com/some/post/123")).toBe(
			"https://facebook.com/some/post/123",
		);
		expect(getFacebookPostRef("https://facebook.com/")).toBeNull();
	});

	it("extracts Threads post URL", () => {
		expect(
			getThreadsPostRef("https://www.threads.net/@user/post/AbCdEfG"),
		).toBe("https://www.threads.net/@user/post/AbCdEfG/");
		expect(getThreadsPostRef("https://www.threads.net/t/12345")).toBe(
			"https://www.threads.net/t/12345/",
		);
		expect(getThreadsPostRef("https://www.threads.net/@user")).toBeNull();
	});

	it("extracts Bluesky post parts (handle or DID)", () => {
		expect(
			getBlueskyPostParts(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
			),
		).toEqual({
			actor: "fiadh.bsky.social",
			rkey: "3mimjctsyl22w",
			postUrl:
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
		});
		expect(
			getBlueskyPostParts(
				"https://bsky.app/profile/did%3Aplc%3Aabcxyz/post/3mimjctsyl22w/",
			),
		).toEqual({
			actor: "did%3Aplc%3Aabcxyz",
			rkey: "3mimjctsyl22w",
			postUrl: "https://bsky.app/profile/did%3Aplc%3Aabcxyz/post/3mimjctsyl22w",
		});
		expect(getBlueskyPostParts("https://bsky.app/profile/user")).toBeNull();
	});

	it("extracts Reddit post ref", () => {
		expect(
			getRedditPostRef("https://www.reddit.com/r/test/comments/abc123/title/"),
		).toEqual({
			postUrl: "https://www.reddit.com/r/test/comments/abc123/title/",
			subreddit: "test",
			titleSlug: "title",
		});
		expect(
			getRedditPostRef("https://old.reddit.com/r/test/comments/abc123"),
		).toEqual({
			postUrl: "https://www.reddit.com/r/test/comments/abc123/",
			subreddit: "test",
			titleSlug: null,
		});
		expect(getRedditPostRef("https://www.reddit.com/r/test")).toBeNull();
	});
});

describe("buildEmbedHtmlForUrl", () => {
	it("builds a Twitter widget page with the platform JS", async () => {
		const html = await buildEmbedHtmlForUrl(
			"https://x.com/user/status/1234567890",
			"uk",
		);
		expect(html).not.toBeNull();
		expect(html!).toContain("platform.twitter.com/widgets.js");
		expect(html!).toContain('"1234567890"');
		expect(html!).toContain("Дивитися в X");
	});

	it("builds a Telegram widget page", async () => {
		const html = await buildEmbedHtmlForUrl("https://t.me/durov/43", "uk");
		expect(html).not.toBeNull();
		expect(html!).toContain("telegram.org/js/telegram-widget.js");
		expect(html!).toContain('data-telegram-post="durov/43"');
	});

	it("builds a Threads embed page", async () => {
		const html = await buildEmbedHtmlForUrl(
			"https://www.threads.net/@user/post/AbCdEfG",
			"uk",
		);
		expect(html).not.toBeNull();
		expect(html!).toContain("www.threads.net/embed.js");
	});

	it("builds a Facebook embed page", async () => {
		const html = await buildEmbedHtmlForUrl(
			"https://facebook.com/some/post/123",
			"en",
		);
		expect(html).not.toBeNull();
		expect(html!).toContain("connect.facebook.net");
	});

	it("returns null for unknown URLs", async () => {
		expect(await buildEmbedHtmlForUrl("https://example.com", null)).toBeNull();
	});

	it("builds a Reddit widget page", async () => {
		const html = await buildEmbedHtmlForUrl(
			"https://www.reddit.com/r/test/comments/abc123/title/",
			"en",
		);
		expect(html).not.toBeNull();
		expect(html!).toContain("embed.reddit.com/widgets.js");
		expect(html!).toContain("r/test/comments/abc123");
	});

	it("builds a Bluesky oEmbed-free iframe fallback page", () => {
		const html = buildBlueskyIframeHtml(
			"fiadh.bsky.social",
			"3mimjctsyl22w",
			"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
			"en",
		);
		expect(html).toContain(
			"https://embed.bsky.app/iframe/fiadh.bsky.social/3mimjctsyl22w",
		);
		expect(html).toContain("embed.bsky.app/iframe");
	});
});

describe("embed page path round-trip", () => {
	it("encodes to a single URL-safe path segment and decodes back", () => {
		const url = "https://x.com/user/status/1234567890";
		const path = toUrlSafeBase64(url);
		expect(path).not.toContain("/");
		expect(path).not.toContain("+");
		expect(getUrlFromBase64PathSegment(`/embed/${path}`)).toBe(url);
	});
});
