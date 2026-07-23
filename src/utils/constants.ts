export const MAX_IMAGE_BYTES = 1024 * 1024; // 1MB for og:image
export const MAX_FAVICON_BYTES = 256 * 1024; // 256KB for favicon
export const IMAGE_FETCH_TIMEOUT_MS = 5000;

export const CACHE_HEADERS = {
	"Cache-Control": "public, s-maxage=31536000, immutable",
};
