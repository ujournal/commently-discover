import { EMBED_PAGE_BODY_BASE, EMBED_RESIZE_SCRIPT } from "./constants";
import { escapeHtml } from "./html";

/** Options for the universal embed page template (wrapper + fallback for all embed types). */
export type EmbedPageOptions = {
	/** Page <title> and accessibility. */
	title: string;
	/** HTML content inside the wrapper (iframe, script, or widget markup). Must be pre-escaped if it contains user data. */
	bodyContent: string;
	/** Fallback link label, e.g. "View on Telegram". */
	fallbackLabel: string;
	/** Fallback link URL (will be escaped). */
	fallbackHref: string;
	/** Optional: accent color for fallback link (default blue #1d9bf0). */
	fallbackLinkColor?: string;
	/** Optional: extra CSS for html/body. Default: no background (transparent). */
	bodyStyle?: string;
	/** Optional: extra CSS for .embed-wrap and children (e.g. iframe dimensions). */
	wrapperStyle?: string;
	/** Optional: custom resize script; if omitted, uses default EMBED_RESIZE_SCRIPT. */
	resizeScript?: string;
};

/** Build a standardized HTML page for any embed: shared wrapper, base styles, and fallback link. */
export function buildEmbedPageHtml(opts: EmbedPageOptions): string {
	const {
		title,
		bodyContent,
		fallbackLabel,
		fallbackHref,
		fallbackLinkColor = "#1d9bf0",
		bodyStyle = "background: transparent;",
		wrapperStyle = "",
		resizeScript = EMBED_RESIZE_SCRIPT,
	} = opts;
	const safeTitle = escapeHtml(title);
	const safeFallbackHref = escapeHtml(fallbackHref);
	const safeFallbackLabel = escapeHtml(fallbackLabel);
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
${EMBED_PAGE_BODY_BASE}
    html, body { ${bodyStyle} }
    .fallback a { color: ${fallbackLinkColor}; }
${wrapperStyle ? `    ${wrapperStyle.replace(/\n/g, "\n    ")}` : ""}
    .embed-wrap { padding-bottom: 0; }
  </style>
</head>
<body>
  <div class="embed-wrap">
${bodyContent}
  </div>
  <p class="fallback"><a href="${safeFallbackHref}" target="_blank" rel="noopener noreferrer">${safeFallbackLabel}</a></p>
  <script>${resizeScript}</script>
</body>
</html>`;
}
