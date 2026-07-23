import { CACHE_HEADERS } from "./constants";

/** Client builds an `<iframe src={iframeSrc}>`. */
export type DiscoverIframe = {
	type: "iframe";
	url: string;
	iframeSrc: string;
};

/** Client builds a link card (title/description + optional data-URL images). */
export type DiscoverCard = {
	type: "card";
	url: string;
	title?: string;
	description?: string;
	image: string | null;
	favicon: string | null;
	siteName: string;
};

export type DiscoverResponse = DiscoverIframe | DiscoverCard;

const JSON_HEADERS: HeadersInit = {
	"content-type": "application/json; charset=utf-8",
	...CACHE_HEADERS,
};

export function jsonResponse(body: DiscoverResponse, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: {
			...JSON_HEADERS,
			...(init?.headers ?? {}),
		},
	});
}
