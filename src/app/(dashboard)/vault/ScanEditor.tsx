"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Check,
  Loader2,
  RotateCcw,
  RotateCw,
  Crop,
  Palette,
  Maximize2,
  Wand2,
} from "lucide-react";
import type { ScanDraftPage } from "./VaultClient";

// ===========================================================================
// Types
// ===========================================================================

type Point = { x: number; y: number };
type FilterMode = "original" | "auto" | "magic" | "grayscale" | "bw";
type Tab = "crop" | "filter" | "rotate";

export type ScanEditorSavePayload = {
  pageId: string;
  newFile: File;
  isTextEnhanced: boolean;
  fallbackFile: File | null;
};

type Props = {
  page: ScanDraftPage;
  onSave: (payload: ScanEditorSavePayload) => void;
  onClose: () => void;
};

// ===========================================================================
// Canvas I/O helpers — binary only, no base64 round-trips
// ===========================================================================

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
  quality = 0.9,
): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed."))),
      "image/jpeg",
      quality,
    );
  });
  canvas.width = 1;
  canvas.height = 1;
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

function releaseCanvas(c: HTMLCanvasElement) {
  c.width = 1;
  c.height = 1;
}

// ===========================================================================
// Auto document-edge detection — seeds the initial quad
// ===========================================================================

