import { describe, it, expect } from "vitest";
import { getBlueskyPostRef } from "../../src/utils/platform-refs";

describe("getBlueskyPostRef", () => {
	it("returns canonical post URL for profile handle path", () => {
		expect(
			getBlueskyPostRef(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w",
			),
		).toBe("https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w");
	});

	it("strips trailing slash on post path", () => {
		expect(
			getBlueskyPostRef(
				"https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w/",
			),
		).toBe("https://bsky.app/profile/fiadh.bsky.social/post/3mimjctsyl22w");
	});

	it("accepts did:plc profile segment", () => {
		expect(
			getBlueskyPostRef(
				"https://bsky.app/profile/did:plc:karqah6zkfiark2ttjpnlvft/post/3mimjctsyl22w",
			),
		).toBe(
			"https://bsky.app/profile/did:plc:karqah6zkfiark2ttjpnlvft/post/3mimjctsyl22w",
		);
	});

	it("accepts www.bsky.app host", () => {
		expect(
			getBlueskyPostRef(
				"https://www.bsky.app/profile/alice/post/abc123",
			),
		).toBe("https://bsky.app/profile/alice/post/abc123");
	});

	it("returns null for profile page without post", () => {
		expect(getBlueskyPostRef("https://bsky.app/profile/alice")).toBeNull();
	});

	it("returns null for non-bsky hosts", () => {
		expect(
			getBlueskyPostRef("https://example.com/profile/x/post/y"),
		).toBeNull();
	});
});
