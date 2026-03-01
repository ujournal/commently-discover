export const MAX_IMAGE_BYTES = 1024 * 1024 // 1MB for og:image
export const MAX_FAVICON_BYTES = 256 * 1024 // 256KB for favicon
export const IMAGE_FETCH_TIMEOUT_MS = 5000

export const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
}

/** Script injected into embed pages: sends scroll height to parent via postMessage so outer frame can resize iframe. */
export const EMBED_RESIZE_SCRIPT = `
(function() {
  var lastHeight = 0;
  function sendHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight || 0
    );
    if (h !== lastHeight) {
      lastHeight = h;
      try { window.parent.postMessage({ type: "commently-discover-resize", height: h }, "*"); } catch (e) {}
    }
  }
  function scheduleSend() {
    requestAnimationFrame(function() { sendHeight(); });
  }
  sendHeight();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleSend);
    ro.observe(document.body);
    if (document.documentElement !== document.body) ro.observe(document.documentElement);
  }
  var mo = new MutationObserver(scheduleSend);
  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", scheduleSend);
})();
`

/** Resize script with max height cap (used for Steam widget). */
export const EMBED_RESIZE_SCRIPT_MAX_HEIGHT = `
(function() {
  var MAX_HEIGHT = 320;
  var lastHeight = 0;
  function sendHeight() {
    var h = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight || 0
    );
    h = Math.min(h, MAX_HEIGHT);
    if (h !== lastHeight) {
      lastHeight = h;
      try { window.parent.postMessage({ type: "commently-discover-resize", height: h }, "*"); } catch (e) {}
    }
  }
  function scheduleSend() {
    requestAnimationFrame(function() { sendHeight(); });
  }
  sendHeight();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleSend);
    ro.observe(document.body);
    if (document.documentElement !== document.body) ro.observe(document.documentElement);
  }
  var mo = new MutationObserver(scheduleSend);
  mo.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("load", scheduleSend);
})();
`

export const EMBED_PAGE_BODY_BASE = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; scrollbar-width: none; -ms-overflow-style: none; display: flex; flex-direction: column; justify-content: center; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    @media (prefers-color-scheme: dark) { html, body { background: #16181c; } }
    .embed-wrap { margin: 0 auto; width: 100%; min-height: 100px; display: flex; justify-content: center; }
    .embed-wrap > * { width: 100%; }
    .embed-wrap iframe { border: 0; display: block; margin: 0 auto; }
    .fallback { height: 3rem; display: flex; justify-content: center; align-items: center; font-size: 0.85rem; }
    .fallback a { text-decoration: none; }
    .fallback a:hover { text-decoration: underline; }
`
