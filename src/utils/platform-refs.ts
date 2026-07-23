import { unfurl } from "cloudflare-workers-unfurl";
import { MAX_FAVICON_BYTES, MAX_IMAGE_BYTES } from "./constants";
import { fetchAsBase64, resizeImageDataUrlToThumbnail } from "./image";
import { shimSiteData } from "./shim";
import { unfurlFallback } from "./unfurl";
import {
	fileTypeTitleFromPath,
	getDecodedFilenameFromUrl,
	getPathForFileDetection,
	getSiteName,
} from "./url";

/** Unfurl metadata for a link card (images as data URLs). */
export type BasicRef = {
	title: string | undefined;
	description: string | undefined;
	imageDataUrl: string | null;
	faviconDataUrl: string | null;
	url: string;
	siteName: string;
};

/** Unfurl URL (with fallback/shim), fetch images as base64 data URLs. */
export async function getBasicRef(
	url: string,
	options?: { acceptLanguage?: string | null },
): Promise<BasicRef> {
	let result = await unfurl(url);
	if (!result.ok && result.error === "failed-fetch") {
		const fallback = await unfurlFallback(url, {
			acceptLanguage: options?.acceptLanguage,
		});
		if (fallback) {
			result = { ok: true, value: fallback };
		}
	}
	let data = result.ok ? result.value : shimSiteData(url);
	if (!data.title && !data.description && !data.image && !data.favicon) {
		data = shimSiteData(url);
	}
	if (!data.title) {
		try {
			const u = new URL(url);
			const pathForFile = getPathForFileDetection(u);
			if (fileTypeTitleFromPath(pathForFile)) {
				const decodedName = getDecodedFilenameFromUrl(u);
				if (decodedName) {
					data = { ...data, title: decodedName };
				}
			}
		} catch {
			/* ignore */
		}
	}
	const siteName = getSiteName(url);
	const [faviconResult, imageResult] = await Promise.all([
		data.favicon ? fetchAsBase64(data.favicon, MAX_FAVICON_BYTES) : null,
		data.image ? fetchAsBase64(data.image, MAX_IMAGE_BYTES) : null,
	]);
	let imageDataUrl = imageResult?.dataUrl ?? null;
	if (imageDataUrl) {
		const resized = await resizeImageDataUrlToThumbnail(imageDataUrl);
		if (resized) {
			imageDataUrl = resized;
		}
	}
	return {
		title: data.title,
		description: data.description,
		imageDataUrl,
		faviconDataUrl: faviconResult?.dataUrl ?? null,
		url,
		siteName,
	};
}
