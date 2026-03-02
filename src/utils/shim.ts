import { host, fileTypeTitleFromPath } from "./url";

/** Shim site data when fetch fails: title and site from URL only. */
export function shimSiteData(url: string): {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
} {
  try {
    const u = new URL(url);
    const siteName = host(u);
    const title = fileTypeTitleFromPath(u.pathname) ?? siteName;
    return {
      title,
      description: undefined,
      image: undefined,
      favicon: undefined,
    };
  } catch {
    return {
      title: "Page",
      description: undefined,
      image: undefined,
      favicon: undefined,
    };
  }
}
