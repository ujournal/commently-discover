import { escapeHtml, prepareText } from "./html";

/** Deterministic gradient CSS from URL (for cards with no image). */
function urlToGradientCss(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++)
    h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  // Cool base hue (teal–blue–violet), then complementary (soft warm)
  const coolHue = 200 + (((h % 70) + 70) % 70); // 200–270°
  const compHue = (coolHue + 180) % 360;
  return `linear-gradient(135deg, hsl(${coolHue}, 38%, 78%), hsl(${compHue}, 32%, 90%))`;
}

/** Build responsive HTML card with base64 images and cache headers. */
export function buildCardHtml(opts: {
  title: string | undefined;
  description: string | undefined;
  imageDataUrl: string | null;
  faviconDataUrl: string | null;
  url: string;
  href?: string;
  siteName: string;
}): string {
  const {
    title,
    description,
    imageDataUrl,
    faviconDataUrl,
    url,
    href,
    siteName,
  } = opts;
  const displayTitle = title ? prepareText(title) : "Link";
  const displayDesc = description ? prepareText(description) : "";
  const displayUrl = prepareText(url);
  const displaySite = prepareText(siteName);

  const gradientCss = imageDataUrl ? null : urlToGradientCss(url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${displayTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; display: flex; justify-content: center; align-items: center; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    .card {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      max-width: 100%;
      background: var(--card-bg);
      color: var(--card-fg);
      overflow: hidden;
      position: relative;
    }
    .card-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: var(--card-image-bg);
      display: block;
    }
    .card-image--gradient {
      background: var(--card-image-bg);
    }
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: clamp(10px, 2.5vw, 18px);
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      max-height: 70%;
      min-width: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.72), transparent);
      z-index: 1;
    }
    .card-site {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: clamp(0.65rem, 2.2vw, 0.8rem);
      color: var(--card-accent);
    }
    .card-site img { width: 1rem; height: 1rem; border-radius: 4px; flex-shrink: 0; }
    .card-title {
      font-size: clamp(0.75rem, 2.8vw, 1rem);
      font-weight: 600;
      line-height: 1.3;
      color: var(--card-fg);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 0;
      flex-shrink: 0;
			padding-inline: 0.25rem;
			margin-inline: -0.25rem;
    }
    .card-desc {
      font-size: clamp(0.7rem, 2.2vw, 0.85rem);
      line-height: 1.45;
      color: var(--card-fg-muted);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 0;
    }
    .card-url {
      font-size: clamp(0.6rem, 1.8vw, 0.75rem);
      color: var(--card-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: auto;
    }
    .card-link {
      display: flex;
      flex-direction: column;
      flex: 1;
			gap: 0.25rem;
      min-height: 0;
      min-width: 0;
      text-decoration: none;
      color: inherit;
      position: relative;
      overflow: hidden;
    }
    /* Subtle gradient overlay so image/gradient blends into card background */
    .card-link::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        var(--card-bg-blend) 0%,
        transparent 45%
      );
      pointer-events: none;
      z-index: 0.5;
    }
    .card-body {
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.25);
    }
    .card-body .card-site { color: rgba(255, 255, 255, 0.85); }
    .card-body .card-title { color: #fff; }
    .card-body .card-desc { color: rgba(255, 255, 255, 0.78); }
    .card-body .card-url { color: rgba(255, 255, 255, 0.65); }
    /* Default: dark theme (gray, similar to base) */
    .card {
      --card-bg: linear-gradient(145deg, #2c2c2c 0%, #242424 100%);
      --card-bg-blend: rgba(28, 32, 44, 0.4);
      --card-fg: #e8e8e8;
      --card-fg-muted: #98989d;
      --card-accent: #b0b0b0;
      --card-muted: #636366;
      --card-image-bg: #383838;
    }
    @media (prefers-color-scheme: light) {
      .card {
        --card-bg: linear-gradient(145deg, #f5f5f5 0%, #ebebeb 100%);
        --card-bg-blend: rgba(245, 245, 245, 0.65);
        --card-fg: #1c1c1e;
        --card-fg-muted: #48484a;
        --card-accent: #636366;
        --card-muted: #8e8e93;
        --card-image-bg: #e8e8e8;
      }
    }
  </style>
</head>
<body>
  <article class="card">
    <a class="card-link" href="${escapeHtml(href ?? url)}" target="_blank" rel="noopener noreferrer">
${
  gradientCss
    ? `      <div class="card-image card-image--gradient" style="background: ${escapeHtml(gradientCss)}"></div>`
    : `      <img class="card-image" src="${imageDataUrl}" alt="">`
}
      <div class="card-body">
        <div class="card-site">
${faviconDataUrl ? `          <img src="${faviconDataUrl}" alt="">` : ""}
          <span>${displaySite}</span>
        </div>
        <h2 class="card-title">${displayTitle}</h2>
      </div>
    </a>
  </article>
</body>
</html>`;
}
