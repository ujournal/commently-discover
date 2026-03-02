import { IMAGE_FETCH_TIMEOUT_MS } from "./constants";

/** Fetch image URL and return base64 data URL, or null. */
export async function fetchAsBase64(
  imageUrl: string,
  maxBytes: number,
): Promise<{ dataUrl: string; contentType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      IMAGE_FETCH_TIMEOUT_MS,
    );
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Commently-Bot/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) return null;
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
