/**
 * Dynamic gradient generation that produces combinable, harmonious colors.
 * Uses triadic hue harmony (120° apart) so any generated palette works well together.
 * Layout matches a soft multi-blob look: light blob top-left, light blob top-right, warmer blob bottom.
 */

/** Stable integer hash from string (e.g. URL) for deterministic gradients. */
function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++)
		h = ((h << 5) - h + s.charCodeAt(i)) | 0;
	return h;
}

/**
 * Triadic palette: three hues 120° apart. Always harmonious and good for blending.
 * Returns [h1, h2, h3] in 0–360.
 */
function triadicHues(seed: number): [number, number, number] {
	const base = ((seed % 360) + 360) % 360;
	return [base, (base + 120) % 360, (base + 240) % 360];
}

/**
 * HSL color string. H in 0–360, S and L in 0–100.
 */
function hsl(h: number, s: number, l: number): string {
	return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Soft, light color for "blob" regions (top-left / top-right). Low saturation, high lightness.
 */
function softBlobColor(hue: number, seed: number): string {
	const s = 55 + (seed % 15); // 55–70%
	const l = 82 + (seed % 8);  // 82–90%
	return hsl(hue, s, l);
}

/**
 * Warmer, more saturated color for the bottom blob (like the red in the reference).
 */
function warmBlobColor(hue: number, seed: number): string {
	const s = 70 + (seed % 20); // 70–90%
	const l = 58 + (seed % 12); // 58–70%
	return hsl(hue, s, l);
}

/**
 * Base tint for areas where gradients fade out. Neutral mix of first two hues.
 */
function baseTint(hue1: number, hue2: number, seed: number): string {
	const mix = (seed % 100) / 100;
	const h = hue1 * (1 - mix) + hue2 * mix;
	return hsl(h, 18 + (seed % 10), 90 + (seed % 6));
}

/**
 * Build gradient CSS: multiple radial gradients (soft blobs) over a base tint,
 * similar to the reference image (yellow top-left, blue top-right, red bottom).
 * Colors are derived from URL via triadic harmony so they always combine well.
 */
export function urlToGradientCss(url: string): string {
	const seed = hashString(url);
	const [h1, h2, h3] = triadicHues(seed);
	const s1 = (seed >> 8) & 0xff;
	const s2 = (seed >> 16) & 0xff;

	const base = baseTint(h1, h2, seed);
	const topLeft = softBlobColor(h1, s1);
	const topRight = softBlobColor(h2, s2);
	const bottom = warmBlobColor(h3, seed);

	// Blob positions and sizes tuned for organic overlap (like the reference image)
	// Top-left blob, top-right blob, bottom blob; order so they layer nicely
	const layers = [
		`radial-gradient(ellipse 85% 75% at 18% 22%, ${topLeft}, transparent 65%)`,
		`radial-gradient(ellipse 80% 80% at 82% 25%, ${topRight}, transparent 62%)`,
		`radial-gradient(ellipse 95% 90% at 65% 95%, ${bottom}, transparent 55%)`,
		base,
	].join(", ");

	return layers;
}

/**
 * Dark color suitable for card background with white text (low lightness, decent saturation).
 */
function darkCardColor(hue: number, seed: number, lightnessRange: [number, number]): string {
	const s = 50 + (seed % 35); // 50–85%
	const l = lightnessRange[0] + (seed % (lightnessRange[1] - lightnessRange[0] + 1));
	return hsl(hue, s, l);
}

/**
 * Linear gradient (top to bottom) for no-image cards: one dominant color + secondary,
 * both dark enough for good contrast with white text.
 */
export function urlToCardBackgroundGradientCss(url: string): string {
	const seed = hashString(url);
	const [h1, h2] = triadicHues(seed);
	const s1 = (seed >> 8) & 0xff;
	const s2 = (seed >> 16) & 0xff;
	// Dominant color: darker (covers most of the card)
	const dominant = darkCardColor(h1, s1, [28, 38]);
	// Secondary: slightly different hue, similar darkness for smooth gradient
	const secondary = darkCardColor(h2, s2, [22, 32]);
	return `linear-gradient(to bottom, ${dominant} 0%, ${dominant} 55%, ${secondary} 100%)`;
}
