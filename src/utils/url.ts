/**
 * Decode a URL from a base64-encoded path segment.
 * Path can be a single segment (e.g. "/aHR0cHM6Ly9leGFtcGxlLmNvbS8=") or multiple (e.g. "/d/aHR0c...");
 * the last non-empty segment is treated as base64.
 * Returns the decoded URL if valid http(s), else null.
 */
export function getUrlFromBase64PathSegment(pathname: string): string | null {
	const segments = pathname
		.replace(/^\/+|\/+$/, "")
		.split("/")
		.filter(Boolean);
	const raw = segments[segments.length - 1];
	if (!raw) return null;
	try {
		const decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
		let s = decoded.trim();
		// Base64 may encode a percent-encoded URL (e.g. https%3A%2F%2F...)
		if (
			(s.startsWith("http%3A") || s.startsWith("https%3A")) &&
			s.includes("%")
		) {
			try {
				s = decodeURIComponent(s);
			} catch {
				/* use s as-is */
			}
		}
		if (s.startsWith("http://") || s.startsWith("https://")) return s;
		return null;
	} catch {
		return null;
	}
}

/** Normalize host (no www). */
export function host(url: URL): string {
	return url.hostname.replace(/^www\./, "");
}

export function getSiteName(url: string): string {
	try {
		return host(new URL(url));
	} catch {
		return "Link";
	}
}

const EXTENSION_TITLES: Record<string, string> = {
	pdf: "PDF file",
	doc: "DOC file",
	docx: "Word file",
	xls: "Excel file",
	xlsx: "Excel file",
	ppt: "PowerPoint file",
	pptx: "PowerPoint file",
	txt: "Text file",
	csv: "CSV file",
	jpg: "Image file",
	jpeg: "Image file",
	png: "Image file",
	gif: "GIF file",
	webp: "Image file",
	mp4: "Video file",
	mov: "Video file",
	avi: "Video file",
	mkv: "Video file",
	mp3: "Audio file",
	wav: "Audio file",
	zip: "ZIP archive",
	rar: "RAR archive",
	gz: "GZIP archive",
	tar: "TAR archive",
	"7z": "7Z archive",
};

/**
 * Path-like string for file detection (e.g. pathname, or pathname + hash for #/media/...).
 * Use with fileTypeTitleFromPath so filenames in the hash are considered.
 */
export function getPathForFileDetection(url: URL): string {
	const path = url.pathname;
	const hash = url.hash ? url.hash.slice(1) : "";
	if (!hash || !hash.startsWith("/")) return path;
	return path + hash;
}

/**
 * Decode percent-encoded string without throwing (escape lone % so decodeURIComponent succeeds).
 * Ensures filenames with valid percent-encoding (e.g. Cyrillic) are decoded for display.
 */
function safeDecodeURIComponent(s: string): string {
	try {
		return decodeURIComponent(s);
	} catch {
		// Escape malformed % so decodeURIComponent can decode the rest (e.g. UTF-8 sequences)
		const escaped = s.replace(/%(?![0-9A-Fa-f]{2})/gi, "%25");
		try {
			return decodeURIComponent(escaped);
		} catch {
			return s;
		}
	}
}

/**
 * Last path segment (filename) from pathname + hash, percent-decoded for display.
 * Returns null if there is no path segment.
 */
export function getDecodedFilenameFromUrl(url: URL): string | null {
	const pathLike = getPathForFileDetection(url);
	const noQuery = pathLike.split("?", 1)[0] ?? "";
	const parts = noQuery.split("/").filter(Boolean);
	if (parts.length === 0) return null;
	const last = parts[parts.length - 1];
	if (!last) return null;
	return safeDecodeURIComponent(last);
}

export function fileTypeTitleFromPath(pathLike: string): string | null {
	const noHash = pathLike.split("#", 1)[0] ?? "";
	const noQuery = noHash.split("?", 1)[0] ?? "";
	const parts = noQuery.split("/").filter(Boolean);
	if (parts.length === 0) return null;
	let last = parts[parts.length - 1];
	if (!last) return null;
	try {
		last = decodeURIComponent(last);
	} catch {
		/* use last as-is if not valid percent-encoding */
	}

	const dot = last.lastIndexOf(".");
	if (dot <= 0 || dot === last.length - 1) return null;
	const ext = last.slice(dot + 1).toLowerCase();

	const known = EXTENSION_TITLES[ext];
	if (known) return known;
	if (!/^[a-z0-9]+$/.test(ext)) return null;
	return `${ext.toUpperCase()} file`;
}
