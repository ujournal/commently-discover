import { buildEmbedPageHtml } from "./embed-page";
import { escapeHtml } from "./html";
import { getViewInPlatformLabel } from "./i18n";

function getLowercaseFileExtension(url: string): string | null {
	try {
		const u = new URL(url);
		const lastSegment = u.pathname.split("/").filter(Boolean).pop();
		if (!lastSegment) return null;
		const dot = lastSegment.lastIndexOf(".");
		if (dot <= 0 || dot === lastSegment.length - 1) return null;
		return lastSegment.slice(dot + 1).toLowerCase();
	} catch {
		return null;
	}
}

function buildMediaEmbedHtml(
	mediaUrl: string,
	mediaKind: "video" | "audio" | "image",
	acceptLanguage: string | null,
	sourceType?: string,
): string {
	const safeUrl = escapeHtml(mediaUrl);
	const fallbackLabel = getViewInPlatformLabel(acceptLanguage, "Media");
	const typeAttr = sourceType ? ` type="${escapeHtml(sourceType)}"` : "";

	if (mediaKind === "video") {
		return buildEmbedPageHtml({
			title: "Video",
			bodyContent: `  <video controls playsinline preload="metadata"><source src="${safeUrl}"${typeAttr}></video>`,
			fallbackLabel,
			fallbackHref: mediaUrl,
			bodyStyle: "margin:0; background: transparent;",
			wrapperStyle: `.embed-wrap { padding: 0; width: 100%; height: 100%; }
    .embed-wrap video { width: 100%; height: 100%; object-fit: contain; background: transparent; }`,
		});
	}

	if (mediaKind === "audio") {
		return buildEmbedPageHtml({
			title: "Audio",
			bodyContent: `  <audio controls preload="metadata"><source src="${safeUrl}"${typeAttr}></audio>`,
			fallbackLabel,
			fallbackHref: mediaUrl,
			bodyStyle: "margin:0; background: transparent;",
			wrapperStyle: `.embed-wrap { padding: 0; width: 100%; height: 100%; }
    .embed-wrap audio { width: 100%; max-width: 100%; display: block; }`,
		});
	}

	// image
	return buildEmbedPageHtml({
		title: "Image",
		bodyContent: `  <img src="${safeUrl}" alt="">`,
		fallbackLabel,
		fallbackHref: mediaUrl,
		bodyStyle: "margin:0; background: transparent;",
		wrapperStyle: `.embed-wrap { padding: 0; width: 100%; height: 100%; }
    .embed-wrap img { width: 100%; height: 100%; object-fit: contain; display: block; }`,
	});
}

const VIDEO_EXTS = new Map<string, string | undefined>([
	["mp4", "video/mp4"],
	["webm", "video/webm"],
	["ogv", "video/ogg"],
	["mov", "video/quicktime"],
	["m4v", "video/x-m4v"],
]);

const AUDIO_EXTS = new Map<string, string | undefined>([
	["mp3", "audio/mpeg"],
	["m4a", "audio/mp4"],
	["aac", "audio/aac"],
	["wav", "audio/wav"],
	["oga", "audio/ogg"],
	["ogg", "audio/ogg"],
	["opus", "audio/opus"],
	["flac", "audio/flac"],
]);

const IMAGE_EXTS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"svg",
	"avif",
	"bmp",
	"tif",
	"tiff",
	"ico",
	"heic",
	"heif",
]);

export function buildMediaEmbedHtmlForUrl(
	url: string,
	acceptLanguage: string | null,
): string | null {
	const ext = getLowercaseFileExtension(url);
	if (!ext) return null;

	const videoType = VIDEO_EXTS.get(ext);
	if (videoType !== undefined) {
		return buildMediaEmbedHtml(url, "video", acceptLanguage, videoType);
	}

	const audioType = AUDIO_EXTS.get(ext);
	if (audioType !== undefined) {
		return buildMediaEmbedHtml(url, "audio", acceptLanguage, audioType);
	}

	if (IMAGE_EXTS.has(ext)) {
		return buildMediaEmbedHtml(url, "image", acceptLanguage);
	}

	return null;
}

