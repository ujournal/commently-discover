import type { Processor, ProcessorContext, ProcessorResult } from "./types";
import { jsonResponse } from "../utils/discover";
import { getEmbedUrl } from "../utils/embed-url";
import { getBasicRef } from "../utils/platform-refs";

/** Known platform embed URL → iframe JSON. */
const embedProcessor: Processor = {
	name: "embed",
	handle(url: string): ProcessorResult {
		const iframeSrc = getEmbedUrl(url);
		if (!iframeSrc) return { handled: false };
		return {
			handled: true,
			response: jsonResponse({ type: "iframe", url, iframeSrc }),
		};
	},
};

/** Fallback: unfurl link card JSON (always handles). */
const cardProcessor: Processor = {
	name: "card",
	async handle(
		url: string,
		context: ProcessorContext,
	): Promise<ProcessorResult> {
		const ref = await getBasicRef(url, {
			acceptLanguage: context.acceptLanguage,
		});
		return {
			handled: true,
			response: jsonResponse({
				type: "card",
				url: ref.url,
				title: ref.title,
				description: ref.description,
				image: ref.imageDataUrl,
				favicon: ref.faviconDataUrl,
				siteName: ref.siteName,
			}),
		};
	},
};

export const defaultProcessors: Processor[] = [embedProcessor, cardProcessor];
