import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

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
});
