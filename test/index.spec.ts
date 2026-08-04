import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";
import { toUrlSafeBase64 } from "../src/utils/url";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("discover worker", () => {
	it("returns 400 JSON for missing url (unit)", async () => {
		const request = new IncomingRequest("http://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Bad Request" });
	});

	it("returns 400 JSON for missing url (integration)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Bad Request" });
	});

	it("returns iframe JSON for YouTube", async () => {
		const response = await SELF.fetch(
			"https://example.com/?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toMatch(/application\/json/);
		expect(await response.json()).toEqual({
			type: "iframe",
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			iframeSrc: "https://www.youtube.com/embed/dQw4w9WgXcQ",
		});
	});

	it("returns worker embed page iframeSrc for Twitter (integration)", async () => {
		const response = await SELF.fetch(
			"https://commently-discover.workers.dev/?url=https%3A%2F%2Fx.com%2Fuser%2Fstatus%2F1234567890",
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			type: "iframe",
			url: "https://x.com/user/status/1234567890",
			iframeSrc: `https://commently-discover.workers.dev/embed/${toUrlSafeBase64(
				"https://x.com/user/status/1234567890",
			)}`,
		});
	});

	it("serves a script-widget embed page at /embed/{base64url}", async () => {
		const url = "https://x.com/user/status/1234567890";
		const response = await SELF.fetch(
			`https://commently-discover.workers.dev/embed/${toUrlSafeBase64(url)}`,
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toMatch(/text\/html/);
		const html = await response.text();
		expect(html).toContain("platform.twitter.com/widgets.js");
		expect(html).toContain("1234567890");
		expect(html).toContain('class="embed-content"');
		expect(html).toContain('querySelector(".embed-wrap")');
	});

	it("served embed pages use a non-branded resize event", async () => {
		const url = "https://t.me/durov/43";
		const response = await SELF.fetch(
			`https://commently-discover.workers.dev/embed/${toUrlSafeBase64(url)}`,
		);
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('type: "embed-resize"');
		expect(html).not.toContain("commently-discover-resize");
		expect(html).not.toContain("commentlyDiscover");
	});
});
