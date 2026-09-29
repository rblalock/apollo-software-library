import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export interface GrayImage { width: number; height: number; data: Uint8Array }

export function readGray(path: string): GrayImage {
  const png = PNG.sync.read(readFileSync(path));
  const data = new Uint8Array(png.width * png.height);
  for (let i = 0; i < data.length; i++) data[i] = png.data[i * 4]!;
  return { width: png.width, height: png.height, data };
}

export function writeGray(path: string, img: GrayImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  for (let i = 0; i < img.data.length; i++) {
    png.data[i * 4] = png.data[i * 4 + 1] = png.data[i * 4 + 2] = img.data[i]!;
    png.data[i * 4 + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}

export function crop(img: GrayImage, x: number, y: number, w: number, h: number): GrayImage {
  const data = new Uint8Array(w * h);
  for (let r = 0; r < h; r++) data.set(img.data.subarray((y + r) * img.width + x, (y + r) * img.width + x + w), r * w);
  return { width: w, height: h, data };
}
