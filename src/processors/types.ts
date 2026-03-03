/**
 * Context passed to every URL processor (e.g. request-derived options).
 */
export type ProcessorContext = {
  acceptLanguage: string | null;
  /** Default headers for HTML responses (content-type, cache, etc.). */
  htmlHeaders: HeadersInit;
};

/**
 * Result of a processor: either it handled the URL (return response) or pass to next.
 */
export type ProcessorResult =
  | { handled: true; response: Response }
  | { handled: false };

/**
 * A URL processor: tries to handle a URL; if not, returns handled: false so the next processor runs.
 * Processors run in order. The last processor should always handle (e.g. basic link card).
 */
export type Processor = {
  /** Optional name for debugging / logging. */
  name?: string;
  handle(
    url: string,
    context: ProcessorContext,
  ): ProcessorResult | Promise<ProcessorResult>;
};
