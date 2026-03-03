/**
 * Decode a URL from a base64-encoded path segment.
 * Path can be a single segment (e.g. "/aHR0cHM6Ly9leGFtcGxlLmNvbS8=") or multiple (e.g. "/d/aHR0c...");
 * the last non-empty segment is treated as base64.
 * Returns the decoded URL if valid http(s), else null.
 */
export function getUrlFromBase64PathSegment(pathname: string): string | null {
  const segments = pathname.replace(/^\/+|\/+$/, "").split("/").filter(Boolean);
  const raw = segments[segments.length - 1];
  if (!raw) return null;
  try {
    const decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    let s = decoded.trim();
    // Base64 may encode a percent-encoded URL (e.g. https%3A%2F%2F...)
    if ((s.startsWith("http%3A") || s.startsWith("https%3A")) && s.includes("%")) {
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

export function fileTypeTitleFromPath(pathLike: string): string | null {
  const noHash = pathLike.split("#", 1)[0] ?? "";
  const noQuery = noHash.split("?", 1)[0] ?? "";
  const parts = noQuery.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  if (!last) return null;

  const dot = last.lastIndexOf(".");
  if (dot <= 0 || dot === last.length - 1) return null;
  const ext = last.slice(dot + 1).toLowerCase();

  const known = EXTENSION_TITLES[ext];
  if (known) return known;
  if (!/^[a-z0-9]+$/.test(ext)) return null;
  return `${ext.toUpperCase()} file`;
}
