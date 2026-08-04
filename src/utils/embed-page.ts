import {
	EMBED_PAGE_BODY_BASE,
	EMBED_RESIZE_SCRIPT,
	EMBED_SKELETON_HIDE_SCRIPT,
} from "./constants";
import { escapeHtml } from "./html";

/** Options for the universal embed page template (wrapper + fallback for all embed types). */
export type EmbedPageOptions = {
	/** Page <title> and accessibility. */
	title: string;
	/** HTML content inside the wrapper (widget markup or script). Must be pre-escaped if it contains user data. */
	bodyContent: string;
	/** Fallback link label, e.g. "View on Telegram". */
	fallbackLabel: string;
	/** Fallback link URL (will be escaped). */
	fallbackHref: string;
	/** Optional: accent color for fallback link (default oklch neutral). */
	fallbackLinkColor?: string;
	/** Optional: extra CSS for html/body. Default: no background (transparent). */
	bodyStyle?: string;
	/** Optional: extra CSS for .embed-wrap and children (e.g. iframe dimensions). */
	wrapperStyle?: string;
	/** Optional: custom resize script; if omitted, uses default EMBED_RESIZE_SCRIPT. */
	resizeScript?: string;
	/** When true, show a skeleton fallback until a script-loaded widget appears. */
	scriptEmbedSkeleton?: boolean;
};

/** Build a standardized HTML page for a script-widget embed: shared wrapper, base styles, skeleton, fallback link. */
export function buildEmbedPageHtml(opts: EmbedPageOptions): string {
	const {
		title,
		bodyContent,
		fallbackLabel,
		fallbackHref,
		fallbackLinkColor = "oklch(0.276 0.014 64)",
		bodyStyle = "background: transparent;",
		wrapperStyle = "",
		resizeScript = EMBED_RESIZE_SCRIPT,
		scriptEmbedSkeleton = false,
	} = opts;
	const safeTitle = escapeHtml(title);
	const safeFallbackHref = escapeHtml(fallbackHref);
	const safeFallbackLabel = escapeHtml(fallbackLabel);
	const wrapClass = scriptEmbedSkeleton
		? "embed-wrap embed-wrap--script"
		: "embed-wrap";
	const fallbackLink = `  <p class="fallback"><a href="${safeFallbackHref}" target="_blank" rel="noopener noreferrer">${safeFallbackLabel}</a></p>`;
	const skeleton = scriptEmbedSkeleton
		? `  <div class="embed-skeleton">
${fallbackLink}
  </div>`
		: "";
	// For script widgets the fallback lives in the skeleton, so only the
	// widget markup is measured. Non-script embeds append the fallback link.
	const content = scriptEmbedSkeleton
		? bodyContent
		: `${bodyContent}\n${fallbackLink}`;
	const skeletonStyles = scriptEmbedSkeleton
		? `
    .embed-wrap.embed-wrap--script:not(.embed-wrap--loaded) > *:not(.embed-skeleton) {
      pointer-events: none;
    }
    .embed-wrap.embed-wrap--script > .embed-skeleton > .fallback {
      margin: 0;
      pointer-events: auto;
      text-align: center;
    }`
		: "";
	return `<!DOCTYPE html>
<html lang="en"${scriptEmbedSkeleton ? ' class="embed-page--script-skeleton"' : ""}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
${EMBED_PAGE_BODY_BASE}
    html, body { ${bodyStyle} }
    .embed-wrap a { color: ${fallbackLinkColor}; text-decoration: none; }
    .embed-wrap a:hover { text-decoration: underline; }
${wrapperStyle ? `    ${wrapperStyle.replace(/\n/g, "\n    ")}` : ""}
${skeletonStyles}
  </style>
</head>
<body${scriptEmbedSkeleton ? ' class="embed-page--script-skeleton"' : ""}>
  <div class="${wrapClass}">
${skeleton}
${content}
  </div>
  <script>${resizeScript}</script>${scriptEmbedSkeleton ? `\n  <script>${EMBED_SKELETON_HIDE_SCRIPT}</script>` : ""}
</body>
</html>`;
}
