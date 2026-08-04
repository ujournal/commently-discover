import type { Processor, ProcessorContext, ProcessorResult } from "./types";
import { defaultProcessors } from "./processors";

/**
 * Run the processor pipeline for a URL. Processors are tried in order; the first
 * that returns handled: true wins. The last processor should always handle (card).
 */
export async function runProcessors(
	url: string,
	options: {
		acceptLanguage?: string | null;
		origin?: string | null;
		processors?: Processor[];
	} = {},
): Promise<Response> {
	const processors = options.processors ?? defaultProcessors;
	const context: ProcessorContext = {
		acceptLanguage: options.acceptLanguage ?? null,
		origin: options.origin ?? null,
	};

	for (const processor of processors) {
		const result: ProcessorResult = await Promise.resolve(
			processor.handle(url, context),
		);
		if (result.handled) {
			return result.response;
		}
	}

	return new Response(JSON.stringify({ error: "No processor handled this URL" }), {
		status: 500,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
}
