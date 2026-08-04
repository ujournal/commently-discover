export const MAX_IMAGE_BYTES = 1024 * 1024; // 1MB for og:image
export const MAX_FAVICON_BYTES = 256 * 1024; // 256KB for favicon
export const IMAGE_FETCH_TIMEOUT_MS = 5000;

export const CACHE_HEADERS = {
	"Cache-Control": "public, s-maxage=31536000, immutable",
};

/** Base styles shared by all worker-served embed pages (iframe src for script-widget platforms). */
export const EMBED_PAGE_BODY_BASE = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; scrollbar-width: none; -ms-overflow-style: none; }
    html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; }
    .embed-wrap { margin: 0 auto; width: 100%; min-height: 100%; display: flex; flex-direction: column; justify-content: center; }
    .embed-wrap > * { width: 100% !important; }
    .embed-content { min-width: 0; }
    .embed-wrap iframe { border: 0; display: block; margin: 0 auto; }
    .fallback { height: 3rem; display: flex; justify-content: center; align-items: center; font-size: 0.85rem; }
    .fallback a { text-decoration: none; }
    .fallback a:hover { text-decoration: underline; }
`;

/** postMessage event type sent from embed pages to the parent frame (non-branded, part of the client contract). */
export const EMBED_RESIZE_EVENT_TYPE = "embed-resize";

/** Script injected into embed pages: reports the CONTENT height (not the viewport-filling wrapper) via postMessage so the outer frame can resize the iframe without breaking auto-resize. */
export const EMBED_RESIZE_SCRIPT = `
(function() {
  var lastHeight = 0;
  var content = document.querySelector(".embed-content") || document.body;
  function measure() {
    return Math.max(content.scrollHeight, content.offsetHeight || 0);
  }
  function sendHeight() {
    var h = measure();
    if (h !== lastHeight) {
      lastHeight = h;
      try { window.parent.postMessage({ type: "${EMBED_RESIZE_EVENT_TYPE}", height: h }, "*"); } catch (e) {}
    }
  }
  function scheduleSend() {
    requestAnimationFrame(function() { sendHeight(); });
  }
  sendHeight();
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(scheduleSend);
    ro.observe(content);
    ro.observe(document.body);
  }
  var mo = new MutationObserver(scheduleSend);
  mo.observe(content, { childList: true, subtree: true });
  window.addEventListener("load", scheduleSend);
})();
`;

/** Hides the script-embed skeleton once a widget injects an iframe or known widget root. */
export const EMBED_SKELETON_HIDE_SCRIPT = `
(function() {
  var wrap = document.querySelector(".embed-wrap.embed-wrap--script");
  var skel = document.querySelector(".embed-skeleton");
  if (!wrap || !skel) return;
  var hidden = false;
  var mo;
  function hide() {
    if (hidden) return;
    hidden = true;
    if (mo) mo.disconnect();
    wrap.classList.add("embed-wrap--loaded");
    if (skel.parentNode) skel.parentNode.removeChild(skel);
  }
  function loaded() {
    if (wrap.querySelector("iframe")) return true;
    if (wrap.querySelector(".twitter-tweet")) return true;
    if (wrap.querySelector(".fb_iframe_widget")) return true;
    return false;
  }
  function check() {
    if (loaded()) hide();
  }
  window.__embedSkeletonHide = hide;
  if (loaded()) {
    hide();
    return;
  }
  mo = new MutationObserver(check);
  mo.observe(wrap, { childList: true, subtree: true });
  window.addEventListener("load", check);
  setTimeout(hide, 30000);
})();
`;
