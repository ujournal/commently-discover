import { CACHE_HEADERS } from "../utils/constants";
import type { Processor, ProcessorContext, ProcessorResult } from "./types";
import { defaultProcessors } from "./processors";

const HTML_HEADERS: HeadersInit = {
  "content-type": "text/html; charset=utf-8",
  ...CACHE_HEADERS,
};

/**
 * Run the processor pipeline for a URL. Processors are tried in order; the first
 * that returns handled: true wins. The last processor should always handle (e.g. basic link card).
 */
export async function runProcessors(
  url: string,
  options: {
    acceptLanguage?: string | null;
    processors?: Processor[];
  } = {},
): Promise<Response> {
  const processors = options.processors ?? defaultProcessors;
  const context: ProcessorContext = {
    acceptLanguage: options.acceptLanguage ?? null,
    htmlHeaders: HTML_HEADERS,
  };

  for (const processor of processors) {
    const result: ProcessorResult = await Promise.resolve(
      processor.handle(url, context),
    );
    if (result.handled) {
      return result.response;
    }
  }

  // Should not be reached if the last processor always handles (e.g. basic).
  return new Response("No processor handled this URL", {
    status: 500,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
