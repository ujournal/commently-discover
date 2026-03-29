import { prepareText } from "./html";
import type { BasicRef } from "./platform-refs";

/** Escape a double-quoted XML attribute value (href, xlink:href). */
function escapeXmlAttr(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}

const CARD_W = 400;
const CARD_H = 72;
const THUMB = 72;
const TEXT_X = 84;
const TEXT_W = 316;

/** Silver tile + simple link-chain icon (stroke) when og:image is missing. */
function linkPlaceholderSvg(): string {
	return `<g>
  <rect width="${THUMB}" height="${THUMB}" fill="#d1d5db"/>
  <g transform="translate(24,24)" fill="none" stroke="#64748b" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </g>
</g>`;
}

/**
 * Compact unfurl card as a single SVG (400×72): optional left thumbnail, site + title.
 * Clickable via wrapped &lt;a&gt;. Uses foreignObject for text (matches common embed patterns).
 */
export function buildBasicLinkCardSvg(ref: BasicRef): string {
	const { title, imageDataUrl, url, siteName } = ref;
	const displayTitle = title ? prepareText(title) : "Link";
	const siteLower = prepareText(siteName.toLowerCase());
	const safeHref = escapeXmlAttr(url);
	const thumbBlock = imageDataUrl
		? `  <image
    width="${THUMB}"
    height="${THUMB}"
    x="0"
    y="0"
    preserveAspectRatio="xMidYMid slice"
    href="${escapeXmlAttr(imageDataUrl)}"
    xlink:href="${escapeXmlAttr(imageDataUrl)}"
  />`
		: `  ${linkPlaceholderSvg()}`;

	return `<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="border-radius: 8px; outline: 1px solid rgba(0, 0, 0, 0.15); outline-offset: -1px;">
  <title>${displayTitle}</title>
  <a href="${safeHref}" target="_blank" rel="noopener noreferrer">
    <rect width="${CARD_W}" height="${CARD_H}" fill="#ffffff"/>
${thumbBlock}
    <foreignObject x="${TEXT_X}" y="0" width="${TEXT_W}" height="${CARD_H}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding-right: 12px;
        height: ${CARD_H}px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
    ">
        <div style="font-size: 11px; color: #6b7280; text-transform: lowercase; margin-bottom: 3px; margin-top: -3px;">
          ${siteLower}
        </div>
        <div style="
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
      ">
          ${displayTitle}
        </div>
      </div>
    </foreignObject>
  </a>
</svg>`;
}