function detectDocumentQuad(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
): Point[] | null {
  const BORDER = Math.max(10, Math.round(Math.min(width, height) * 0.03));
  const samples: number[] = [];
  for (let x = 0; x < width; x += 4) {
    for (let d = 0; d < BORDER; d++) {
      samples.push(gray[d * width + x]);
      samples.push(gray[(height - 1 - d) * width + x]);
    }
  }
  for (let y = 0; y < height; y += 4) {
    for (let d = 0; d < BORDER; d++) {
      samples.push(gray[y * width + d]);
      samples.push(gray[y * width + (width - 1 - d)]);
    }
  }
  samples.sort((a, b) => a - b);
  const bg = samples[Math.floor(samples.length / 2)] ?? 240;

  const BG_T = 26;
  const step = 2;
  let minX = width, minY = height, maxX = -1, maxY = -1, hits = 0;
  for (let y = BORDER; y < height - BORDER; y += step) {
    for (let x = BORDER; x < width - BORDER; x += step) {
      if (Math.abs(gray[y * width + x] - bg) <= BG_T) continue;
      hits++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (hits < 80 || maxX <= minX || maxY <= minY) return null;
  const area = (maxX - minX) * (maxY - minY);
  if (area < width * height * 0.1 || area > width * height * 0.98) return null;

  const pad = Math.round(Math.min(width, height) * 0.015);
  const x0 = Math.max(0, minX - pad);
  const y0 = Math.max(0, minY - pad);
  const x1 = Math.min(width - 1, maxX + pad);
  const y1 = Math.min(height - 1, maxY + pad);
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
}

// ===========================================================================
// Perspective warp — 8-DOF homography, bilinear sampling
// ===========================================================================

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

function computeHomography(src: Point[], dst: Point[]): number[] {
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

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function estimateOutputSize(quad: Point[]): { width: number; height: number } {
  const top = dist(quad[0], quad[1]);
  const bottom = dist(quad[3], quad[2]);
  const left = dist(quad[0], quad[3]);
  const right = dist(quad[1], quad[2]);
  return {
    width: Math.max(1, Math.round(Math.max(top, bottom))),
    height: Math.max(1, Math.round(Math.max(left, right))),
  };
}

function warpQuadToRect(
  src: HTMLCanvasElement,
  quad: Point[],
): HTMLCanvasElement {
  const { width: outW, height: outH } = estimateOutputSize(quad);
  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ];

  // H maps dst → src (so we can inverse-warp for each output pixel).
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

// ===========================================================================
// Filters
// ===========================================================================

function applyAutoEnhance(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    let v = (g - 128) * 1.55 + 128 + 8;
    if (v > 218) v = 255;
    v = clampByte(v);
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function applyMagicColor(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;

  // Per-channel 1st/99th-percentile stretch removes yellow/blue casts from
  // indoor lighting while preserving document colour.
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    histR[d[i]]++;
    histG[d[i + 1]]++;
    histB[d[i + 2]]++;
  }
  const total = d.length / 4;
  const loCut = total * 0.01;
  const hiCut = total * 0.01;

  const bounds = (hist: Uint32Array): [number, number] => {
    let cum = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) {
      cum += hist[v];
      if (cum >= loCut) { lo = v; break; }
    }
    cum = 0;
    for (let v = 255; v >= 0; v--) {
      cum += hist[v];
      if (cum >= hiCut) { hi = v; break; }
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

function applyGrayscale(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
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
 * Sauvola adaptive threshold — the gold standard for document binarisation.
 * Integral images give O(1) window statistics so the whole image runs in a
 * single pass. Produces clean black text on pure white paper regardless of
 * uneven lighting across the page (the main failure mode of a global threshold).
 */
function applySauvola(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
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
  return out;
}

function applyFilter(src: HTMLCanvasElement, mode: FilterMode): HTMLCanvasElement {
  if (mode === "original") {
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    out.getContext("2d")!.drawImage(src, 0, 0);
    return out;
  }
  if (mode === "auto") return applyAutoEnhance(src);
  if (mode === "magic") return applyMagicColor(src);
  if (mode === "grayscale") return applyGrayscale(src);
  return applySauvola(src);
}

// ===========================================================================
// Component
// ===========================================================================

const FILTER_LABELS: Record<FilterMode, string> = {
  original: "Original",
  auto: "Auto",
  magic: "Magic Color",
  grayscale: "Grayscale",
  bw: "B & W",
};

const FILTER_ORDER: FilterMode[] = ["original", "auto", "magic", "grayscale", "bw"];

export default function ScanEditor({ page, onSave, onClose }: Props) {
  // workingFile = the baseline image we apply filters to (i.e. after any
  // destructive crop or rotate). fallbackFile is what "Original" filter
  // restores back to. isFilterEnhanced is true when current filter ≠ original.
  const [workingFile, setWorkingFile] = useState<File>(page.fallbackFile ?? page.file);
  const [activeFilter, setActiveFilter] = useState<FilterMode>(
    page.isTextEnhanced ? "auto" : "original",
  );
  const [displayedFile, setDisplayedFile] = useState<File>(page.file);

  const [displayUrl, setDisplayUrl] = useState<string>("");
  const displayUrlRef = useRef("");
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);

  const [tab, setTab] = useState<Tab>("crop");
  const [quad, setQuad] = useState<Point[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterThumbs, setFilterThumbs] = useState<Record<FilterMode, string>>({
    original: "",
    auto: "",
    magic: "",
    grayscale: "",
    bw: "",
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageBox, setStageBox] = useState<{ w: number; h: number } | null>(null);

  // ---- Object URL lifecycle for the main displayed image ------------------
  useEffect(() => {
    const url = URL.createObjectURL(displayedFile);
    displayUrlRef.current = url;
    setDisplayUrl(url);
    const el = new Image();
    el.onload = () => setImgDim({ w: el.width, h: el.height });
    el.src = url;
    return () => {
      URL.revokeObjectURL(url);
      if (displayUrlRef.current === url) displayUrlRef.current = "";
    };
  }, [displayedFile]);

  // ---- Stage size tracking ------------------------------------------------
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setStageBox({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab]);

  // ---- Auto-seed the quad the first time we know image dimensions --------
  useEffect(() => {
    if (!imgDim || quad) return;
    let cancelled = false;
    (async () => {
      try {
        const canvas = await fileToCanvas(workingFile);
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gray = new Uint8ClampedArray(canvas.width * canvas.height);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          gray[p] = clampByte(
            data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114,
          );
        }
        const detected = detectDocumentQuad(gray, canvas.width, canvas.height);
        releaseCanvas(canvas);
        if (cancelled) return;
        setQuad(
          detected ?? [
            { x: imgDim.w * 0.05, y: imgDim.h * 0.05 },
            { x: imgDim.w * 0.95, y: imgDim.h * 0.05 },
            { x: imgDim.w * 0.95, y: imgDim.h * 0.95 },
            { x: imgDim.w * 0.05, y: imgDim.h * 0.95 },
          ],
        );
      } catch {
        if (cancelled) return;
        setQuad([
          { x: imgDim.w * 0.05, y: imgDim.h * 0.05 },
          { x: imgDim.w * 0.95, y: imgDim.h * 0.05 },
          { x: imgDim.w * 0.95, y: imgDim.h * 0.95 },
          { x: imgDim.w * 0.05, y: imgDim.h * 0.95 },
        ]);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgDim]);

  // ---- Filter thumbnails (regenerated whenever workingFile changes) -------
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      try {
        const full = await fileToCanvas(workingFile);
        const THUMB_MAX = 180;
        const scale = Math.min(1, THUMB_MAX / Math.max(full.width, full.height));
        const tw = Math.max(1, Math.round(full.width * scale));
        const th = Math.max(1, Math.round(full.height * scale));
        const small = document.createElement("canvas");
        small.width = tw;
        small.height = th;
        small.getContext("2d")!.drawImage(full, 0, 0, tw, th);
        releaseCanvas(full);

        const out: Record<FilterMode, string> = {
          original: "",
          auto: "",
          magic: "",
          grayscale: "",
          bw: "",
        };
        for (const mode of FILTER_ORDER) {
          if (cancelled) return;
          const filtered = applyFilter(small, mode);
          const blob = await new Promise<Blob>((resolve, reject) => {
            filtered.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("thumb"))),
              "image/jpeg",
              0.8,
            );
          });
          releaseCanvas(filtered);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          out[mode] = url;
        }
        releaseCanvas(small);
        if (!cancelled) setFilterThumbs(out);
      } catch {
        // Thumbnails are cosmetic — failure is non-fatal.
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [workingFile]);

  // ---- Display geometry (image letterboxed into the stage) ---------------
  const displayGeom = useMemo(() => {
    if (!imgDim || !stageBox) return null;
    const scale = Math.min(stageBox.w / imgDim.w, stageBox.h / imgDim.h);
    const w = imgDim.w * scale;
    const h = imgDim.h * scale;
    return {
      scale,
      w,
      h,
      offsetX: (stageBox.w - w) / 2,
      offsetY: (stageBox.h - h) / 2,
    };
  }, [imgDim, stageBox]);

  // ---- Quad drag handlers ------------------------------------------------
  const dragIndex = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!quad || !displayGeom || !imgDim) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < 4; i++) {
      const cx = displayGeom.offsetX + quad[i].x * displayGeom.scale;
      const cy = displayGeom.offsetY + quad[i].y * displayGeom.scale;
      const dd = Math.hypot(cx - px, cy - py);
      if (dd < bestDist) { bestDist = dd; best = i; }
    }
    if (bestDist > 40) return;
    dragIndex.current = best;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIndex.current === null || !quad || !displayGeom || !imgDim) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const ix = Math.max(0, Math.min(imgDim.w, (px - displayGeom.offsetX) / displayGeom.scale));
    const iy = Math.max(0, Math.min(imgDim.h, (py - displayGeom.offsetY) / displayGeom.scale));
    const next = quad.slice();
    next[dragIndex.current] = { x: ix, y: iy };
    setQuad(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragIndex.current === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragIndex.current = null;
  };

  // ---- Operation wrapper --------------------------------------------------
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setProcessing(true);
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "Operation failed."); }
    finally { setProcessing(false); }
  };

  // ---- Apply quad crop + perspective warp --------------------------------
  const handleApplyCrop = () =>
    run(async () => {
      if (!quad) return;
      const src = await fileToCanvas(workingFile);
      const warped = warpQuadToRect(src, quad);
      releaseCanvas(src);
      const baselineFile = await canvasToFile(
        warped,
        workingFile.name,
        0.92,
      );
      const filtered = applyFilter(await fileToCanvas(baselineFile), activeFilter);
      const displayed = activeFilter === "original"
        ? baselineFile
        : await canvasToFile(filtered, workingFile.name, 0.92);
      releaseCanvas(filtered);
      setWorkingFile(baselineFile);
      setDisplayedFile(displayed);
      setQuad(null);
      setImgDim(null);
    });

  // ---- Rotate -------------------------------------------------------------
  const handleRotate = (dir: "left" | "right") =>
    run(async () => {
      const src = await fileToCanvas(workingFile);
      const out = document.createElement("canvas");
      out.width = src.height;
      out.height = src.width;
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.translate(out.width / 2, out.height / 2);
      ctx.rotate((dir === "right" ? 90 : -90) * (Math.PI / 180));
      ctx.drawImage(src, -src.width / 2, -src.height / 2);
      releaseCanvas(src);
      const baselineFile = await canvasToFile(out, workingFile.name, 0.92);
      const filtered = applyFilter(await fileToCanvas(baselineFile), activeFilter);
      const displayed = activeFilter === "original"
        ? baselineFile
        : await canvasToFile(filtered, workingFile.name, 0.92);
      releaseCanvas(filtered);
      setWorkingFile(baselineFile);
      setDisplayedFile(displayed);
      setQuad(null);
      setImgDim(null);
    });

  // ---- Apply filter -------------------------------------------------------
  const pickFilter = useCallback((mode: FilterMode) => {
    if (mode === activeFilter) return;
    run(async () => {
      if (mode === "original") {
        setActiveFilter(mode);
        setDisplayedFile(workingFile);
        return;
      }
      const src = await fileToCanvas(workingFile);
      const filtered = applyFilter(src, mode);
      releaseCanvas(src);
      const out = await canvasToFile(filtered, workingFile.name, 0.92);
      setActiveFilter(mode);
      setDisplayedFile(out);
    });
  }, [activeFilter, workingFile]);

  // ---- Reset crop to image edges -----------------------------------------
  const handleResetQuad = () => {
    if (!imgDim) return;
    setQuad([
      { x: 0, y: 0 },
      { x: imgDim.w - 1, y: 0 },
      { x: imgDim.w - 1, y: imgDim.h - 1 },
      { x: 0, y: imgDim.h - 1 },
    ]);
  };

  const handleSave = () => {
    onSave({
      pageId: page.id,
      newFile: displayedFile,
      isTextEnhanced: activeFilter !== "original",
      fallbackFile: activeFilter !== "original" ? workingFile : null,
    });
  };

  // ---- Render -------------------------------------------------------------

  if (!displayUrl || !imgDim) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 size={22} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between bg-black/90 px-4 py-3 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <p className="text-xs font-bold uppercase tracking-wider text-white/80">
          Edit Page
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={processing}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <Check size={14} />
          Done
        </button>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        onPointerDown={tab === "crop" ? onPointerDown : undefined}
        onPointerMove={tab === "crop" ? onPointerMove : undefined}
        onPointerUp={tab === "crop" ? onPointerUp : undefined}
        onPointerCancel={tab === "crop" ? onPointerUp : undefined}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ touchAction: "none" }}
      >
        {/* image */}
        {displayGeom && (
          <img
            src={displayUrl}
            alt="Scan"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: displayGeom.offsetX,
              top: displayGeom.offsetY,
              width: displayGeom.w,
              height: displayGeom.h,
            }}
          />
        )}

        {/* quad overlay (only in CROP tab) */}
        {tab === "crop" && quad && displayGeom && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${stageBox?.w ?? 0} ${stageBox?.h ?? 0}`}
          >
            <defs>
              <linearGradient id="quadStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
            {/* dim outside the quad */}
            <path
              d={`M 0 0 H ${stageBox?.w ?? 0} V ${stageBox?.h ?? 0} H 0 Z M ${quad
                .map(
                  (p) =>
                    `${displayGeom.offsetX + p.x * displayGeom.scale},${
                      displayGeom.offsetY + p.y * displayGeom.scale
                    }`,
                )
                .join(" L ")} Z`}
              fill="rgba(0,0,0,0.55)"
              fillRule="evenodd"
            />
            <polygon
              points={quad
                .map(
                  (p) =>
                    `${displayGeom.offsetX + p.x * displayGeom.scale},${
                      displayGeom.offsetY + p.y * displayGeom.scale
                    }`,
                )
                .join(" ")}
              fill="none"
              stroke="url(#quadStroke)"
              strokeWidth={2.5}
            />
            {quad.map((p, i) => {
              const cx = displayGeom.offsetX + p.x * displayGeom.scale;
              const cy = displayGeom.offsetY + p.y * displayGeom.scale;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r={18} fill="rgba(249,115,22,0.25)" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="#ffffff"
                    stroke="#f97316"
                    strokeWidth={2.5}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {processing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 size={28} className="animate-spin text-orange-400" />
          </div>
        )}
      </div>

      {/* Tab-specific controls */}
      {tab === "crop" && (
        <div className="flex items-center gap-2 bg-black/90 px-3 py-2.5">
          <button
            type="button"
            onClick={handleResetQuad}
            disabled={processing}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
          >
            <Maximize2 size={12} />
            Full page
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={processing || !quad}
            className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            Apply crop
          </button>
        </div>
      )}

      {tab === "filter" && (
        <div className="bg-black/90 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {FILTER_ORDER.map((mode) => {
              const active = activeFilter === mode;
              const thumb = filterThumbs[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => pickFilter(mode)}
                  disabled={processing}
                  className="group flex shrink-0 flex-col items-center gap-1 disabled:opacity-50"
                >
                  <div
                    className={[
                      "h-16 w-16 overflow-hidden rounded-xl border-2 bg-white/10",
                      active ? "border-orange-400" : "border-white/20",
                    ].join(" ")}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={FILTER_LABELS[mode]}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                        …
                      </div>
                    )}
                  </div>
                  <span
                    className={[
                      "text-[10px] font-bold",
                      active ? "text-orange-400" : "text-white/70",
                    ].join(" ")}
                  >
                    {FILTER_LABELS[mode]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "rotate" && (
        <div className="flex items-center gap-2 bg-black/90 px-3 py-3">
          <button
            type="button"
            onClick={() => handleRotate("left")}
            disabled={processing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Rotate left
          </button>
          <button
            type="button"
            onClick={() => handleRotate("right")}
            disabled={processing}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          >
            <RotateCw size={14} />
            Rotate right
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/90 px-4 py-1.5 text-center text-[11px] font-bold text-white">
          {error}
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="flex items-stretch bg-black text-white pb-safe">
        {(
          [
            { id: "crop" as Tab, icon: Crop, label: "Crop" },
            { id: "filter" as Tab, icon: Palette, label: "Filter" },
            { id: "rotate" as Tab, icon: Wand2, label: "Rotate" },
          ]
        ).map(({ id, icon: Icon, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-3",
                active ? "text-orange-400" : "text-white/60",
              ].join(" ")}
            >
              <Icon size={18} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
