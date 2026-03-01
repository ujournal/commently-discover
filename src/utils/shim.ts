import { getSiteName } from "./url"

/** Shim site data when fetch fails: title and site from URL only. */
export function shimSiteData(url: string): { title?: string; description?: string; image?: string; favicon?: string } {
  const siteName = getSiteName(url)
  return { title: siteName, description: undefined, image: undefined, favicon: undefined }
}
