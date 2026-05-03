// =============================================================================
// Document scanner pipeline — shared between the live camera view and the
// post-capture editor. Pure functions, no React, no DOM-mutating side effects.
// =============================================================================

export type Point = { x: number; y: number };
export type FilterMode = "original" | "auto" | "magic" | "grayscale" | "bw";

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

// ---------------------------------------------------------------------------
// Grayscale + downsampled gray buffer (used by every detection path)
// ---------------------------------------------------------------------------

export function imageDataToGray(data: Uint8ClampedArray, length: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(length);
  for (let i = 0, p = 0; p < length; i += 4, p++) {
    out[p] = clampByte(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }
  return out;
}

export function downscaleGray(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  maxSide: number,
): { gray: Uint8ClampedArray; width: number; height: number; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  if (scale >= 1) return { gray: src, width: sw, height: sh, scale: 1 };
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const out = new Uint8ClampedArray(dw * dh);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy = Math.floor(y * yRatio);
    for (let x = 0; x < dw; x++) {
      const sx = Math.floor(x * xRatio);
      out[y * dw + x] = src[sy * sw + sx];
    }
  }
  return { gray: out, width: dw, height: dh, scale };
}

// ---------------------------------------------------------------------------
// Document-quad detection
//
// We assume the page is brighter than the background (the common case once a
// phone is held over paper indoors). Algorithm:
//   1. Sample the image border to estimate the background brightness.
//   2. Build a binary mask of pixels that differ from the background.
//   3. From the mask centroid, scan along ~32 radii outward and record the
//      furthest "on" pixel along each ray.
//   4. Group the radial extremes into four quadrants (TL/TR/BR/BL) and pick
//      the most extreme point in each — that's the corner.
//
// This is more robust than a simple bbox: it tracks actual page corners even
// when the page is rotated 10–30° in the frame.
// ---------------------------------------------------------------------------

export function detectDocumentQuad(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Point[] | null {
  if (width < 32 || height < 32) return null;

  // 1. Estimate background brightness from a thin border strip.
  const BORDER = Math.max(6, Math.round(Math.min(width, height) * 0.025));
  const samples: number[] = [];
  for (let x = 0; x < width; x += 3) {
    for (let d = 0; d < BORDER; d++) {
      samples.push(gray[d * width + x]);
      samples.push(gray[(height - 1 - d) * width + x]);
    }
  }
  for (let y = 0; y < height; y += 3) {
    for (let d = 0; d < BORDER; d++) {
      samples.push(gray[y * width + d]);
      samples.push(gray[y * width + (width - 1 - d)]);
    }
  }
  samples.sort((a, b) => a - b);
  const bg = samples[Math.floor(samples.length / 2)] ?? 240;

  // 2. Build the mask + compute centroid of foreground pixels.
  // Adaptive threshold: 14 if the contrast is low, scaled with overall variance.
  const T = Math.max(14, Math.min(40, Math.round(samples[Math.floor(samples.length * 0.95)] - samples[Math.floor(samples.length * 0.05)]) * 0.6));

  let cx = 0, cy = 0, hits = 0;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = gray[y * width + x];
      if (Math.abs(v - bg) > T) {
        mask[y * width + x] = 1;
        cx += x;
        cy += y;
        hits++;
      }
    }
  }
  if (hits < width * height * 0.08) return null;
  cx /= hits;
  cy /= hits;

  // 3. Radial scan from the centroid. For each direction, walk outward until
  // we leave the foreground; record the last "on" pixel as a boundary point.
  const RAYS = 96;
  const boundary: Point[] = [];
  for (let r = 0; r < RAYS; r++) {
    const a = (r / RAYS) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let lastX = -1, lastY = -1;
    const maxSteps = Math.ceil(Math.hypot(width, height));
    for (let s = 0; s < maxSteps; s++) {
      const x = Math.round(cx + dx * s);
      const y = Math.round(cy + dy * s);
      if (x < 0 || y < 0 || x >= width || y >= height) break;
      if (mask[y * width + x]) {
        lastX = x;
        lastY = y;
      }
    }
    if (lastX >= 0) boundary.push({ x: lastX, y: lastY });
  }
  if (boundary.length < 16) return null;

  // 4. For each corner quadrant relative to the centroid, find the boundary
  // point that maximises distance from the centroid — i.e. the page corner.
  const corners: Point[] = [
    { x: cx, y: cy },
    { x: cx, y: cy },
    { x: cx, y: cy },
    { x: cx, y: cy },
  ];
  const cornerScore = [-1, -1, -1, -1];
  for (const p of boundary) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    // Score = projection along the diagonal of the corresponding quadrant.
    // TL: -dx - dy, TR: +dx - dy, BR: +dx + dy, BL: -dx + dy.
    const scores = [-dx - dy, dx - dy, dx + dy, -dx + dy];
    for (let i = 0; i < 4; i++) {
      if (scores[i] > cornerScore[i]) {
        cornerScore[i] = scores[i];
        corners[i] = p;
      }
    }
  }

  // Sanity: quad area must cover a meaningful chunk of the frame.
  const area = quadArea(corners);
  if (area < width * height * 0.12 || area > width * height * 0.995) return null;

  // Reject pathological quads (one side collapsed to nothing).
  const minSide = Math.min(
    dist(corners[0], corners[1]),
    dist(corners[1], corners[2]),
    dist(corners[2], corners[3]),
    dist(corners[3], corners[0]),
  );
  if (minSide < Math.min(width, height) * 0.15) return null;

  return corners;
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function quadArea(q: Point[]): number {
  // Shoelace for 4 points.
  return Math.abs(
    (q[0].x * q[1].y - q[1].x * q[0].y) +
    (q[1].x * q[2].y - q[2].x * q[1].y) +
    (q[2].x * q[3].y - q[3].x * q[2].y) +
    (q[3].x * q[0].y - q[0].x * q[3].y),
  ) / 2;
}

