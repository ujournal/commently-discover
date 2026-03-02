export function getSiteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

/** Normalize host (no www). */
export function host(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}
