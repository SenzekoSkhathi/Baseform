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
  type Rotation,
  type ScanTransforms,
  applyFilter,
  detectDocumentQuad,
  fileToCanvas,
  imageDataToGray,
  renderPage,
} from "./scanPipeline";

// ===========================================================================
// Types
// ===========================================================================

type Tab = "crop" | "filter" | "rotate";

export type ScanEditorSavePayload = {
  pageId: string;
  transforms: ScanTransforms;
  renderedFile: File;
};

type Props = {
  page: ScanDraftPage;
  onSave: (payload: ScanEditorSavePayload) => void;
  onClose: () => void;
};

// ===========================================================================
// Component
//
// The editor never mutates page.sourceFile. All UI state lives in `transforms`
// (crop quad, rotation, filter). On every change the displayed image is
// re-derived from the immutable source. "Original" filter therefore always
// returns the user to truly original pixels, even after multiple crop/rotate
// cycles. The filter thumbnails respect the current crop+rotation so users
// see what each filter looks like *after* their edits.
// ===========================================================================

const FILTER_LABELS: Record<FilterMode, string> = {
  original: "Original",
  auto: "Auto",
  magic: "Magic Color",
  grayscale: "Grayscale",
  bw: "B & W",
};

const FILTER_ORDER: FilterMode[] = ["original", "auto", "magic", "grayscale", "bw"];

// Rotate a 4-point quad by ±90° in-place around a (W,H) frame. Used when the
// user rotates the source — the cropQuad lives in raw-source coords, so it
// needs to track the rotation to stay aligned with the document.
function rotateQuad(
  quad: Point[],
  fromRotation: Rotation,
  toRotation: Rotation,
  rawW: number,
  rawH: number,
): Point[] {
  // We only ever step by ±90°, so apply that delta directly.
  const delta = ((toRotation - fromRotation + 360) % 360) as Rotation;
  if (delta === 0) return quad;
  const apply = (p: Point, w: number, h: number, d: Rotation): Point => {
    if (d === 90) return { x: h - p.y, y: p.x };
    if (d === 180) return { x: w - p.x, y: h - p.y };
    if (d === 270) return { x: p.y, y: w - p.x };
    return p;
  };
  let w = rawW, h = rawH;
  let out = quad;
  // Step 90° at a time so dimensions track correctly.
  for (let step = 0; step < delta / 90; step++) {
    out = out.map((p) => apply(p, w, h, 90));
    [w, h] = [h, w];
  }
  return out;
}

function defaultQuad(w: number, h: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: w - 1, y: 0 },
    { x: w - 1, y: h - 1 },
    { x: 0, y: h - 1 },
  ];
}

