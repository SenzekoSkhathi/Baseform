"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import type { ScanDraftPage } from "./VaultClient";

// ---------------------------------------------------------------------------
// Pure canvas helpers — no base64, no imageCompression between operations
// ---------------------------------------------------------------------------

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Load a File into a canvas using a temporary ObjectURL.
 * The URL is revoked immediately once the image has decoded — it is never
 * stored or returned, so there is no dangling handle.
 */
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
    if (!ctx) throw new Error("Canvas context unavailable.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Encode a canvas to a File using toBlob (binary — not base64, so no 33 %
 * overhead). The canvas backing store is released immediately after encoding.
 */
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

function detectDocumentBounds(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
) {
  // ── Background estimation ────────────────────────────────────────────────
  // Sample the outermost 12-px border strip on all 4 sides and take the
  // median.  A corner-average fails on dark or coloured table surfaces;
  // the median is robust to document corners that overlap the border strip.
  const BORDER = Math.max(12, Math.round(Math.min(width, height) * 0.03));
  const bgSamples: number[] = [];
  const bStep = 3;
  for (let x = 0; x < width; x += bStep) {
    for (let d = 0; d < BORDER; d++) {
      bgSamples.push(gray[d * width + x]);
      bgSamples.push(gray[(height - 1 - d) * width + x]);
    }
  }
  for (let y = 0; y < height; y += bStep) {
    for (let d = 0; d < BORDER; d++) {
      bgSamples.push(gray[y * width + d]);
      bgSamples.push(gray[y * width + (width - 1 - d)]);
    }
  }
  bgSamples.sort((a, b) => a - b);
  const bg = bgSamples[Math.floor(bgSamples.length / 2)] ?? 240;

  // ── Sobel gradient (2-px step for speed) ────────────────────────────────
  const SS = 2; // sobel stride
  const sw = Math.ceil(width / SS);
  const sh = Math.ceil(height / SS);
  const grad = new Float32Array(sw * sh);
  const px = (x: number, y: number) =>
    gray[
      Math.min(height - 1, Math.max(0, y)) * width +
        Math.min(width - 1, Math.max(0, x))
    ];
  for (let sy = 1; sy < sh - 1; sy++) {
    for (let sx = 1; sx < sw - 1; sx++) {
      const x = sx * SS, y = sy * SS;
      const gx =
        -px(x - SS, y - SS) + px(x + SS, y - SS) -
        2 * px(x - SS, y)   + 2 * px(x + SS, y) -
        px(x - SS, y + SS)  + px(x + SS, y + SS);
      const gy =
        -px(x - SS, y - SS) - 2 * px(x, y - SS) - px(x + SS, y - SS) +
         px(x - SS, y + SS) + 2 * px(x, y + SS) + px(x + SS, y + SS);
      grad[sy * sw + sx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // ── Bounding box ─────────────────────────────────────────────────────────
  // A pixel counts as "document content" if it differs from bg OR sits on a
  // strong edge (Sobel ≥ 22).  Using both signals handles: pale text on white
  // paper (low gradient, high bg-diff) and document edges against a
  // same-brightness background (high gradient, low bg-diff).
  const BG_T = 28;   // background-difference threshold
  const GRAD_T = 22; // gradient magnitude threshold
  const step = 2;
  let minX = width, minY = height, maxX = -1, maxY = -1, hits = 0;

  for (let y = BORDER; y < height - BORDER; y += step) {
    for (let x = BORDER; x < width - BORDER; x += step) {
      const sy = Math.round(y / SS), sx = Math.round(x / SS);
      const g = grad[Math.min(sh - 1, sy) * sw + Math.min(sw - 1, sx)] ?? 0;
      if (Math.abs(gray[y * width + x] - bg) <= BG_T && g <= GRAD_T) continue;
      hits++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (hits < 60 || maxX <= minX || maxY <= minY)
    return { x: 0, y: 0, width, height };

  const dw = maxX - minX + 1, dh = maxY - minY + 1;
  const area = dw * dh;
  if (area < width * height * 0.12 || area > width * height * 0.98)
    return { x: 0, y: 0, width, height };

  const pad = Math.max(14, Math.round(Math.min(width, height) * 0.025));
  const rx = Math.max(0, minX - pad), ry = Math.max(0, minY - pad);
  return {
    x: rx,
    y: ry,
    width: Math.min(width - rx, dw + pad * 2),
    height: Math.min(height - ry, dh + pad * 2),
  };
}

function applyPerspective(
  src: HTMLCanvasElement,
  p: number,
): HTMLCanvasElement {
  if (Math.abs(p) < 0.001) return src;
  const { width: w, height: h } = src;
  const srcCtx = src.getContext("2d", { willReadFrequently: true })!;
  const { data: input } = srcCtx.getImageData(0, 0, w, h);

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d", { willReadFrequently: true })!;
  const outImg = outCtx.createImageData(w, h);
  const output = outImg.data;

  const inset = Math.round(w * 0.22 * Math.min(1, Math.abs(p)));
  const topInset = p > 0 ? inset : 0;
  const botInset = p < 0 ? inset : 0;

  const sample = (x: number, y: number, ch: number) => {
    const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
    const x1 = Math.min(w - 1, x0 + 1),
      y1 = Math.min(h - 1, y0 + 1);
    const fx = x - x0,
      fy = y - y0;
    const i = (r: number, c: number) => (r * w + c) * 4 + ch;
    return (
      (input[i(y0, x0)] * (1 - fx) + input[i(y0, x1)] * fx) * (1 - fy) +
      (input[i(y1, x0)] * (1 - fx) + input[i(y1, x1)] * fx) * fy
    );
  };

  for (let y = 0; y < h; y++) {
    const t = h <= 1 ? 0 : y / (h - 1);
    const left = topInset * (1 - t) + botInset * t;
    const right = (w - 1 - topInset) * (1 - t) + (w - 1 - botInset) * t;
    const span = Math.max(1, right - left);
    for (let x = 0; x < w; x++) {
      const sx = left + (w <= 1 ? 0 : x / (w - 1)) * span;
      const ti = (y * w + x) * 4;
      output[ti] = clampByte(sample(sx, y, 0));
      output[ti + 1] = clampByte(sample(sx, y, 1));
      output[ti + 2] = clampByte(sample(sx, y, 2));
      output[ti + 3] = 255;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScanEditor({ page, onSave, onClose }: Props) {
  // All image state is kept as File objects — never serialised to base64.
  const [workingFile, setWorkingFileState] = useState<File>(page.file);
  const [fallbackFile, setFallbackFileState] = useState<File | null>(
    page.fallbackFile,
  );
  const [isTextEnhanced, setIsTextEnhanced] = useState(page.isTextEnhanced);

  // ObjectURLs for display only — never passed to sessionStorage.
  // We keep refs so we can revoke them without needing state.
  const displayUrlRef = useRef<string>("");
  const fallbackUrlRef = useRef<string>("");
  const [displayUrl, setDisplayUrl] = useState<string>("");
  const [fallbackUrl, setFallbackUrl] = useState<string>("");

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  // Crop / perspective state
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropAreaPx, setCropAreaPx] = useState<Area | null>(null);
  const [perspectiveVal, setPerspectiveVal] = useState(0);
  // undefined = free aspect ratio
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);

  // Create initial ObjectURLs after mount and clean up on unmount.
  useEffect(() => {
    const url = URL.createObjectURL(page.file);
    displayUrlRef.current = url;
    setDisplayUrl(url);

    if (page.fallbackFile) {
      const fbUrl = URL.createObjectURL(page.fallbackFile);
      fallbackUrlRef.current = fbUrl;
      setFallbackUrl(fbUrl);
    }

    return () => {
      if (displayUrlRef.current) URL.revokeObjectURL(displayUrlRef.current);
      if (fallbackUrlRef.current) URL.revokeObjectURL(fallbackUrlRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Revoke a URL after the next two animation frames so the browser has
   * definitely finished rendering with it before we invalidate it.
   */
  function deferRevoke(url: string) {
    if (!url) return;
    requestAnimationFrame(() => requestAnimationFrame(() => URL.revokeObjectURL(url)));
  }

  /** Replace the working image. Creates a new ObjectURL, defers revocation of old. */
  function setWorking(file: File) {
    const old = displayUrlRef.current;
    const url = URL.createObjectURL(file);
    displayUrlRef.current = url;
    setDisplayUrl(url);
    setWorkingFileState(file);
    deferRevoke(old);
  }

  /** Set a new fallback (for enhance undo). */
  function setFallback(file: File) {
    const old = fallbackUrlRef.current;
    const url = URL.createObjectURL(file);
    fallbackUrlRef.current = url;
    setFallbackUrl(url);
    setFallbackFileState(file);
    if (old) deferRevoke(old);
  }

  /** Clear the fallback (after rotate / crop clears undo history). */
  function clearFallback() {
    if (fallbackUrlRef.current) {
      deferRevoke(fallbackUrlRef.current);
      fallbackUrlRef.current = "";
    }
    setFallbackUrl("");
    setFallbackFileState(null);
  }

  function resetCropState() {
    setCropPos({ x: 0, y: 0 });
    setCropZoom(1);
    setCropAreaPx(null);
    setPerspectiveVal(0);
    setCropAspect(undefined);
  }

  /** Wrap an async canvas operation with loading/error state. */
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setProcessing(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Operations
  // ---------------------------------------------------------------------------

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
      src.width = 1;
      src.height = 1;
      setWorking(await canvasToFile(out, workingFile.name));
      clearFallback();
      setIsTextEnhanced(false);
      setShowCompare(false);
      resetCropState();
    });

  const handleEnhance = async () => {
    // Instant revert — no canvas work needed.
    if (isTextEnhanced && fallbackFile) {
      const fb = fallbackFile;
      clearFallback();
      setWorking(fb);
      setIsTextEnhanced(false);
      setShowCompare(false);
      resetCropState();
      return;
    }

    await run(async () => {
      const canvas = await fileToCanvas(workingFile);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = clampByte(
          d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114,
        );
        let v = clampByte((g - 128) * 1.55 + 128 + 8);
        if (v > 218) v = 255;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      const enhanced = await canvasToFile(canvas, workingFile.name);
      // Capture workingFile before setWorking changes it.
      const prev = workingFile;
      setFallback(prev);
      setWorking(enhanced);
      setIsTextEnhanced(true);
      setShowCompare(false);
      resetCropState();
    });
  };

  const handleSmartCrop = () =>
    run(async () => {
      const canvas = await fileToCanvas(workingFile);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const { data: rgba } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const gray = new Uint8ClampedArray(canvas.width * canvas.height);
      for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
        gray[p] = clampByte(
          rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114,
        );
      }
      const b = detectDocumentBounds(gray, canvas.width, canvas.height);

      const out = document.createElement("canvas");
      out.width = b.width;
      out.height = b.height;
      const outCtx = out.getContext("2d")!;
      outCtx.fillStyle = "#fff";
      outCtx.fillRect(0, 0, b.width, b.height);
      outCtx.drawImage(canvas, b.x, b.y, b.width, b.height, 0, 0, b.width, b.height);
      canvas.width = 1;
      canvas.height = 1;

      setWorking(await canvasToFile(out, workingFile.name));
      clearFallback();
      setIsTextEnhanced(false);
      setShowCompare(false);
      resetCropState();
    });

  const handleApplyCrop = () =>
    run(async () => {
      if (!cropAreaPx) return;
      const canvas = await fileToCanvas(workingFile);
      const cx = Math.max(0, Math.round(cropAreaPx.x));
      const cy = Math.max(0, Math.round(cropAreaPx.y));
      const cw = Math.max(1, Math.round(cropAreaPx.width));
      const ch = Math.max(1, Math.round(cropAreaPx.height));

      const out = document.createElement("canvas");
      out.width = cw;
      out.height = ch;
      const ctx = out.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      canvas.width = 1;
      canvas.height = 1;

      let final = out;
      if (Math.abs(perspectiveVal) >= 0.001) {
        final = applyPerspective(out, perspectiveVal);
        if (final !== out) {
          out.width = 1;
          out.height = 1;
        }
      }

      setWorking(await canvasToFile(final, workingFile.name));
      clearFallback();
      setIsTextEnhanced(false);
      setShowCompare(false);
      resetCropState();
    });

  const handleSave = () => {
    onSave({
      pageId: page.id,
      newFile: workingFile,
      isTextEnhanced,
      fallbackFile,
    });
  };

  if (!displayUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Loader2 size={20} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700"
        >
          <ChevronLeft size={14} />
          Back
        </button>
        <p className="truncate px-3 text-xs font-semibold text-gray-500">
          Image Editor
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={processing}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <Check size={14} />
          Save
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50 px-4 py-2 scrollbar-none">
        <button
          type="button"
          onClick={handleEnhance}
          disabled={processing}
          className={[
            "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-60",
            isTextEnhanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-emerald-100 bg-white text-emerald-700",
          ].join(" ")}
        >
          {isTextEnhanced ? "Remove enhance" : "Enhance text"}
        </button>

        <button
          type="button"
          onClick={() => handleRotate("left")}
          disabled={processing}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-60"
        >
          Rotate left
        </button>

        <button
          type="button"
          onClick={() => handleRotate("right")}
          disabled={processing}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 disabled:opacity-60"
        >
          Rotate right
        </button>

        <button
          type="button"
          onClick={handleSmartCrop}
          disabled={processing}
          className="shrink-0 rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-[11px] font-bold text-orange-700 disabled:opacity-60"
        >
          Smart crop
        </button>
      </div>

      {/* Compare toggle row */}
      {isTextEnhanced && fallbackUrl && (
        <div className="flex items-center justify-end border-b border-gray-100 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowCompare((prev) => !prev)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
          >
            {showCompare ? "Hide compare" : "Show compare"}
          </button>
        </div>
      )}

      {/* Side-by-side compare strip */}
      {showCompare && fallbackUrl && (
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50 p-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <p className="border-b border-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
              Original
            </p>
            <img
              src={fallbackUrl}
              alt="Original scan"
              className="h-24 w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
            <p className="border-b border-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
              Enhanced
            </p>
            <img
              src={displayUrl}
              alt="Enhanced scan"
              className="h-24 w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Manual crop canvas — react-easy-crop receives an ObjectURL, not base64 */}
      <div className="relative min-h-0 flex-1 bg-black">
        <Cropper
          image={displayUrl}
          crop={cropPos}
          zoom={cropZoom}
          aspect={cropAspect}
          onCropChange={setCropPos}
          onZoomChange={setCropZoom}
          onCropComplete={(_, area) => setCropAreaPx(area)}
          showGrid
          objectFit="contain"
        />
      </div>

      {/* Controls */}
      <div className="space-y-3 border-t border-gray-100 px-4 py-3">
        {processing && (
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600">
            <Loader2 size={12} className="animate-spin" />
            Processing…
          </div>
        )}
        {error && (
          <p className="text-xs font-semibold text-red-600">{error}</p>
        )}

        {/* Aspect-ratio presets */}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-gray-600">Aspect ratio</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { label: "Free", value: undefined },
              { label: "A4", value: 1 / Math.SQRT2 },
              { label: "Square", value: 1 },
              { label: "ID card", value: 85.6 / 54 },
              { label: "4:3", value: 4 / 3 },
            ].map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setCropAspect(value);
                  setCropPos({ x: 0, y: 0 });
                  setCropZoom(1);
                }}
                className={[
                  "shrink-0 rounded-lg border px-3 py-1 text-[11px] font-bold",
                  cropAspect === value
                    ? "border-orange-300 bg-orange-100 text-orange-700"
                    : "border-gray-200 bg-white text-gray-600",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom slider */}
        <div>
          <label className="text-[11px] font-semibold text-gray-600">
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={cropZoom}
            onChange={(e) => setCropZoom(Number(e.target.value))}
            className="mt-1 w-full accent-orange-500"
          />
        </div>

        {/* Perspective slider */}
        <div>
          <label className="text-[11px] font-semibold text-gray-600">
            Perspective correction
          </label>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={perspectiveVal}
            onChange={(e) => setPerspectiveVal(Number(e.target.value))}
            className="mt-1 w-full accent-orange-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetCropState}
            disabled={processing}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 disabled:opacity-60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!cropAreaPx || processing}
            className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
