import React from "react";
import { ArrowUp, ArrowDown, Trash2, Camera, ScanText, X, ChevronRight, Check, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ScanDraftPage, VisionSuggestion } from "../VaultClient";
import { transformsAffectPixels } from "../scanPipeline";

export const CATEGORIES = [
  { id: "id-document", label: "ID Document", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { id: "matric-transcript", label: "Matric Transcript", color: "bg-green-50 text-green-700 border-green-100" },
  { id: "proof-of-address", label: "Proof of Address", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { id: "motivational-letter", label: "Motivational Letter", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { id: "other", label: "Other", color: "bg-gray-100 text-gray-600 border-gray-200" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export function categoryMeta(id: Category) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function categoryChipClasses(active: boolean): string {
  return [
    "shrink-0 rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all duration-200 shadow-sm",
    active ? "border-orange-500 bg-orange-500 text-white shadow-orange-500/20" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300",
  ].join(" ");
}

type ScanReviewGalleryProps = {
  scanDraftPages: ScanDraftPage[];
  scannerConverting: boolean;
  uploading: boolean;
  autoRotateScans: boolean;
  ocrEnabled: boolean;
  ocrProgress: { page: number; total: number; status: string } | null;
  scanOutputName: string;
  uploadCategory: Category;
  onSetAutoRotateScans: (val: boolean) => void;
  onClearScanDraft: () => void;
  onSetUploadCategory: (cat: Category) => void;
  onSetEditingPage: (page: ScanDraftPage) => void;
  onMovePage: (id: string, direction: "up" | "down") => void;
  onRemovePage: (id: string) => void;
  onSetScanOutputName: (name: string) => void;
  onSetOcrEnabled: (val: boolean) => void;
  onAddPageClick: () => void;
  onCreatePdfClick: () => void;
  visionAnalyzing: boolean;
  visionSuggestion: VisionSuggestion | null;
};

export default function ScanReviewGallery({
  scanDraftPages,
  scannerConverting,
  uploading,
  autoRotateScans,
  ocrEnabled,
  ocrProgress,
  scanOutputName,
  uploadCategory,
  onSetAutoRotateScans,
  onClearScanDraft,
  onSetUploadCategory,
  onSetEditingPage,
  onMovePage,
  onRemovePage,
  onSetScanOutputName,
  onSetOcrEnabled,
  onAddPageClick,
  onCreatePdfClick,
  visionAnalyzing,
  visionSuggestion,
}: ScanReviewGalleryProps) {
  if (scanDraftPages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-50/95 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 pt-safe border-b border-gray-200/50 bg-white/50">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">Review Scan</h2>
        <button
          type="button"
          onClick={onClearScanDraft}
          disabled={scannerConverting || uploading}
          className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 scrollbar-none">
        
        {/* Horizontal Gallery */}
        <div className="w-full px-5 py-6 bg-gradient-to-b from-gray-100 to-gray-50/50">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
            {scanDraftPages.map((page, index) => (
              <div
                key={page.id}
                role="button"
                tabIndex={0}
                onClick={() => onSetEditingPage(page)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSetEditingPage(page);
                  }
                }}
                className="group relative w-[200px] shrink-0 snap-center overflow-hidden rounded-2xl border-2 border-transparent bg-white shadow-md transition-all hover:border-orange-400 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-orange-400/20"
              >
                {/* Page preview */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                  <img
                    src={page.previewUrl}
                    alt={`Scanned page ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Gradients and badging */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  <div className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-[11px] font-black text-white backdrop-blur-md">
                    {index + 1}
                  </div>
                  
                  {transformsAffectPixels(page.transforms) && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                      Edited
                    </span>
                  )}
                  
                  <span className="absolute bottom-3 left-3 text-[11px] font-bold text-white/90 drop-shadow-sm">
                    Tap to edit crop & filter
                  </span>
                </div>

                {/* Action row — stopPropagation so taps don't open the editor */}
                <div
                  className="flex items-center justify-between border-t border-gray-100 bg-white px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMovePage(page.id, "up")}
                      disabled={index === 0 || scannerConverting}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30"
                      aria-label={`Move page ${index + 1} left`}
                    >
                      <ArrowUp size={16} className="-rotate-90" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMovePage(page.id, "down")}
                      disabled={index === scanDraftPages.length - 1 || scannerConverting}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30"
                      aria-label={`Move page ${index + 1} right`}
                    >
                      <ArrowDown size={16} className="-rotate-90" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemovePage(page.id)}
                    disabled={scannerConverting}
                    className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                    aria-label={`Remove page ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add more button as a card */}
            <button
              onClick={onAddPageClick}
              disabled={scannerConverting || uploading}
              className="flex w-[140px] shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 text-gray-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
            >
              <div className="rounded-full bg-white p-3 shadow-sm">
                <Camera size={24} />
              </div>
              <span className="text-[13px] font-bold">Add Page</span>
            </button>
          </div>
        </div>

        {/* Form Details */}
        <div className="mx-auto max-w-lg space-y-6 px-5 py-6">
          
          {/* AI Suggestion Banner */}
          {visionAnalyzing && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-center gap-3 shadow-sm">
              <Sparkles size={16} className="text-blue-500 animate-pulse" />
              <span className="text-[13px] font-bold text-blue-800 animate-pulse">AI is analyzing your document...</span>
            </div>
          )}
          {visionSuggestion && !visionAnalyzing && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-indigo-100 p-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                </div>
                <span className="text-[13px] font-black text-indigo-900">AI Document Analysis</span>
              </div>
              
              {visionSuggestion.qualityIssues.length > 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[11px] font-bold text-amber-900">Quality issues detected:</p>
                    <ul className="mt-1 list-inside list-disc text-[11px] font-medium text-amber-700">
                      {visionSuggestion.qualityIssues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={14} /> Scan looks clear!
                </div>
              )}

              {visionSuggestion.category !== "other" && (
                <p className="text-[12px] font-medium text-indigo-700 px-1">
                  Categorized as <span className="font-black">{categoryMeta(visionSuggestion.category).label}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-gray-900">What type of document is this?</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSetUploadCategory(cat.id)}
                  className={categoryChipClasses(uploadCategory === cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-gray-900">Document Name</label>
            <input
              type="text"
              value={scanOutputName}
              onChange={(e) => onSetScanOutputName(e.target.value)}
              placeholder="e.g. Grade 11 Report"
              disabled={scannerConverting}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60 shadow-sm"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-gray-900">Advanced Settings</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSetOcrEnabled(!ocrEnabled)}
                disabled={scannerConverting}
                className={[
                  "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all disabled:opacity-60",
                  ocrEnabled
                    ? "border-emerald-200 bg-emerald-50/50 shadow-sm"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div className={["rounded-full p-2.5 transition-colors", ocrEnabled ? "bg-emerald-100" : "bg-gray-100"].join(" ")}>
                    <ScanText size={18} className={ocrEnabled ? "text-emerald-600" : "text-gray-500"} />
                  </div>
                  <div>
                    <p className={["text-sm font-bold", ocrEnabled ? "text-emerald-900" : "text-gray-900"].join(" ")}>
                      Searchable PDF (OCR)
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                      Extracts text so the PDF can be searched.
                    </p>
                  </div>
                </div>
                <div className={["flex h-6 w-11 items-center rounded-full p-1 transition-colors", ocrEnabled ? "bg-emerald-500" : "bg-gray-300"].join(" ")}>
                  <div className={["h-4 w-4 rounded-full bg-white shadow-sm transition-transform", ocrEnabled ? "translate-x-5" : "translate-x-0"].join(" ")} />
                </div>
              </button>
            </div>
            
            {ocrProgress && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-sm animate-in fade-in">
                <span className="mr-2 inline-block animate-pulse">●</span>
                {ocrProgress.status} — page {Math.min(ocrProgress.page + 1, ocrProgress.total)} of {ocrProgress.total}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="absolute inset-x-0 bottom-0 bg-white/80 p-5 pt-4 pb-safe backdrop-blur-xl border-t border-gray-200/50">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={onCreatePdfClick}
            disabled={scannerConverting || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-4 text-[15px] font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {scannerConverting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Creating PDF...
              </>
            ) : (
              <>
                Save {scanDraftPages.length} {scanDraftPages.length === 1 ? "Page" : "Pages"}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
