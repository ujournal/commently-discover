/** Fallback when library returns failed-fetch. */
export async function unfurlFallback(
	url: string,
	options?: { acceptLanguage?: string | null },
): Promise<{
	title?: string;
	description?: string;
	image?: string;
	favicon?: string;
} | null> {
	try {
		const headers: Record<string, string> = {
			"User-Agent": "Commently-Bot/1.0 (+https://commently.top)",
		};
		if (options?.acceptLanguage?.trim()) {
			headers["Accept-Language"] = options.acceptLanguage.trim();
		}
		const res = await fetch(url, {
			redirect: "follow",
			headers,
		});
		if (!res.ok) return null;
		const html = await res.text();
		const base = new URL(url).origin;

		const getMeta = (names: string[]): string | undefined => {
			for (const name of names) {
				const re = new RegExp(
					`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']|` +
						`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
					"i",
				);
				const m = html.match(re);
				const v = m ? (m[1] ?? m[2])?.trim() : undefined;
				if (v) return v;
			}
			return undefined;
		};

		let title = getMeta(["og:title", "twitter:title"]);
		if (!title) {
			const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
			title = t ? t[1].replace(/<[^>]+>/g, "").trim() : undefined;
		}
		const description = getMeta([
			"og:description",
			"twitter:description",
			"description",
		]);
		let image = getMeta(["og:image", "twitter:image"]);
		if (image?.startsWith("/")) image = base + image;

		let favicon: string | undefined;
		const fav =
			html.match(
				/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
			) ??
			html.match(
				/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
			);
		if (fav) {
			favicon = fav[1].trim();
			if (favicon.startsWith("/")) favicon = base + favicon;
		}

		return { title, description, image, favicon };
	} catch {
		return null;
	}
}
