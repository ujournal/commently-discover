/// <reference path="../types/offscreen-canvas.d.ts" />

import { IMAGE_FETCH_TIMEOUT_MS } from "./constants";

/** Target edge length for og:image thumbnails embedded in SVG (smaller base64). */
export const BASIC_CARD_THUMBNAIL_PX = 72;

/**
 * Downscale/crop image data URL to a square thumbnail (cover, like object-fit: cover).
 * Re-encodes as WebP or JPEG. Returns null if APIs are unavailable or decode fails.
 */
export async function resizeImageDataUrlToThumbnail(
	dataUrl: string,
	size: number = BASIC_CARD_THUMBNAIL_PX,
): Promise<string | null> {
	try {
		if (
			typeof createImageBitmap !== "function" ||
			typeof OffscreenCanvas === "undefined"
		) {
			return null;
		}
		const res = await fetch(dataUrl);
		const blob = await res.blob();
		const bitmap = await createImageBitmap(blob);
		const sw = bitmap.width;
		const sh = bitmap.height;
		if (sw < 1 || sh < 1) {
			bitmap.close();
			return null;
		}
		const canvas = new OffscreenCanvas(size, size);
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			bitmap.close();
			return null;
		}
		const scale = Math.max(size / sw, size / sh);
		const dw = sw * scale;
		const dh = sh * scale;
		const dx = (size - dw) / 2;
		const dy = (size - dh) / 2;
		ctx.drawImage(bitmap, dx, dy, dw, dh);
		bitmap.close();
		let out: Blob | null = null;
		try {
			out = await canvas.convertToBlob({
				type: "image/webp",
				quality: 0.78,
			});
		} catch {
			/* WebP not supported */
		}
		if (!out || out.size === 0) {
			out = await canvas.convertToBlob({
				type: "image/jpeg",
				quality: 0.82,
			});
		}
		if (!out || out.size === 0) {
			return null;
		}
		const buf = await out.arrayBuffer();
		const bytes = new Uint8Array(buf);
		let binary = "";
		const chunk = 8192;
		for (let i = 0; i < bytes.length; i += chunk) {
			binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
		}
		const b64 = btoa(binary);
		const mime = out.type || "image/jpeg";
		return `data:${mime};base64,${b64}`;
	} catch {
		return null;
	}
}

/** Fetch image URL and return base64 data URL, or null. */
export async function fetchAsBase64(
	imageUrl: string,
	maxBytes: number,
	timeoutMs: number = IMAGE_FETCH_TIMEOUT_MS,
): Promise<{ dataUrl: string; contentType: string } | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		const res = await fetch(imageUrl, {
			signal: controller.signal,
			headers: { "User-Agent": "Commently-Bot/1.0" },
		});
		clearTimeout(timeout);
		if (!res.ok) {
			return null;
		}
		const contentType =
			res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
		if (!contentType.startsWith("image/")) {
			return null;
		}
		const buf = await res.arrayBuffer();
		if (buf.byteLength > maxBytes) {
			return null;
		}
		const bytes = new Uint8Array(buf);
		let binary = "";
		const chunk = 8192;
		for (let i = 0; i < bytes.length; i += chunk) {
			binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
		}
		const b64 = btoa(binary);
		return { dataUrl: `data:${contentType};base64,${b64}`, contentType };
	} catch {
		return null;
	}
}
