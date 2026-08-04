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
	/** When true, show a pulsing skeleton until a script-loaded widget appears. */
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
		? `  <div class="embed-skeleton" role="presentation">
    <div class="embed-skeleton__plate" aria-hidden="true"></div>
${fallbackLink}
  </div>`
		: "";
	// .embed-content holds the in-flow content; its height is what the resize
	// script reports, so the wrapper can fill the frame and center content
	// without breaking auto-resize. For script widgets the fallback lives in the
	// (absolute) skeleton, so only the widget markup is measured.
	const content = scriptEmbedSkeleton
		? bodyContent
		: `${bodyContent}\n${fallbackLink}`;
	const skeletonStyles = scriptEmbedSkeleton
		? `
    @keyframes embed-skeleton-pulse {
      0%, 100% { opacity: 0.38; }
      50% { opacity: 0.72; }
    }
    @media (prefers-reduced-motion: reduce) {
      .embed-skeleton__plate { animation: none; opacity: 0.5; }
    }
    .embed-wrap.embed-wrap--script {
      position: relative;
      min-height: 240px;
    }
    .embed-wrap.embed-wrap--script:not(.embed-wrap--loaded) > .embed-content {
      pointer-events: none;
    }
    .embed-wrap.embed-wrap--script > .embed-skeleton {
      position: absolute;
      z-index: 0;
      top: var(--embed-skeleton-gap, 1rem);
      left: var(--embed-skeleton-gap, 1rem);
      right: var(--embed-skeleton-gap, 1rem);
      bottom: var(--embed-skeleton-gap, 1rem);
      min-height: 200px;
      max-width: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      border-radius: 12px;
      overflow: hidden;
      pointer-events: none;
    }
    .embed-wrap.embed-wrap--script > .embed-skeleton > .embed-skeleton__plate {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.09);
      pointer-events: none;
      animation: embed-skeleton-pulse 1.35s ease-in-out infinite;
    }
    .embed-wrap.embed-wrap--script > .embed-skeleton > .fallback {
      position: relative;
      z-index: 1;
      margin: 0;
      height: auto;
      min-height: 0;
      padding: 0 1rem;
      pointer-events: auto;
      text-align: center;
      box-sizing: border-box;
    }
    .embed-wrap.embed-wrap--script > .embed-content {
      position: relative;
      z-index: 1;
      min-width: 0;
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
    .fallback a { color: ${fallbackLinkColor}; }
${wrapperStyle ? `    ${wrapperStyle.replace(/\n/g, "\n    ")}` : ""}
${skeletonStyles}
  </style>
</head>
<body${scriptEmbedSkeleton ? ' class="embed-page--script-skeleton"' : ""}>
  <div class="${wrapClass}">
${skeleton}
    <div class="embed-content">
${content}
    </div>
  </div>
  <script>${resizeScript}</script>${scriptEmbedSkeleton ? `\n  <script>${EMBED_SKELETON_HIDE_SCRIPT}</script>` : ""}
</body>
</html>`;
}
