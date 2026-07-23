/** Minimal 400 JSON for missing or invalid URL. Cached by the worker to reduce load. */
export function getInvalidUrlResponse(): Response {
	return new Response(JSON.stringify({ error: "Bad Request" }), {
		status: 400,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
