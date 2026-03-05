/** "View in {platform}" translations by language code. English is fallback. */
const VIEW_IN_PLATFORM: Record<string, string> = {
	en: "View in {0}",
	uk: "Дивитися в {0}",
	ru: "Смотреть в {0}",
	de: "Ansehen in {0}",
	fr: "Voir sur {0}",
	es: "Ver en {0}",
	pt: "Ver em {0}",
	it: "Visualizza in {0}",
	pl: "Zobacz w {0}",
	zh: "在 {0} 中查看",
	ja: "{0}で見る",
	ko: "{0}에서 보기",
	ar: "عرض في {0}",
	hi: "{0} में देखें",
	tr: "{0} içinde görüntüle",
	vi: "Xem trên {0}",
	th: "ดูใน {0}",
	id: "Lihat di {0}",
	nl: "Bekijken in {0}",
	sv: "Visa i {0}",
	cs: "Zobrazit v {0}",
	hu: "Megtekintés itt: {0}",
	ro: "Vizualizează în {0}",
};

/** Parse Accept-Language and return the first supported locale (e.g. "en", "uk"), or "en". */
export function getPreferredLocale(acceptLanguage: string | null): string {
	if (!acceptLanguage?.trim()) return "en";
	const supported = new Set(Object.keys(VIEW_IN_PLATFORM));
	const parts = acceptLanguage.split(",").map((p) => {
		const [locale, q] = p.trim().split(";q=");
		const lang = (locale || "").split("-")[0].toLowerCase();
		const quality = q ? parseFloat(q) : 1;
		return { lang, full: lang, quality };
	});
	parts.sort((a, b) => b.quality - a.quality);
	for (const { lang } of parts) {
		if (supported.has(lang)) return lang;
	}
	return "en";
}

/** Return translated "View in {platformName}" for the given locale; fallback to English. */
export function getViewInPlatformLabel(
	acceptLanguage: string | null,
	platformName: string,
): string {
	const locale = getPreferredLocale(acceptLanguage);
	const template = VIEW_IN_PLATFORM[locale] ?? VIEW_IN_PLATFORM.en;
	return template.replace("{0}", platformName);
}
