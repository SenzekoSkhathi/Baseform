import { X, Zap, ZapOff } from "lucide-react";
import React from "react";
import type { FilterMode, Point } from "../scanPipeline";

type ScannerCameraProps = {
  cameraOpen: boolean;
  cameraLoading: boolean;
  cameraError: string | null;
  pendingScanCount: number;
  liveQuad: Point[] | null;
  liveQuadStable: boolean;
  autoCapture: boolean;
  torchOn: boolean;
  torchSupported: boolean;
  captureFilter: FilterMode;
  captureFlash: boolean;
  scannerConverting: boolean;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  videoNaturalSizeRef: React.RefObject<{ w: number; h: number } | null>;
  scannerInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onCapture: () => void;
  onToggleTorch: () => void;
  onToggleAutoCapture: () => void;
  onChangeFilter: (mode: FilterMode) => void;
};

export default function ScannerCamera({
  cameraOpen,
  cameraLoading,
  cameraError,
  pendingScanCount,
  liveQuad,
  liveQuadStable,
  autoCapture,
  torchOn,
  torchSupported,
  captureFilter,
  captureFlash,
  scannerConverting,
  cameraVideoRef,
  videoNaturalSizeRef,
  scannerInputRef,
  onClose,
  onCapture,
  onToggleTorch,
  onToggleAutoCapture,
  onChangeFilter,
}: ScannerCameraProps) {
  if (!cameraOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Top bar with glassmorphism */}
      <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-4 pt-safe pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-white/10 p-2.5 text-white backdrop-blur-md transition active:scale-95 border border-white/10"
          aria-label="Close camera"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          {pendingScanCount > 0 && (
            <span className="rounded-full bg-orange-500 shadow-lg shadow-orange-500/20 px-3 py-1.5 text-xs font-black text-white transform transition-transform animate-in fade-in zoom-in">
              {pendingScanCount} captured
            </span>
          )}
          <span
            className={[
              "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-colors border border-white/10 shadow-lg",
              liveQuadStable
                ? "bg-emerald-500/80 text-white border-emerald-400/50"
                : liveQuad
                  ? "bg-amber-400/80 text-amber-900 border-amber-300/50"
                  : "bg-white/10 text-white/80",
            ].join(" ")}
          >
            {liveQuadStable ? "Hold steady…" : liveQuad ? "Page detected" : "Looking for page"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => scannerInputRef.current?.click()}
          disabled={cameraLoading || scannerConverting}
          className="pointer-events-auto rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition active:scale-95 disabled:opacity-50 border border-white/10"
        >
          Gallery
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <video
          ref={cameraVideoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover sm:object-contain transition-opacity duration-300"
          style={{ opacity: cameraLoading ? 0 : 1 }}
        />

        {/* Loading skeleton for video */}
        {cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {/* White flash on capture */}
        {captureFlash && (
          <div className="pointer-events-none absolute inset-0 bg-white opacity-80 z-20 animate-out fade-out duration-300" />
        )}

        {/* Live quad overlay */}
        {liveQuad && videoNaturalSizeRef.current && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full z-10 transition-colors duration-200"
            viewBox={`0 0 ${videoNaturalSizeRef.current.w} ${videoNaturalSizeRef.current.h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <polygon
              points={liveQuad.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={liveQuadStable ? "rgba(16,185,129,0.25)" : "rgba(251,146,60,0.15)"}
              stroke={liveQuadStable ? "#10b981" : "#fb923c"}
              strokeWidth={Math.max(4, videoNaturalSizeRef.current.w / 200)}
              strokeLinejoin="round"
              className="transition-all duration-150"
            />
          </svg>
        )}

        {/* Idle guide when no page is detected yet */}
        {!liveQuad && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
            <div className="relative aspect-3/4 w-4/5 sm:w-3/5 max-w-sm">
              <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/30 transition-all" />
              <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/30 transition-all" />
              <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/30 transition-all" />
              <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/30 transition-all" />
            </div>
          </div>
        )}

        {/* Error toast */}
        {cameraError && (
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-11/12 max-w-sm z-30 rounded-2xl bg-red-500/90 px-4 py-3 text-center text-sm font-semibold text-white backdrop-blur-md shadow-2xl">
            {cameraError}
          </div>
        )}
      </div>

      {/* Bottom controls panel */}
      <div className="absolute inset-x-0 bottom-0 z-50 flex flex-col items-center bg-gradient-to-t from-black via-black/80 to-transparent pb-8 pt-12 pb-safe">
        
        {/* Quick controls pill */}
        <div className="mb-6 flex items-center justify-center gap-2 rounded-full bg-white/10 p-1.5 backdrop-blur-xl border border-white/10 shadow-lg">
          {torchSupported && (
            <button
              type="button"
              onClick={onToggleTorch}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition active:scale-95",
                torchOn ? "bg-amber-400 text-amber-900" : "text-white hover:bg-white/10",
              ].join(" ")}
            >
              {torchOn ? <Zap size={13} /> : <ZapOff size={13} />}
            </button>
          )}
          
          <button
            type="button"
            onClick={onToggleAutoCapture}
            className={[
              "h-8 rounded-full px-3 text-[11px] font-bold transition active:scale-95",
              autoCapture ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20" : "text-white hover:bg-white/10",
            ].join(" ")}
          >
            Auto: {autoCapture ? "ON" : "OFF"}
          </button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          {(["original", "auto", "magic", "bw"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChangeFilter(mode)}
              className={[
                "h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-wider transition active:scale-95",
                captureFilter === mode ? "bg-white text-black shadow-sm" : "text-white/70 hover:text-white hover:bg-white/10",
              ].join(" ")}
            >
              {mode === "bw" ? "B&W" : mode === "original" ? "Raw" : mode}
            </button>
          ))}
        </div>

        {/* Shutter row */}
        <div className="flex w-full items-center justify-between px-8">
          {/* Empty spacer for alignment if no scans, or subtle 'Done' if scans exist but placed left */}
          <div className="w-16">
          </div>

          {/* Shutter button */}
          <button
            type="button"
            onClick={onCapture}
            disabled={cameraLoading || scannerConverting}
            aria-label="Capture page"
            className={[
              "group relative flex items-center justify-center rounded-full disabled:opacity-60 active:scale-90 transition-all duration-200",
            ].join(" ")}
            style={{ height: 80, width: 80 }}
          >
            <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />
            <div
              className={[
                "absolute inset-1.5 rounded-full transition-all duration-300",
                liveQuadStable && autoCapture ? "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "bg-white",
              ].join(" ")}
            />
            <div
              className={[
                "absolute inset-2.5 rounded-full border-[3px] transition-colors duration-300",
                liveQuadStable && autoCapture ? "border-emerald-500" : "border-gray-200",
              ].join(" ")}
            />
          </button>

          {/* Done button — appears once pages are captured */}
          <div className="w-16 flex items-center justify-end">
            {pendingScanCount > 0 ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-500/30 text-[11px] font-black uppercase tracking-wider text-white transition active:scale-95 animate-in slide-in-from-right-4 zoom-in"
              >
                Done
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
