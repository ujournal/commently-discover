/**
 * Minimal typings for createImageBitmap + OffscreenCanvas used in the Worker
 * (tsconfig lib is es2024 only; runtime provides these in Cloudflare Workers).
 */
interface ImageBitmap {
	readonly width: number;
	readonly height: number;
	close(): void;
}

declare function createImageBitmap(
	image: Blob | ArrayBuffer | ImageBitmap,
): Promise<ImageBitmap>;

declare class OffscreenCanvas {
	constructor(width: number, height: number);
	getContext(contextId: "2d"): OffscreenCanvasRenderingContext2D | null;
	convertToBlob(options?: {
		type?: string;
		quality?: number;
	}): Promise<Blob>;
}

interface OffscreenCanvasRenderingContext2D {
	drawImage(
		image: ImageBitmap,
		dx: number,
		dy: number,
		dWidth: number,
		dHeight: number,
	): void;
}
