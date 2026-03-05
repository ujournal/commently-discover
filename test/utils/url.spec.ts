import { describe, it, expect } from "vitest";
import {
	fileTypeTitleFromPath,
	getDecodedFilenameFromUrl,
	getPathForFileDetection,
} from "../../src/utils/url";

describe("fileTypeTitleFromPath", () => {
	it("decodes percent-encoded filename and returns extension title", () => {
		// Path like getPathForFileDetection(url): pathname + hash (no #). Encoded Cyrillic filename.
		const pathLike =
			"/wiki/Page/media/%D0%A4%D0%B0%D0%B9%D0%BB:%D0%90%D0%BD%D1%81%D0%B0%D0%BC%D0%B1%D0%BB%D1%8C_%D0%A3%D1%81%D0%BF%D0%B5%D0%BD%D1%81%D1%8C%D0%BA%D0%BE%D1%97_%D1%86%D0%B5%D1%80%D0%BA%D0%B2%D0%B8_%D0%9B%D1%8C%D0%B2%D1%96%D0%B2_01.jpg";
		expect(fileTypeTitleFromPath(pathLike)).toBe("Image file");
	});

	it("returns extension title for plain path", () => {
		expect(fileTypeTitleFromPath("/path/to/document.pdf")).toBe("PDF file");
		expect(fileTypeTitleFromPath("/image.png")).toBe("Image file");
	});

	it("returns null when no extension", () => {
		expect(fileTypeTitleFromPath("/wiki/Page")).toBeNull();
	});
});

describe("getPathForFileDetection", () => {
	it("appends hash when hash starts with / (e.g. Wikipedia media)", () => {
		const url = new URL(
			"https://uk.wikipedia.org/wiki/%D0%9B%D1%8C%D0%B2%D1%96%D0%B2#/media/%D0%A4%D0%B0%D0%B9%D0%BB:image.jpg",
		);
		const path = getPathForFileDetection(url);
		expect(path).toContain("/media/");
		expect(path).toContain("%D0%A4%D0%B0%D0%B9%D0%BB");
	});

	it("returns only pathname when hash is empty or does not start with /", () => {
		const url = new URL("https://example.com/path/to/file.pdf#section");
		expect(getPathForFileDetection(url)).toBe("/path/to/file.pdf");
	});
});

describe("getDecodedFilenameFromUrl", () => {
	it("returns decoded filename from hash path (Wikipedia-style media URL)", () => {
		const url = new URL(
			"https://uk.wikipedia.org/wiki/X#/media/%D0%A4%D0%B0%D0%B9%D0%BB:%D0%90%D0%BD%D1%81%D0%B0%D0%BC%D0%B1%D0%BB%D1%8C_01.jpg",
		);
		expect(getDecodedFilenameFromUrl(url)).toBe("Файл:Ансамбль_01.jpg");
	});

	it("returns decoded last segment from pathname when no hash", () => {
		const url = new URL(
			"https://example.com/path/%D0%A4%D0%B0%D0%B9%D0%BB.pdf",
		);
		expect(getDecodedFilenameFromUrl(url)).toBe("Файл.pdf");
	});
});
