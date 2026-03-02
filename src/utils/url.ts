export function getSiteName(url: string): string {
  const filenameFromPath = (pathLike: string): string | null => {
    const noHash = pathLike.split("#", 1)[0] ?? ""
    const noQuery = noHash.split("?", 1)[0] ?? ""
    const parts = noQuery.split("/").filter(Boolean)
    if (parts.length === 0) return null
    const last = parts[parts.length - 1]
    if (!last) return null

    // "Looks like a file": has a non-leading dot and a short alnum extension.
    const dot = last.lastIndexOf(".")
    if (dot <= 0 || dot === last.length - 1) return null
    const ext = last.slice(dot + 1)
    if (ext.length < 1 || ext.length > 10) return null
    if (!/^[A-Za-z0-9]+$/.test(ext)) return null

    try {
      return decodeURIComponent(last)
    } catch {
      return last
    }
  }

  try {
    const u = new URL(url)
    const file = filenameFromPath(u.pathname)
    if (file) return file
    const h = u.hostname.replace(/^www\./, "")
    return h || "Page"
  } catch {
    return filenameFromPath(url) ?? "Page"
  }
}

/** Normalize host (no www). */
export function host(url: URL): string {
  return url.hostname.replace(/^www\./, "");
}