export function quadIsStable(a: Point[], b: Point[], tolerance: number): boolean {
  for (let i = 0; i < 4; i++) {
    if (dist(a[i], b[i]) > tolerance) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Homography + perspective warp
// ---------------------------------------------------------------------------

function solveLinearSystem(matrix: number[][], b: number[]): number[] {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (pivot !== col) [a[col], a[pivot]] = [a[pivot], a[col]];
    const diag = a[col][col];
    if (Math.abs(diag) < 1e-10) throw new Error("Singular matrix.");
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col] / diag;
      for (let c = col; c <= n; c++) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

export function computeHomography(src: Point[], dst: Point[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    b.push(Y);
  }
  const h = solveLinearSystem(A, b);
  return [...h, 1];
}

export function estimateOutputSize(quad: Point[]): { width: number; height: number } {
  const top = dist(quad[0], quad[1]);
  const bottom = dist(quad[3], quad[2]);
  const left = dist(quad[0], quad[3]);
  const right = dist(quad[1], quad[2]);
  return {
    width: Math.max(1, Math.round(Math.max(top, bottom))),
    height: Math.max(1, Math.round(Math.max(left, right))),
  };
}

export function warpQuadToRect(src: HTMLCanvasElement, quad: Point[]): HTMLCanvasElement {
  const { width: outW, height: outH } = estimateOutputSize(quad);
  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  const H = computeHomography(dst, quad);
  const srcCtx = src.getContext("2d", { willReadFrequently: true })!;
  const srcData = srcCtx.getImageData(0, 0, src.width, src.height).data;
  const sw = src.width, sh = src.height;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d")!;
  const outImg = outCtx.createImageData(outW, outH);
  const od = outImg.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = H[6] * x + H[7] * y + H[8];
      const sx = (H[0] * x + H[1] * y + H[2]) / w;
      const sy = (H[3] * x + H[4] * y + H[5]) / w;
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(sh - 1, Math.floor(sy)));
      const x1 = Math.min(sw - 1, x0 + 1);
      const y1 = Math.min(sh - 1, y0 + 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i01 = (y0 * sw + x1) * 4;
      const i10 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      const ti = (y * outW + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v =
          (srcData[i00 + c] * (1 - fx) + srcData[i01 + c] * fx) * (1 - fy) +
          (srcData[i10 + c] * (1 - fx) + srcData[i11 + c] * fx) * fy;
        od[ti + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      od[ti + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Illumination flattening — removes shadows + uneven lighting before any
// thresholding step. Computes a large-radius box blur (the "background"
// brightness map) and divides each pixel by it, normalised to 255.
//
// Equivalent to the "background subtraction" step every modern scanner
// app uses to make the page look uniformly lit before binarisation.
// ---------------------------------------------------------------------------

function boxBlurGray(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  // Horizontal pass with integral row.
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < radius; x++) sum += src[y * w + x];
    for (let x = 0; x < w; x++) {
      const xRight = Math.min(w - 1, x + radius);
      const xLeft = x - radius - 1;
      if (xRight < w) sum += src[y * w + xRight];
      if (xLeft >= 0) sum -= src[y * w + xLeft];
      const count = Math.min(w - 1, x + radius) - Math.max(0, x - radius) + 1;
      tmp[y * w + x] = sum / count;
    }
  }

  // Vertical pass.
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y < radius; y++) sum += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const yBot = Math.min(h - 1, y + radius);
      const yTop = y - radius - 1;
      if (yBot < h) sum += tmp[yBot * w + x];
      if (yTop >= 0) sum -= tmp[yTop * w + x];
      const count = Math.min(h - 1, y + radius) - Math.max(0, y - radius) + 1;
      out[y * w + x] = sum / count;
    }
  }

  return out;
}

/**
 * Subtractive illumination flattening. Each pixel is shifted by `ref - bg`
 * where `bg` is the local low-frequency mean and `ref` is the well-lit
 * reference (~95th-percentile of the background). The shift is capped so a
 * glowing region in the frame (laptop screen, window) doesn't drag everything
 * else into clipping.
 *
 * Used as a pre-pass for B&W binarisation only; do NOT call this from the
 * colour-preserving Auto / Magic filters — divisive correction crushes
 * highlights and produces the "white blowout" look on photos that contain
 * naturally bright objects.
 */
export function flattenIllumination(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const radius = Math.max(8, Math.round(Math.min(w, h) / 10));
  const MAX_SHIFT = 55;

  const channels: Float32Array[] = [
    new Float32Array(w * h),
    new Float32Array(w * h),
    new Float32Array(w * h),
  ];
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    channels[0][p] = d[i];
    channels[1][p] = d[i + 1];
    channels[2][p] = d[i + 2];
  }

  for (let c = 0; c < 3; c++) {
    const bg = boxBlurGray(channels[c], w, h, radius);

    // Reference brightness = 90th percentile of the background, sampled.
    // A full sort on every pixel would be wasteful at high res; sample stride.
    const stride = Math.max(1, Math.floor((w * h) / 4096));
    const sample: number[] = [];
    for (let p = 0; p < w * h; p += stride) sample.push(bg[p]);
    sample.sort((a, b) => a - b);
    const ref = sample[Math.floor(sample.length * 0.9)] ?? 220;

    for (let p = 0; p < w * h; p++) {
      const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, ref - bg[p]));
      d[p * 4 + c] = clampByte(channels[c][p] + shift);
    }
  }

  ctx.putImageData(img, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function copyCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  out.getContext("2d")!.drawImage(src, 0, 0);
  return out;
}