export default function ScanEditor({ page, onSave, onClose }: Props) {
  // Local edit state. Starts from the page's saved transforms so reopening
  // the editor on an already-edited page restores the same crop/rotation/filter.
  const [transforms, setTransforms] = useState<ScanTransforms>(() => ({
    ...page.transforms,
    cropQuad: page.transforms.cropQuad ? page.transforms.cropQuad.map((p) => ({ ...p })) : null,
  }));

  const [tab, setTab] = useState<Tab>("crop");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Raw source dimensions (immutable across the editor session).
  const [sourceDim, setSourceDim] = useState<{ w: number; h: number } | null>(null);

  // Preview image: in the crop tab, the unwarped (but rotated+filtered)
  // source so the quad overlay makes sense; in other tabs, the fully
  // transformed render.
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewDim, setPreviewDim] = useState<{ w: number; h: number } | null>(null);
  const previewUrlRef = useRef<string>("");

  // Filter thumbnails — keyed by filter mode, regenerated when crop/rotation
  // change. Tracked in a ref so we can revoke previous URLs *after* the new
  // ones are committed (avoids the broken-image flash from naive cleanup).
  const [filterThumbs, setFilterThumbs] = useState<Record<FilterMode, string>>({
    original: "",
    auto: "",
    magic: "",
    grayscale: "",
    bw: "",
  });
  const filterThumbsUrlsRef = useRef<string[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageBox, setStageBox] = useState<{ w: number; h: number } | null>(null);

  // ---- Load source dimensions once ---------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = URL.createObjectURL(page.sourceFile);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Image load failed."));
          el.src = url;
        });
        if (cancelled) return;
        setSourceDim({ w: img.width, h: img.height });
      } catch {
        if (!cancelled) setError("Could not load image.");
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
    return () => { cancelled = true; };
  }, [page.sourceFile]);

  // ---- Auto-seed the crop quad on first load if none is set --------------
  useEffect(() => {
    if (!sourceDim || transforms.cropQuad) return;
    let cancelled = false;
    (async () => {
      try {
        const canvas = await fileToCanvas(page.sourceFile);
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gray = imageDataToGray(data, canvas.width * canvas.height);
        const detected = detectDocumentQuad(gray, canvas.width, canvas.height);
        canvas.width = 1;
        canvas.height = 1;
        if (cancelled) return;
        setTransforms((prev) => ({
          ...prev,
          cropQuad: detected ?? defaultQuad(sourceDim.w, sourceDim.h),
        }));
      } catch {
        if (cancelled) return;
        setTransforms((prev) => ({
          ...prev,
          cropQuad: defaultQuad(sourceDim.w, sourceDim.h),
        }));
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDim]);

  // ---- Stage size tracking -----------------------------------------------
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setStageBox({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tab, sourceDim]);

  // ---- Render the live preview whenever transforms or tab change ---------
  // In CROP tab we render with cropQuad disabled so the user can drag the
  // quad over the full source; in other tabs we render the full pipeline.
  useEffect(() => {
    if (!sourceDim) return;
    let cancelled = false;
    (async () => {
      try {
        const previewTransforms: ScanTransforms = tab === "crop"
          ? { ...transforms, cropQuad: null }
          : transforms;
        const file = await renderPage(page.sourceFile, previewTransforms, "preview.jpg", 0.85);
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        // Swap atomically: install new URL, then revoke previous.
        const prev = previewUrlRef.current;
        previewUrlRef.current = url;
        setPreviewUrl(url);
        // Compute preview dimensions (rotation may have swapped them).
        const swap = previewTransforms.rotation === 90 || previewTransforms.rotation === 270;
        if (previewTransforms.cropQuad) {
          // For non-crop tabs we'd need the warped output dims — easiest to
          // measure from the encoded file. The `<img>` onLoad below sets
          // them; until then we fall back to the swapped raw dims.
        }
        setPreviewDim({
          w: swap ? sourceDim.h : sourceDim.w,
          h: swap ? sourceDim.w : sourceDim.h,
        });
        if (prev) URL.revokeObjectURL(prev);
      } catch {
        if (!cancelled) setError("Preview failed.");
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDim, tab, transforms.rotation, transforms.filter, transforms.cropQuad]);

  // Cleanup the preview URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }
    };
  }, []);

  // ---- Filter thumbnails -------------------------------------------------
  // Regenerate when crop/rotation change so each thumb reflects the user's
  // current edit state, not the raw source. URLs are committed via ref and
  // revoked only *after* replacement to avoid the broken-image flash.
  useEffect(() => {
    if (!sourceDim) return;
    let cancelled = false;
    (async () => {
      try {
        // Render the cropped+rotated source once, then apply each filter.
        const baseTransforms: ScanTransforms = {
          cropQuad: transforms.cropQuad,
          rotation: transforms.rotation,
          filter: "original",
        };
        const baseFile = await renderPage(page.sourceFile, baseTransforms, "thumb-base.jpg", 0.85);
        if (cancelled) return;
        const baseCanvas = await fileToCanvas(baseFile);

        const THUMB_MAX = 180;
        const scale = Math.min(1, THUMB_MAX / Math.max(baseCanvas.width, baseCanvas.height));
        const tw = Math.max(1, Math.round(baseCanvas.width * scale));
        const th = Math.max(1, Math.round(baseCanvas.height * scale));
        const small = document.createElement("canvas");
        small.width = tw;
        small.height = th;
        small.getContext("2d")!.drawImage(baseCanvas, 0, 0, tw, th);
        baseCanvas.width = 1;
        baseCanvas.height = 1;

        const newUrls: string[] = [];
        const out: Record<FilterMode, string> = {
          original: "", auto: "", magic: "", grayscale: "", bw: "",
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
          filtered.width = 1;
          filtered.height = 1;
          const url = URL.createObjectURL(blob);
          newUrls.push(url);
          out[mode] = url;
        }
        small.width = 1;
        small.height = 1;

        if (cancelled) {
          // We already produced URLs but no consumer; revoke immediately.
          newUrls.forEach(URL.revokeObjectURL);
          return;
        }

        const previousUrls = filterThumbsUrlsRef.current;
        filterThumbsUrlsRef.current = newUrls;
        setFilterThumbs(out);
        // Revoke the previous batch *after* the new URLs are installed in
        // state, so the displayed thumbnails never reference revoked URLs.
        previousUrls.forEach(URL.revokeObjectURL);
      } catch {
        // Thumbnails are cosmetic — failure is non-fatal.
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDim, transforms.cropQuad, transforms.rotation]);

  useEffect(() => {
    return () => {
      filterThumbsUrlsRef.current.forEach(URL.revokeObjectURL);
      filterThumbsUrlsRef.current = [];
    };
  }, []);

  // ---- Display geometry --------------------------------------------------
  const displayGeom = useMemo(() => {
    if (!previewDim || !stageBox) return null;
    const scale = Math.min(stageBox.w / previewDim.w, stageBox.h / previewDim.h);
    const w = previewDim.w * scale;
    const h = previewDim.h * scale;
    return {
      scale,
      w,
      h,
      offsetX: (stageBox.w - w) / 2,
      offsetY: (stageBox.h - h) / 2,
    };
  }, [previewDim, stageBox]);

  // ---- Quad drag handlers (CROP tab only) --------------------------------
  // The displayed image in CROP tab is the *rotated* source (no crop applied),
  // so quad coords drawn here are in rotated-source space. We convert to raw
  // source space when committing to transforms.cropQuad.
  const dragIndex = useRef<number | null>(null);

  // The quad we render lives in preview-image (rotated-source) coords.
  // Convert transforms.cropQuad (raw-source coords) into preview coords for
  // display, and reverse on commit.
  const rotatedQuad = useMemo(() => {
    if (!transforms.cropQuad || !sourceDim) return null;
    return rotateQuad(transforms.cropQuad, 0, transforms.rotation, sourceDim.w, sourceDim.h);
  }, [transforms.cropQuad, transforms.rotation, sourceDim]);

  const setRotatedQuad = useCallback((next: Point[]) => {
    if (!sourceDim) return;
    // Inverse-rotate back to raw source coords.
    const rawQuad = rotateQuad(
      next,
      transforms.rotation,
      0,
      // Width/height of rotated frame:
      transforms.rotation === 90 || transforms.rotation === 270 ? sourceDim.h : sourceDim.w,
      transforms.rotation === 90 || transforms.rotation === 270 ? sourceDim.w : sourceDim.h,
    );
    setTransforms((prev) => ({ ...prev, cropQuad: rawQuad }));
  }, [sourceDim, transforms.rotation]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!rotatedQuad || !displayGeom || !previewDim) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < 4; i++) {
      const cx = displayGeom.offsetX + rotatedQuad[i].x * displayGeom.scale;
      const cy = displayGeom.offsetY + rotatedQuad[i].y * displayGeom.scale;
      const dd = Math.hypot(cx - px, cy - py);
      if (dd < bestDist) { bestDist = dd; best = i; }
    }
    if (bestDist > 40) return;
    dragIndex.current = best;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragIndex.current === null || !rotatedQuad || !displayGeom || !previewDim) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const ix = Math.max(0, Math.min(previewDim.w, (px - displayGeom.offsetX) / displayGeom.scale));
    const iy = Math.max(0, Math.min(previewDim.h, (py - displayGeom.offsetY) / displayGeom.scale));
    const next = rotatedQuad.slice();
    next[dragIndex.current] = { x: ix, y: iy };
    setRotatedQuad(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragIndex.current === null) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    dragIndex.current = null;
  };

  // ---- Commands ----------------------------------------------------------
  const handleResetQuad = () => {
    if (!sourceDim) return;
    const rotated = transforms.rotation === 90 || transforms.rotation === 270;
    const w = rotated ? sourceDim.h : sourceDim.w;
    const h = rotated ? sourceDim.w : sourceDim.h;
    setRotatedQuad(defaultQuad(w, h));
  };

  const handleRotate = (dir: "left" | "right") => {
    setTransforms((prev) => {
      const delta = dir === "right" ? 90 : -90;
      const next = (((prev.rotation + delta) % 360) + 360) % 360 as Rotation;
      return { ...prev, rotation: next };
    });
  };

  const pickFilter = useCallback((mode: FilterMode) => {
    setTransforms((prev) => ({ ...prev, filter: mode }));
  }, []);

  // ---- Save (commit + render) -------------------------------------------
  const handleSave = async () => {
    setError(null);
    setProcessing(true);
    try {
      const renderedFile = await renderPage(
        page.sourceFile,
        transforms,
        page.renderedFile.name,
        0.92,
      );
      onSave({
        pageId: page.id,
        transforms,
        renderedFile,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      setProcessing(false);
    }
  };

  // ---- Render ------------------------------------------------------------

  if (!sourceDim || !previewUrl) {
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
        {displayGeom && (
          <img
            src={previewUrl}
            alt="Scan"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: displayGeom.offsetX,
              top: displayGeom.offsetY,
              width: displayGeom.w,
              height: displayGeom.h,
            }}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setPreviewDim({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
          />
        )}

        {tab === "crop" && rotatedQuad && displayGeom && (
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
            <path
              d={`M 0 0 H ${stageBox?.w ?? 0} V ${stageBox?.h ?? 0} H 0 Z M ${rotatedQuad
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
              points={rotatedQuad
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
            {rotatedQuad.map((p, i) => {
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
            onClick={() => setTab("filter")}
            disabled={processing || !rotatedQuad}
            className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
          >
            Confirm crop
          </button>
        </div>
      )}

      {tab === "filter" && (
        <div className="bg-black/90 px-3 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {FILTER_ORDER.map((mode) => {
              const active = transforms.filter === mode;
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
