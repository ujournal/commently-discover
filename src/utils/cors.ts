/** Parse comma-separated env value into a trimmed, non-empty origin list. */
export function parseAllowedOrigins(
	value: string | undefined,
): readonly string[] {
	return (value ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

/** Origin of the request if allowed by the allowlist, otherwise null. */
export function getAllowedOrigin(
	request: Request,
	allowedOrigins: readonly string[],
): string | null {
	const origin = request.headers.get("Origin");
	if (!origin) return null;
	return allowedOrigins.includes(origin) ? origin : null;
}

/**
 * Preflight (OPTIONS) response for the request's Origin.
 * 204 with CORS headers if the origin is allowed, 403 otherwise.
 */
export function getPreflightResponse(
	request: Request,
	allowedOrigins: readonly string[],
): Response {
	const origin = getAllowedOrigin(request, allowedOrigins);
	if (!origin) {
		return new Response(null, { status: 403 });
	}
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": origin,
			"Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
			"Access-Control-Allow-Headers": "*",
			"Access-Control-Max-Age": "86400",
			Vary: "Origin",
		},
	});
}

/**
 * Clone response with CORS headers for the request's Origin, if allowed.
 * Vary: Origin is always set so the edge cache keeps per-origin variants.
 */
export function withCors(
	response: Response,
	request: Request,
	allowedOrigins: readonly string[],
): Response {
	const origin = getAllowedOrigin(request, allowedOrigins);
	const headers = new Headers(response.headers);
	headers.append("Vary", "Origin");
	if (origin) {
		headers.set("Access-Control-Allow-Origin", origin);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