export function applyAutoEnhance(src: HTMLCanvasElement): HTMLCanvasElement {
  // Gentle contrast + slight brightness lift. No illumination flattening —
  // for colour photos that crushes highlights and produces a washed-out look.
  const out = copyCanvas(src);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clampByte((d[i] - 128) * 1.18 + 128 + 4);
    d[i + 1] = clampByte((d[i + 1] - 128) * 1.18 + 128 + 4);
    d[i + 2] = clampByte((d[i + 2] - 128) * 1.18 + 128 + 4);
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function applyMagicColor(src: HTMLCanvasElement): HTMLCanvasElement {
  // Per-channel percentile stretch. Removes warm/cool casts from indoor
  // lighting while preserving original colour.
  const out = copyCanvas(src);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;

  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    histR[d[i]]++;
    histG[d[i + 1]]++;
    histB[d[i + 2]]++;
  }
  const total = d.length / 4;
  const cut = total * 0.01;

  const bounds = (hist: Uint32Array): [number, number] => {
    let cum = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) {
      cum += hist[v];
      if (cum >= cut) { lo = v; break; }
    }
    cum = 0;
    for (let v = 255; v >= 0; v--) {
      cum += hist[v];
      if (cum >= cut) { hi = v; break; }
    }
    return [lo, Math.max(hi, lo + 1)];
  };

  const [rLo, rHi] = bounds(histR);
  const [gLo, gHi] = bounds(histG);
  const [bLo, bHi] = bounds(histB);

  for (let i = 0; i < d.length; i += 4) {
    d[i] = clampByte(((d[i] - rLo) * 255) / (rHi - rLo));
    d[i + 1] = clampByte(((d[i + 1] - gLo) * 255) / (gHi - gLo));
    d[i + 2] = clampByte(((d[i + 2] - bLo) * 255) / (bHi - bLo));
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function applyGrayscale(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = copyCanvas(src);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = clampByte(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/**
 * Sauvola adaptive threshold over an illumination-flattened source.
 * Produces clean black text on pure white paper regardless of uneven lighting.
 */
export function applySauvola(src: HTMLCanvasElement): HTMLCanvasElement {
  const flat = flattenIllumination(src);
  const w = flat.width, h = flat.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(flat, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  }

  const iw = w + 1;
  const ii = new Float64Array(iw * (h + 1));
  const ii2 = new Float64Array(iw * (h + 1));
  for (let y = 1; y <= h; y++) {
    let rowSum = 0, rowSum2 = 0;
    for (let x = 1; x <= w; x++) {
      const v = gray[(y - 1) * w + (x - 1)];
      rowSum += v;
      rowSum2 += v * v;
      const idx = y * iw + x;
      const up = (y - 1) * iw + x;
      ii[idx] = ii[up] + rowSum;
      ii2[idx] = ii2[up] + rowSum2;
    }
  }

  const R = Math.max(7, Math.round(Math.min(w, h) / 32));
  const k = 0.34;
  const dynamicRange = 128;

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - R);
    const y1 = Math.min(h, y + R + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - R);
      const x1 = Math.min(w, x + R + 1);
      const n = (x1 - x0) * (y1 - y0);
      const s = ii[y1 * iw + x1] - ii[y0 * iw + x1] - ii[y1 * iw + x0] + ii[y0 * iw + x0];
      const s2 = ii2[y1 * iw + x1] - ii2[y0 * iw + x1] - ii2[y1 * iw + x0] + ii2[y0 * iw + x0];
      const mean = s / n;
      const variance = Math.max(0, s2 / n - mean * mean);
      const std = Math.sqrt(variance);
      const t = mean * (1 + k * (std / dynamicRange - 1));
      const v = gray[y * w + x] > t ? 255 : 0;
      const ti = (y * w + x) * 4;
      d[ti] = d[ti + 1] = d[ti + 2] = v;
      d[ti + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // The flat canvas is no longer needed.
  flat.width = 1;
  flat.height = 1;
  return out;
}

export function applyFilter(src: HTMLCanvasElement, mode: FilterMode): HTMLCanvasElement {
  if (mode === "original") return copyCanvas(src);
  if (mode === "auto") return applyAutoEnhance(src);
  if (mode === "magic") return applyMagicColor(src);
  if (mode === "grayscale") return applyGrayscale(src);
  return applySauvola(src);
}
