import {
	fileTypeTitleFromPath,
	getDecodedFilenameFromUrl,
	getPathForFileDetection,
	host,
} from "./url";

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
		const pathForFile = getPathForFileDetection(u);
		const fileTitle = fileTypeTitleFromPath(pathForFile);
		// When URL points to a file (path or hash), use decoded filename as title
		const title =
			(fileTitle ? getDecodedFilenameFromUrl(u) : null) ??
			fileTitle ??
			siteName;
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
