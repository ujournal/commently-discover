import { describe, it, expect } from "vitest";
import {
	getBlueskyPostRef,
	getMastodonPostRef,
} from "../../src/utils/platform-refs";

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

describe("getMastodonPostRef", () => {
	it("returns canonical post URL for mastodon.social", () => {
		expect(
			getMastodonPostRef(
				"https://mastodon.social/@randahl/116344336708355476",
			),
		).toBe("https://mastodon.social/@randahl/116344336708355476");
	});

	it("strips trailing slash and /embed suffix", () => {
		expect(
			getMastodonPostRef(
				"https://mastodon.green/@VQuaschning/116344907918079968/embed/",
			),
		).toBe("https://mastodon.green/@VQuaschning/116344907918079968");
	});

	it("returns null for profile without status id", () => {
		expect(getMastodonPostRef("https://mastodon.social/@randahl")).toBeNull();
	});

	it("returns null when status id is not numeric", () => {
		expect(
			getMastodonPostRef("https://mastodon.social/@randahl/abc"),
		).toBeNull();
	});
});
