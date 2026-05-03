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
import {
  type FilterMode,
  type Point,
  applyFilter,
  detectDocumentQuad,
  imageDataToGray,
  warpQuadToRect,
} from "./scanPipeline";

// ===========================================================================
// Types
// ===========================================================================

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
        const gray = imageDataToGray(data, canvas.width * canvas.height);
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
