/** Minimal 400 response for missing or invalid URL (e.g. bot probes). Cached by the worker to reduce load. */
export function getInvalidUrlResponse(): Response {
  return new Response("Bad Request", {
    status: 400,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
