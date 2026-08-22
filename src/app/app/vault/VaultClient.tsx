"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  FolderOpen,
  Upload,
  Camera,
  ArrowUp,
  ArrowDown,
  FileText,
  Trash2,
  Download,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Zap,
  ZapOff,
  ScanText,
  CheckSquare,
  Layers,
  Link,
} from "lucide-react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import ScanEditor, { type ScanEditorSavePayload } from "./ScanEditor";
import ScannerCamera from "./components/ScannerCamera";
import ScanReviewGallery, { CATEGORIES, type Category, categoryMeta } from "./components/ScanReviewGallery";
import {
  AUTO_CAPTURE_STABLE_MS,
  AUTO_CAPTURE_MIN_AREA_RATIO,
  AUTO_CAPTURE_TOLERANCE_RATIO,
  IDENTITY_TRANSFORMS,
  type FilterMode,
  type Point,
  type ScanTransforms,
  detectDocumentQuad,
  imageDataToGray,
  quadArea,
  quadDiagonal,
  quadIsStable,
  renderPage,
  transformsAffectPixels,
} from "./scanPipeline";

export type VaultFile = {
  path: string;
  name: string;
  category: Category;
  size: number;
  createdAt: string;
  mimeType: string;
};

export type VisionSuggestion = {
  category: Category | "other";
  extractedData?: {
    name?: string;
    idNumber?: string;
    subjects?: Array<{
      name: string;
      percentage: number;
    }>;
  };
  qualityIssues: string[];
  isCertified: boolean;
  certificationValid: boolean;
};

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MAX_SCAN_PAGES = 8;

// Scanner output is optimised for *readability* rather than aggressive
// compression. 2000 px on the long side + q=0.88 yields ~0.8–1.4 MB per page
// and renders clean body text in the final PDF. The web-worker flag keeps
// the main thread responsive on low-end Android devices.
const SCAN_IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 1.4,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
  initialQuality: 0.88,
} as const;

// Long side used when rendering the final PDF page. Matches A4 at ~200 DPI,
// which is the sweet spot for scanned documents — text stays crisp without
// inflating file size.
const PDF_PAGE_MAX_SIDE = 2000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fileDisplayName(raw: string): string {
  // Strip the timestamp prefix added on upload: "1713456789012-My_File.pdf" → "My File.pdf"
  const withoutTimestamp = raw.replace(/^\d{13}-/, "");
  return withoutTimestamp.replace(/_/g, " ");
}

type ReaderKind = "pdf" | "image" | "text" | "office" | "unsupported";

type FileTypeMeta = {
  label: string;
  iconBg: string;
  iconText: string;
  chip: string;
};

function extensionFromName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function sanitizeDocumentName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "")
    .slice(0, 90);
}

function categoryChipClasses(active: boolean): string {
  return [
    "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
    active ? "border-orange-200 bg-orange-500 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
  ].join(" ");
}

function readerKindForFile(file: VaultFile): ReaderKind {
  const ext = extensionFromName(file.name);
  const mime = file.mimeType.toLowerCase();

  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (mime.startsWith("text/") || ["txt", "md", "csv", "json"].includes(ext)) return "text";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "office";

  return "unsupported";
}

function fileTypeMeta(file: VaultFile): FileTypeMeta {
  const kind = readerKindForFile(file);

  switch (kind) {
    case "pdf":
      return {
        label: "PDF",
        iconBg: "bg-red-50",
        iconText: "text-red-500",
        chip: "border-red-100 bg-red-50 text-red-700",
      };
    case "office":
      return {
        label: "Word",
        iconBg: "bg-blue-50",
        iconText: "text-blue-600",
        chip: "border-blue-100 bg-blue-50 text-blue-700",
      };
    case "image":
      return {
        label: "Image",
        iconBg: "bg-emerald-50",
        iconText: "text-emerald-600",
        chip: "border-emerald-100 bg-emerald-50 text-emerald-700",
      };
    case "text":
      return {
        label: "Text",
        iconBg: "bg-gray-100",
        iconText: "text-gray-600",
        chip: "border-gray-200 bg-gray-50 text-gray-700",
      };
    default:
      return {
        label: "File",
        iconBg: "bg-amber-50",
        iconText: "text-amber-500",
        chip: "border-amber-100 bg-amber-50 text-amber-700",
      };
  }
}

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

/**
 * Load an already-edited scan page into a canvas for the PDF writer.
 *
 * Important: this function does NOT re-crop or re-enhance the image. The
 * editor has already produced a finished page; re-processing it would stomp
 * on the user's filter/quad-crop choices and compound contrast enhancements.
 * We only downscale if the image is larger than PDF_PAGE_MAX_SIDE.
 */
async function loadImageForPdf(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read one of the selected images."));
      img.src = objectUrl;
    });

    const scale = Math.min(1, PDF_PAGE_MAX_SIDE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    return { canvas, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Stamp a tiny "baseform" mark in the bottom-right corner of the current
// jsPDF page. Light gray, small font, positioned just inside the page edge.
function stampBaseformWatermark(
  pdf: import("jspdf").jsPDF,
  pageWidth: number,
  pageHeight: number,
): void {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(170, 170, 170);
  pdf.text("baseform", pageWidth - 14, pageHeight - 10, { align: "right", baseline: "alphabetic" });
  // Restore defaults so subsequent OCR / drawing isn't affected.
  pdf.setTextColor(0, 0, 0);
}

async function buildPdfFromImages(images: File[]): Promise<Blob> {
  if (!images.length) throw new Error("No images selected.");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;

  for (let index = 0; index < images.length; index += 1) {
    if (index > 0) pdf.addPage("a4", "portrait");

    const image = await loadImageForPdf(images[index]);
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const renderWidth = image.width * scale;
    const renderHeight = image.height * scale;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    // Pass canvas directly to avoid huge Base64 strings in JS memory.
    // MEDIUM compression keeps scanned text readable without bloating the PDF.
    pdf.addImage(image.canvas, "JPEG", x, y, renderWidth, renderHeight, undefined, "MEDIUM");

    stampBaseformWatermark(pdf, pageWidth, pageHeight);

    // Release backing pixels as soon as page has been added.
    image.canvas.width = 1;
    image.canvas.height = 1;
  }

  return pdf.output("blob");
}

type Props = {
  initialFiles: VaultFile[];
};

// A scan draft page is the *immutable raw source* (the unmodified capture or
// upload) plus a set of transforms (crop quad, rotation, filter). The
// `renderedFile` and `previewUrl` are derived — re-computed via renderPage()
// whenever the transforms change. This is what allows "Original" filter to
// fully restore even after multiple crop/rotate cycles.
export type ScanDraftPage = {
  id: string;
  sourceFile: File;
  transforms: ScanTransforms;
  renderedFile: File;
  previewUrl: string;
};

async function normalizeScanImageFile(input: File): Promise<File> {
  const compressedBlob = await imageCompression(input, SCAN_IMAGE_COMPRESSION_OPTIONS);
  const baseName = input.name.replace(/\.[^.]+$/, "") || "scan";

  return new File([compressedBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image."));
      img.src = objectUrl;
    });

    return { width: image.width, height: image.height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function rotateScanImageFile(input: File, direction: "left" | "right"): Promise<File> {
  const objectUrl = URL.createObjectURL(input);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load image for rotation."));
      img.src = objectUrl;
    });

    const rotateRight = direction === "right";
    const canvas = document.createElement("canvas");
    canvas.width = image.height;
    canvas.height = image.width;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not rotate image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((rotateRight ? 90 : -90) * (Math.PI / 180));
    context.drawImage(image, -image.width / 2, -image.height / 2);

    const rotatedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not encode rotated image."));
          return;
        }
        resolve(result);
      }, "image/jpeg", 0.92);
    });

    const normalizedBlob = await imageCompression(
      new File([rotatedBlob], input.name, { type: "image/jpeg" }),
      SCAN_IMAGE_COMPRESSION_OPTIONS,
    );

    const baseName = input.name.replace(/\.[^.]+$/, "") || "scan";
    return new File([normalizedBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}


async function autoRotateScanImageFile(input: File): Promise<File> {
  const { width, height } = await getImageDimensions(input);
  if (width <= height * 1.08) return input;
  return rotateScanImageFile(input, "right");
}

// Encode a captured canvas to a JPEG File — used as the immutable `sourceFile`
// for a freshly captured page. The actual warp/filter happens later inside
// renderPage() so the source stays intact and transforms can be edited.
async function canvasToSourceFile(source: HTMLCanvasElement): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    source.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode scan."))),
      "image/jpeg",
      0.94,
    );
  });
  source.width = 1;
  source.height = 1;
  return new File([blob], `scan-${Date.now()}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

// Build a searchable PDF: each page contains the scanned image plus an
// invisible OCR text layer aligned with the page bounds. Tesseract is
// loaded lazily so users who never enable OCR never download the WASM.
async function buildSearchablePdfFromImages(
  images: File[],
  onProgress?: (pageIndex: number, totalPages: number, status: string) => void,
): Promise<Blob> {
  if (!images.length) throw new Error("No images selected.");

  const [{ jsPDF }, tesseractModule] = await Promise.all([
    import("jspdf"),
    import("tesseract.js"),
  ]);
  type OcrBaseline = { x0: number; y0: number; x1: number; y1: number; has_baseline?: boolean };
  type OcrWord = {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    baseline?: OcrBaseline;
  };
  const tesseract = tesseractModule as unknown as {
    createWorker: (lang: string | string[]) => Promise<{
      recognize: (image: HTMLCanvasElement | File) => Promise<{
        data: { words: OcrWord[] };
      }>;
      terminate: () => Promise<void>;
    }>;
  };

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;

  onProgress?.(0, images.length, "Loading OCR engine");
  // English + Afrikaans cover the vast majority of SA matric documents.
  // Tesseract handles multi-language in a single pass.
  const worker = await tesseract.createWorker(["eng", "afr"]);
  try {
    for (let index = 0; index < images.length; index += 1) {
      if (index > 0) pdf.addPage("a4", "portrait");

      onProgress?.(index, images.length, "Reading text");
      const image = await loadImageForPdf(images[index]);
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const renderWidth = image.width * scale;
      const renderHeight = image.height * scale;
      const x = (pageWidth - renderWidth) / 2;
      const y = (pageHeight - renderHeight) / 2;

      pdf.addImage(image.canvas, "JPEG", x, y, renderWidth, renderHeight, undefined, "MEDIUM");

      stampBaseformWatermark(pdf, pageWidth, pageHeight);

      // Run OCR on the canvas BEFORE we shrink it. tesseract.js accepts the
      // canvas directly and gives us per-word pixel-space bounding boxes.
      const result = await worker.recognize(image.canvas);
      const words = result.data.words ?? [];
      const pxToPt = renderWidth / image.width;

      // Render invisible text behind the image so PDF readers can select it.
      // Rendering mode 3 = invisible (paint nothing), but glyphs still feed
      // the text-extraction layer.
      // jsPDF type defs don't expose every option, so cast where needed.
      // Anchor each word at its baseline in pt-space.
      const setRenderingMode = (pdf as unknown as {
        setTextRenderingMode?: (mode: number) => void;
      }).setTextRenderingMode;
      if (setRenderingMode) setRenderingMode.call(pdf, 3);

      // Bucket words by quantised font size so we don't emit a setFontSize
      // operator for every single word — that bloats the content stream and
      // slows large pages noticeably.
      type Placed = { text: string; xPt: number; yPt: number };
      const buckets = new Map<number, Placed[]>();
      for (const w of words) {
        if (!w.text.trim()) continue;
        const wPt = (w.bbox.x1 - w.bbox.x0) * pxToPt;
        const hPt = (w.bbox.y1 - w.bbox.y0) * pxToPt;
        if (wPt <= 0 || hPt <= 0) continue;

        // Anchor the invisible glyph at the *alphabetic baseline*, not the
        // bbox bottom. Tesseract exposes a baseline line segment per word;
        // when it's present we use it directly. Otherwise we approximate by
        // pulling the bbox bottom up by a typical descender ratio (~22% of
        // word height) — closer to truth than just using the bbox bottom,
        // which sits below descenders for words containing g/j/p/q/y.
        let baselinePx: number;
        if (w.baseline && w.baseline.has_baseline !== false) {
          baselinePx = (w.baseline.y0 + w.baseline.y1) / 2;
        } else {
          baselinePx = w.bbox.y1 - (w.bbox.y1 - w.bbox.y0) * 0.22;
        }

        // Cap-height to font-size ratio is ~0.7 for typical fonts; bbox
        // height is closer to em-height when the word includes both
        // ascenders and descenders. hPt itself is therefore the better
        // first-order estimate of font size than hPt * 0.85.
        const fontSize = Math.max(2, Math.round(hPt * 2) / 2);
        const list = buckets.get(fontSize) ?? [];
        list.push({
          text: w.text,
          xPt: x + w.bbox.x0 * pxToPt,
          yPt: y + baselinePx * pxToPt,
        });
        buckets.set(fontSize, list);
      }
      for (const [fontSize, list] of buckets) {
        pdf.setFontSize(fontSize);
        for (const placed of list) {
          pdf.text(placed.text, placed.xPt, placed.yPt, { baseline: "alphabetic" });
        }
      }
      if (setRenderingMode) setRenderingMode.call(pdf, 0);

      image.canvas.width = 1;
      image.canvas.height = 1;
    }
  } finally {
    await worker.terminate().catch(() => undefined);
  }

  return pdf.output("blob");
}

export default function VaultClient({ initialFiles }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanDraftPagesRef = useRef<ScanDraftPage[]>([]);
  const [isPending, startTransition] = useTransition();

  const [files, setFiles] = useState<VaultFile[]>(initialFiles);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [uploadCategory, setUploadCategory] = useState<Category>("id-document");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [scannerConverting, setScannerConverting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [liveQuad, setLiveQuad] = useState<Point[] | null>(null);
  const [liveQuadStable, setLiveQuadStable] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [captureFilter, setCaptureFilter] = useState<FilterMode>("original");
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number; status: string } | null>(null);
  const liveQuadRef = useRef<Point[] | null>(null);
  const liveQuadStableSinceRef = useRef<number | null>(null);
  const detectionFrameRef = useRef<number | null>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureLockRef = useRef(false);
  const videoNaturalSizeRef = useRef<{ w: number; h: number } | null>(null);
  // Timestamp (performance.now) of the last frame in which we observed
  // significant device motion. Auto-capture is gated on this being old
  // enough that the device is genuinely settled — visual stability alone
  // can be fooled by a hand drifting smoothly across the frame.
  const motionLastMoveRef = useRef<number>(0);
  const [scanDraftPages, setScanDraftPages] = useState<ScanDraftPage[]>([]);
  const [showScanReview, setShowScanReview] = useState(false);
  const [editingPage, setEditingPage] = useState<ScanDraftPage | null>(null);
  const [autoRotateScans, setAutoRotateScans] = useState(true);
  const [uploadNameInput, setUploadNameInput] = useState("");
  const [scanOutputName, setScanOutputName] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionSuggestion, setVisionSuggestion] = useState<VisionSuggestion | null>(null);
  const [readerFile, setReaderFile] = useState<VaultFile | null>(null);
  const [readerKind, setReaderKind] = useState<ReaderKind>("unsupported");
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerText, setReaderText] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);

  async function analyzeScanDraft(file: File) {
    setVisionAnalyzing(true);
    setVisionSuggestion(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:3001/vision/analyze", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json() as VisionSuggestion;
        setVisionSuggestion(data);
        if (data.category && data.category !== "other") {
          setUploadCategory(data.category);
        }
        if (data.extractedData?.name) {
          setUploadNameInput(data.extractedData.name);
        }
      } else {
        console.warn("Vision analysis failed with status", res.status);
      }
    } catch (error) {
      console.warn("Could not analyze document with vision API", error);
    } finally {
      setVisionAnalyzing(false);
    }
  }

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    scanDraftPagesRef.current = scanDraftPages;
  }, [scanDraftPages]);

  useEffect(() => {
    if (!cameraOpen) return;
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) return;
    if (typeof window === "undefined" || typeof window.DeviceMotionEvent === "undefined") return;

    let cancelled = false;
    const MOTION_THRESHOLD = 0.4;

    const onMotion = (event: DeviceMotionEvent) => {
      const acc = event.acceleration ?? event.accelerationIncludingGravity;
      if (!acc) return;
      const ax = acc.x ?? 0;
      const ay = acc.y ?? 0;
      const az = acc.z ?? 0;
      let magnitude: number;
      if (event.acceleration) {
        magnitude = Math.hypot(ax, ay, az);
      } else {
        magnitude = Math.abs(Math.hypot(ax, ay, az) - 9.8);
      }
      if (magnitude > MOTION_THRESHOLD) {
        motionLastMoveRef.current = performance.now();
      }
    };

    const install = () => {
      if (cancelled) return;
      window.addEventListener("devicemotion", onMotion, { passive: true });
    };

    const motionCtor = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<"granted" | "denied" | "default">;
    };
    if (typeof motionCtor.requestPermission === "function") {
      motionCtor
        .requestPermission()
        .then((result) => {
          if (result === "granted") install();
        })
        .catch(() => undefined);
    } else {
      install();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("devicemotion", onMotion);
      motionLastMoveRef.current = 0;
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) return;
    const video = cameraVideoRef.current;
    if (!video) return;

    let cancelled = false;
    let lastRun = 0;
    const DETECT_INTERVAL_MS = 100;

    const tick = (ts: number) => {
      if (cancelled) return;
      detectionFrameRef.current = requestAnimationFrame(tick);
      if (ts - lastRun < DETECT_INTERVAL_MS) return;
      lastRun = ts;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      videoNaturalSizeRef.current = { w: vw, h: vh };

      let detectCanvas = detectionCanvasRef.current;
      if (!detectCanvas) {
        detectCanvas = document.createElement("canvas");
        detectionCanvasRef.current = detectCanvas;
      }
      const targetSide = 240;
      const scale = Math.min(1, targetSide / Math.max(vw, vh));
      const dw = Math.max(1, Math.round(vw * scale));
      const dh = Math.max(1, Math.round(vh * scale));
      if (detectCanvas.width !== dw) detectCanvas.width = dw;
      if (detectCanvas.height !== dh) detectCanvas.height = dh;

      const ctx = detectCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      try {
        ctx.drawImage(video, 0, 0, dw, dh);
      } catch {
        return;
      }
      const { data } = ctx.getImageData(0, 0, dw, dh);
      const gray = imageDataToGray(data, dw * dh);
      const detected = detectDocumentQuad(gray, dw, dh);

      if (!detected) {
        liveQuadRef.current = null;
        liveQuadStableSinceRef.current = null;
        setLiveQuad((prev) => (prev ? null : prev));
        setLiveQuadStable((prev) => (prev ? false : prev));
        return;
      }

      const upscaled: Point[] = detected.map((p) => ({ x: p.x / scale, y: p.y / scale }));

      const detectDiagonal = quadDiagonal(detected);
      const tolerancePx = Math.max(2, detectDiagonal * AUTO_CAPTURE_TOLERANCE_RATIO);

      const previous = liveQuadRef.current;
      const stableNow =
        previous !== null &&
        quadIsStable(previous, upscaled, tolerancePx / scale);

      liveQuadRef.current = upscaled;
      setLiveQuad(upscaled);

      if (stableNow) {
        if (liveQuadStableSinceRef.current === null) {
          liveQuadStableSinceRef.current = ts;
          setLiveQuadStable(false);
        } else if (ts - liveQuadStableSinceRef.current >= AUTO_CAPTURE_STABLE_MS) {
          setLiveQuadStable(true);
          const areaRatio = quadArea(detected) / (dw * dh);
          const motionQuiet = ts - motionLastMoveRef.current >= 200;
          if (
            autoCapture &&
            !captureLockRef.current &&
            areaRatio >= AUTO_CAPTURE_MIN_AREA_RATIO &&
            motionQuiet
          ) {
            void captureFromInAppCamera();
          }
        }
      } else {
        liveQuadStableSinceRef.current = null;
        setLiveQuadStable(false);
      }
    };

    detectionFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (detectionFrameRef.current !== null) {
        cancelAnimationFrame(detectionFrameRef.current);
        detectionFrameRef.current = null;
      }
    };
  }, [cameraOpen, autoCapture]);

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      scanDraftPagesRef.current.forEach((page) => {
        URL.revokeObjectURL(page.previewUrl);
      });
    };
  }, []);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/app/dashboard");
  }

  async function uploadFileToVault(file: File, successLabel?: string) {
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large — maximum size is ${MAX_SIZE_MB} MB.`);
      return false;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", uploadCategory);

    const res = await fetch("/api/vault", { method: "POST", body: formData });
    const json = await res.json();

    if (!res.ok) {
      setUploadError(json.error ?? "Upload failed. Please try again.");
      setUploading(false);
      return false;
    }

    setUploadSuccess(`${successLabel ?? file.name} uploaded successfully.`);
    setUploading(false);

    startTransition(async () => {
      const listRes = await fetch("/api/vault");
      if (listRes.ok) {
        const updated = await listRes.json();
        setFiles(updated);
      }
    });

    return true;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    let fileToUpload = selectedFile;
    const customName = sanitizeDocumentName(uploadNameInput);
    if (customName) {
      const ext = extensionFromName(selectedFile.name);
      const base = customName.replace(/\.[^.]+$/, "");
      const finalName = ext ? `${base}.${ext}` : base;
      fileToUpload = new File([selectedFile], finalName, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified,
      });
    }

    await uploadFileToVault(fileToUpload);
    setUploadNameInput("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function stopCameraStream() {
    if (!cameraStreamRef.current) return;
    cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  }

  async function openInAppCamera() {
    if (!isMobileViewport) return;

    setCameraError(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera streaming is not available on this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const caps = track && "getCapabilities" in track ? (track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }) : undefined;
      setTorchSupported(Boolean(caps?.torch));
      setTorchOn(false);

      setCameraOpen(true);
    } catch {
      setCameraError("Could not open camera stream. Using image picker instead.");
      scannerInputRef.current?.click();
    } finally {
      setCameraLoading(false);
    }
  }

  async function toggleTorch() {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet & { torch?: boolean }] });
      setTorchOn(next);
    } catch {
      setCameraError("Torch is not available right now.");
    }
  }

  function closeInAppCamera() {
    setCameraOpen(false);
    setCameraError(null);
    setLiveQuad(null);
    setLiveQuadStable(false);
    liveQuadRef.current = null;
    liveQuadStableSinceRef.current = null;
    if (detectionFrameRef.current !== null) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    captureLockRef.current = false;
    videoNaturalSizeRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    stopCameraStream();
  }

  async function addScanDraftFiles(selected: File[]) {
    if (selected.length === 0) return;

    const nextTotal = scanDraftPages.length + selected.length;
    if (nextTotal > MAX_SCAN_PAGES) {
      setUploadError(`Scan limit reached. Please keep each scan PDF to ${MAX_SCAN_PAGES} pages or fewer.`);
      return;
    }

    try {
      const normalizedFiles: File[] = [];

      for (const file of selected) {
        const normalized = await normalizeScanImageFile(file);
        const oriented = autoRotateScans ? await autoRotateScanImageFile(normalized) : normalized;
        normalizedFiles.push(oriented);
      }

      const newPages: ScanDraftPage[] = normalizedFiles.map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        sourceFile: file,
        transforms: { ...IDENTITY_TRANSFORMS },
        renderedFile: file,
        previewUrl: URL.createObjectURL(file),
      }));

      setScanDraftPages((prev) => [...prev, ...newPages]);
      setScanOutputName((prev) => prev || `${uploadCategory}-scan`);
      setShowScanReview(true);

      if (scanDraftPages.length === 0 && newPages.length > 0) {
        void analyzeScanDraft(newPages[0].renderedFile);
      }
    } catch {
      setUploadError("Your phone is low on memory while scanning. Close other apps and retry with one page at a time.");
    }
  }

  async function captureFromInAppCamera() {
    if (captureLockRef.current) return;
    const video = cameraVideoRef.current;
    if (!video) return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) {
      setCameraError("Camera is still starting. Try again in a moment.");
      return;
    }

    captureLockRef.current = true;
    setCameraLoading(true);
    try {
      const maxSide = 2400;
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture camera frame.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(video, 0, 0, width, height);

      const detected = liveQuadRef.current;
      let scaledQuad: Point[] | null = null;
      if (detected && videoNaturalSizeRef.current) {
        const sx = width / videoNaturalSizeRef.current.w;
        const sy = height / videoNaturalSizeRef.current.h;
        scaledQuad = detected.map((p) => ({ x: p.x * sx, y: p.y * sy }));
      }

      setCaptureFlash(true);
      setTimeout(() => setCaptureFlash(false), 120);

      const rawWidth = canvas.width;
      const rawHeight = canvas.height;
      const rawSource = await canvasToSourceFile(canvas);
      const oriented = autoRotateScans ? await autoRotateScanImageFile(rawSource) : rawSource;
      const sourceFile = await normalizeScanImageFile(oriented);

      const sourceDim = await getImageDimensions(sourceFile);
      let sourceQuad: Point[] | null = null;
      if (scaledQuad) {
        const wasRotatedRight = sourceDim.width < sourceDim.height && rawWidth > rawHeight;
        const intermediateW = wasRotatedRight ? rawHeight : rawWidth;
        const intermediateH = wasRotatedRight ? rawWidth : rawHeight;
        const sx = sourceDim.width / intermediateW;
        const sy = sourceDim.height / intermediateH;
        sourceQuad = scaledQuad.map((p) => {
          const rx = wasRotatedRight ? rawHeight - p.y : p.x;
          const ry = wasRotatedRight ? p.x : p.y;
          return { x: rx * sx, y: ry * sy };
        });
      }

      const transforms: ScanTransforms = {
        cropQuad: sourceQuad,
        rotation: 0,
        filter: captureFilter,
      };

      const renderedFile = transformsAffectPixels(transforms)
        ? await renderPage(sourceFile, transforms)
        : sourceFile;

      const newPage: ScanDraftPage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sourceFile.name}`,
        sourceFile,
        transforms,
        renderedFile,
        previewUrl: URL.createObjectURL(renderedFile),
      };

      setScanDraftPages((prev) => {
        const next = [...prev, newPage];
        if (next.length >= MAX_SCAN_PAGES) {
          setUploadError(`Scan limit reached. Please keep each scan PDF to ${MAX_SCAN_PAGES} pages or fewer.`);
        }
        
        if (prev.length === 0) {
          void analyzeScanDraft(newPage.renderedFile);
        }

        return next;
      });
      setScanOutputName((prev) => prev || `${uploadCategory}-scan`);
      setShowScanReview(true);

      liveQuadStableSinceRef.current = null;
      setLiveQuadStable(false);
      setCameraError(null);
    } catch {
      setCameraError("Capture failed due to low memory. Close apps and try again.");
    } finally {
      setCameraLoading(false);
      setTimeout(() => { captureLockRef.current = false; }, 800);
    }
  }

  function handleScanClick() {
    setCameraError(null);
    if (isMobileViewport) {
      void openInAppCamera();
    } else {
      scannerInputRef.current?.click();
    }
  }

  function clearScanDraft() {
    setScanDraftPages((prev) => {
      prev.forEach((page) => {
        URL.revokeObjectURL(page.previewUrl);
      });
      return [];
    });
    setEditingPage(null);
  }

  function removeScanDraftPage(pageId: string) {
    setScanDraftPages((prev) => {
      const page = prev.find((item) => item.id === pageId);
      if (page) {
        URL.revokeObjectURL(page.previewUrl);
      }
      return prev.filter((item) => item.id !== pageId);
    });
  }

  function moveScanDraftPage(pageId: string, direction: "up" | "down") {
    setScanDraftPages((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === pageId);
      if (currentIndex < 0) return prev;
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function handleEditorSave(payload: ScanEditorSavePayload) {
    setScanDraftPages((prev) =>
      prev.map((page) => {
        if (page.id !== payload.pageId) return page;
        URL.revokeObjectURL(page.previewUrl);
        return {
          ...page,
          transforms: payload.transforms,
          renderedFile: payload.renderedFile,
          previewUrl: URL.createObjectURL(payload.renderedFile),
        };
      }),
    );
    setEditingPage(null);
  }

  async function handleScanImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));

    if (selected.length === 0) {
      setUploadError("Select at least one image to scan.");
      if (scannerInputRef.current) scannerInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    await addScanDraftFiles(selected);

    if (scannerInputRef.current) scannerInputRef.current.value = "";
  }

  async function handleCreatePdfFromDraft() {
    if (!scanDraftPages.length) {
      setUploadError("Add at least one scanned page.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setScannerConverting(true);
    setOcrProgress(null);

    try {
      const filesForPdf = scanDraftPages.map((page) => page.renderedFile);
      const pdfBlob = ocrEnabled
        ? await buildSearchablePdfFromImages(filesForPdf, (page, total, status) =>
            setOcrProgress({ page, total, status }),
          )
        : await buildPdfFromImages(filesForPdf);
      const safeBaseName = sanitizeDocumentName(scanOutputName || `${uploadCategory}-scan`) || `${uploadCategory}-scan`;
      const pdfFile = new File(
        [pdfBlob],
        `${safeBaseName}-${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      const pageLabel = `${filesForPdf.length} scanned page${filesForPdf.length > 1 ? "s" : ""} PDF${ocrEnabled ? " (searchable)" : ""}`;
      const uploaded = await uploadFileToVault(pdfFile, pageLabel);
      if (uploaded) {
        if (
          uploadCategory === "matric-transcript" &&
          visionSuggestion?.extractedData?.subjects?.length
        ) {
          try {
            const mappedSubjects = visionSuggestion.extractedData.subjects.map(s => ({
              subject_name: s.name,
              mark: s.percentage
            }));
            await fetch("/api/student-subjects", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subjects: mappedSubjects })
            });
            setUploadSuccess((prev) => `${prev} APS score auto-synced from transcript.`);
          } catch (e) {
            console.error("Failed to auto-sync subjects", e);
          }
        }

        clearScanDraft();
        setScanOutputName("");
        setShowScanReview(false);
        setVisionSuggestion(null);
      }
    } catch {
      setUploadError(
        ocrEnabled
          ? "Could not create searchable PDF. Try again, or turn off Searchable text and retry."
          : "Could not create PDF from your images. Please try again.",
      );
    } finally {
      setScannerConverting(false);
      setOcrProgress(null);
    }
  }

  async  function handleDownload(path: string) {
    window.open(`/api/vault/download?path=${encodeURIComponent(path)}`, "_blank");
  }

  function toggleSelection(path: string) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function handleCancelSelection() {
    setSelectionMode(false);
    setSelectedFiles(new Set());
  }

  async function handleMergeToPdf() {
    if (selectedFiles.size < 2) {
      setUploadError("Please select at least 2 files to merge.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setScannerConverting(true); // Re-use scanner converting overlay

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      // Ensure we maintain order of selection, or just sort them
      const filesToMerge = files.filter(f => selectedFiles.has(f.path));
      
      for (const file of filesToMerge) {
        // Fetch the file through our proxy to avoid CORS
        const res = await fetch(`/api/vault/download?path=${encodeURIComponent(file.path)}`);
        const json = await res.json();
        if (!res.ok || !json.url) throw new Error(`Could not fetch ${file.name}`);
        
        const fileRes = await fetch(json.url);
        const arrayBuffer = await fileRes.arrayBuffer();

        const kind = readerKindForFile(file);
        if (kind === "pdf") {
          const doc = await PDFDocument.load(arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (kind === "image") {
          const isJpg = file.mimeType === "image/jpeg" || file.mimeType === "image/jpg";
          const image = isJpg ? await mergedPdf.embedJpg(arrayBuffer) : await mergedPdf.embedPng(arrayBuffer);
          
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const pdfFile = new File([new Uint8Array(mergedPdfBytes)], `Application_Pack_${Date.now()}.pdf`, { type: "application/pdf" });
      
      // We will upload it to the 'other' category since it's a mix
      const previousCategory = uploadCategory;
      setUploadCategory("other");
      
      const uploaded = await uploadFileToVault(pdfFile, "Application Pack");
      if (uploaded) {
        setUploadSuccess("Successfully merged documents into an Application Pack!");
        handleCancelSelection();
      }
      setUploadCategory(previousCategory);
    } catch (e) {
      setUploadError("Failed to merge documents. Make sure they are PDFs or images.");
      console.error(e);
    } finally {
      setScannerConverting(false);
    }
  }

  async function handleCreateBundle() {
    if (selectedFiles.size === 0) {
      setUploadError("Please select files to bundle.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setScannerConverting(true); // Re-use spinner overlay

    try {
      const paths = Array.from(selectedFiles);
      const res = await fetch("/api/vault/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths,
          title: "My Secure Application Bundle",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create bundle");

      const shareUrl = window.location.origin + json.url;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setUploadSuccess("Secure bundle created! The link has been copied to your clipboard.");
      
      // Clear selection after a delay
      setTimeout(() => {
        handleCancelSelection();
        setUploadSuccess(null);
      }, 5000);
      
    } catch (e) {
      setUploadError("Failed to create secure bundle link.");
      console.error(e);
    } finally {
      setScannerConverting(false);
    }
  }

  const readerBlobUrlRef = useRef<string | null>(null);

  function revokeReaderBlobUrl() {
    if (readerBlobUrlRef.current) {
      URL.revokeObjectURL(readerBlobUrlRef.current);
      readerBlobUrlRef.current = null;
    }
  }

  async function openReader(file: VaultFile) {
    setReaderFile(file);
    setReaderKind(readerKindForFile(file));
    setReaderUrl(null);
    setReaderText(null);
    setReaderError(null);
    setReaderLoading(true);
    revokeReaderBlobUrl();

    try {
      const res = await fetch(`/api/vault/download?path=${encodeURIComponent(file.path)}`);
      const json = await res.json();
      if (!res.ok || !json.url) {
        setReaderError("Could not open this document right now.");
        setReaderLoading(false);
        return;
      }

      const signedUrl = json.url as string;
      const kind = readerKindForFile(file);
      setReaderKind(kind);

      if (kind === "pdf") {
        try {
          const pdfRes = await fetch(signedUrl);
          if (!pdfRes.ok) throw new Error("fetch failed");
          const blob = await pdfRes.blob();
          const blobUrl = URL.createObjectURL(blob);
          readerBlobUrlRef.current = blobUrl;
          setReaderUrl(blobUrl);
        } catch {
          setReaderUrl(signedUrl);
        }
      } else if (kind === "text") {
        setReaderUrl(signedUrl);
        const textRes = await fetch(signedUrl);
        if (!textRes.ok) {
          setReaderError("Could not load text preview.");
        } else {
          setReaderText(await textRes.text());
        }
      } else {
        setReaderUrl(signedUrl);
      }
    } catch {
      setReaderError("Could not open this document right now.");
    } finally {
      setReaderLoading(false);
    }
  }

  function closeReader() {
    revokeReaderBlobUrl();
    setReaderFile(null);
    setReaderUrl(null);
    setReaderText(null);
    setReaderError(null);
    setReaderLoading(false);
  }

  async function handleDelete(path: string) {
    if (deletingPath) return;
    setDeletingPath(path);

    const res = await fetch("/api/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });

    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.path !== path));
    }

    setDeletingPath(null);
  }

  const filtered =
    activeCategory === "all" ? files : files.filter((f) => f.category === activeCategory);
  const pendingScanCount = scanDraftPages.length;

  const countByCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, files.filter((f) => f.category === c.id).length])
  );

  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-gray-50">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-400/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-6 md:px-6 md:pt-10">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 p-6 shadow-xl shadow-gray-200/50 backdrop-blur-xl md:p-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          <div className="relative">
            <button
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-1 rounded-full border border-gray-200/50 bg-white/50 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm transition-all"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-4xl">Document Vault</h1>
              <p className="text-sm font-medium text-gray-500">
                Securely store and organize your application documents.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleScanClick}
                disabled={uploading || scannerConverting}
                className="group relative flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gray-900 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-black hover:shadow-xl hover:shadow-gray-900/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <Camera size={18} />
                </div>
                {scannerConverting ? "Scanning..." : "Scan Document"}
                {pendingScanCount > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white shadow-md shadow-orange-500/20">
                    {pendingScanCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowUploadPanel((v) => !v);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl border border-gray-200/60 bg-white/80 px-5 py-4 text-sm font-bold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-white hover:shadow-md hover:text-gray-900 active:scale-[0.98]"
              >
                <div className="rounded-full bg-gray-100 p-1.5 text-gray-500">
                  <Upload size={18} />
                </div>
                Upload File
              </button>
            </div>
          </div>

          <input
            ref={scannerInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleScanImagesSelect}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </header>

        <ScannerCamera
          cameraOpen={cameraOpen}
          cameraLoading={cameraLoading}
          cameraError={cameraError}
          pendingScanCount={pendingScanCount}
          liveQuad={liveQuad}
          liveQuadStable={liveQuadStable}
          autoCapture={autoCapture}
          torchOn={torchOn}
          torchSupported={torchSupported}
          captureFilter={captureFilter}
          captureFlash={captureFlash}
          scannerConverting={scannerConverting}
          cameraVideoRef={cameraVideoRef}
          videoNaturalSizeRef={videoNaturalSizeRef}
          scannerInputRef={scannerInputRef}
          onClose={closeInAppCamera}
          onCapture={() => void captureFromInAppCamera()}
          onToggleTorch={() => void toggleTorch()}
          onToggleAutoCapture={() => setAutoCapture((v) => !v)}
          onChangeFilter={setCaptureFilter}
        />

        {showScanReview && (
          <ScanReviewGallery
            scanDraftPages={scanDraftPages}
            scannerConverting={scannerConverting}
            uploading={uploading}
            autoRotateScans={autoRotateScans}
            ocrEnabled={ocrEnabled}
            ocrProgress={ocrProgress}
            scanOutputName={scanOutputName}
            uploadCategory={uploadCategory}
            onSetAutoRotateScans={setAutoRotateScans}

            onClearScanDraft={() => {
              setScanDraftPages([]);
              setScanOutputName("");
              setVisionSuggestion(null);
              setShowScanReview(false);
            }}
            onSetUploadCategory={setUploadCategory}
            onSetEditingPage={setEditingPage}
            onMovePage={moveScanDraftPage}
            onRemovePage={removeScanDraftPage}
            onSetScanOutputName={setScanOutputName}
            onSetOcrEnabled={setOcrEnabled}
            onAddPageClick={handleScanClick}
            onCreatePdfClick={() => void handleCreatePdfFromDraft()}
            visionAnalyzing={visionAnalyzing}
            visionSuggestion={visionSuggestion}
          />
        )}

        {/* Upload panel */}
        {showUploadPanel && (
          <div className="mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="rounded-[2rem] border border-white bg-white/60 p-6 shadow-lg shadow-gray-200/50 backdrop-blur-xl md:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-gray-900">Upload a document</h2>
                <button
                  onClick={() => setShowUploadPanel(false)}
                  className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-[13px] font-bold text-gray-900">Document category</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setUploadCategory(c.id)}
                        className={[
                          "rounded-xl border px-4 py-2.5 text-xs font-bold transition-all",
                          uploadCategory === c.id
                            ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20"
                            : "border-gray-200/60 bg-white/80 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900 shadow-sm",
                        ].join(" ")}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[13px] font-bold text-gray-900">
                    Document name <span className="text-gray-400 font-medium">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={uploadNameInput}
                    onChange={(e) => setUploadNameInput(e.target.value)}
                    placeholder="e.g. My certified ID"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-[13px] font-bold text-gray-900">
                    File <span className="text-gray-400 font-medium">(PDF, JPG, PNG, DOCX — max {MAX_SIZE_MB} MB)</span>
                  </label>
                  <div className="mt-2 relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-white/50 px-4 py-6 transition-colors hover:border-orange-400 hover:bg-orange-50/50 text-gray-500">
                      <div className="rounded-full bg-gray-100 p-3">
                        <Upload size={20} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700">Click to browse or drag and drop</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5">Supported formats: PDF, Images, Word</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(uploading || scannerConverting) && (
                  <div className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500/30 border-t-orange-500" />
                    {scannerConverting ? "Processing scan..." : "Uploading securely..."}
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm font-bold text-red-600 backdrop-blur-sm">
                    <AlertCircle size={16} />
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-700 backdrop-blur-sm">
                    <CheckCircle2 size={16} />
                    {uploadSuccess}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category filter & Select Toggle */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x px-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={[
                "shrink-0 snap-start rounded-full border px-4 py-2 text-xs font-bold transition-all",
                activeCategory === "all"
                  ? "border-gray-900 bg-gray-900 text-white shadow-md shadow-gray-900/20"
                  : "border-gray-200/80 bg-white/60 text-gray-600 backdrop-blur-md hover:border-gray-300 hover:bg-white hover:text-gray-900 shadow-sm",
              ].join(" ")}
            >
              All <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{files.length}</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={[
                  "shrink-0 snap-start rounded-full border px-4 py-2 text-xs font-bold transition-all",
                  activeCategory === cat.id
                    ? "border-gray-900 bg-gray-900 text-white shadow-md shadow-gray-900/20"
                    : "border-gray-200/80 bg-white/60 text-gray-600 backdrop-blur-md hover:border-gray-300 hover:bg-white hover:text-gray-900 shadow-sm",
                ].join(" ")}
              >
                {cat.label} <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">{countByCategory[cat.id] ?? 0}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              if (selectionMode) handleCancelSelection();
              else setSelectionMode(true);
            }}
            className={`shrink-0 mb-2 flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
              selectionMode
                ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                : "border-gray-200/80 bg-white/60 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900 shadow-sm backdrop-blur-md"
            }`}
          >
            <CheckSquare size={14} />
            {selectionMode ? "Done" : "Select"}
          </button>
        </div>

        {/* File list */}
        <div className="mt-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-300 bg-white/40 py-20 backdrop-blur-sm">
              <div className="rounded-full bg-gray-100 p-4 shadow-inner mb-4">
                <FolderOpen size={32} className="text-gray-400" />
              </div>
              <p className="text-base font-bold text-gray-900">
                {files.length === 0 ? "Your vault is empty" : "No documents found"}
              </p>
              <p className="mt-1.5 max-w-sm text-center text-sm font-medium text-gray-500">
                {files.length === 0
                  ? "Scan or upload your first document to get started."
                  : "Try selecting a different category or add a new document."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((file) => {
                const meta = categoryMeta(file.category);
                const typeMeta = fileTypeMeta(file);
                const isDeleting = deletingPath === file.path;
                return (
                  <div
                    key={file.path}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelection(file.path);
                      } else {
                        void openReader(file);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (selectionMode) toggleSelection(file.path);
                        else void openReader(file);
                      }
                    }}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border p-4 shadow-sm backdrop-blur-md transition-all hover:shadow-md active:scale-[0.98] ${
                      selectionMode && selectedFiles.has(file.path)
                        ? "border-orange-500 bg-orange-50/80 ring-2 ring-orange-200"
                        : "border-white bg-white/60 hover:border-orange-200 hover:bg-white"
                    }`}
                  >
                    {selectionMode && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                          selectedFiles.has(file.path)
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-gray-300 bg-white/80"
                        }`}>
                          {selectedFiles.has(file.path) && <CheckCircle2 size={16} />}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${typeMeta.iconBg} shadow-inner`}>
                        <FileText size={20} className={typeMeta.iconText} />
                      </div>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="truncate text-[15px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                          {fileDisplayName(file.name)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${typeMeta.chip}`}>
                            {typeMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100/50 pt-3">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400">
                        <span>{formatSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                      
                      <div
                        className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDownload(file.path)}
                          className="rounded-full bg-gray-100 p-2 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-900"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(file.path)}
                          disabled={isDeleting || isPending}
                          className="rounded-full bg-red-50 p-2 text-red-400 transition-all hover:bg-red-100 hover:text-red-600 disabled:opacity-40"
                          title="Delete"
                        >
                          {isDeleting ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Bar for Selection Mode */}
        {selectionMode && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between rounded-full border border-gray-200 bg-white/90 p-2 shadow-xl backdrop-blur-xl">
              <span className="ml-4 text-sm font-bold text-gray-700">
                {selectedFiles.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelSelection}
                  className="rounded-full px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBundle}
                  disabled={selectedFiles.size === 0}
                  className="flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600 disabled:opacity-50"
                >
                  <Link size={16} /> Bundle
                </button>
                <button
                  onClick={handleMergeToPdf}
                  disabled={selectedFiles.size < 2}
                  className="flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-md shadow-gray-900/20 transition-all hover:bg-black disabled:opacity-50"
                >
                  <Layers size={16} /> Merge
                </button>
              </div>
            </div>
          </div>
        )}

        {readerFile && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6">
            <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white md:h-[86vh] md:rounded-3xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 md:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{fileDisplayName(readerFile.name)}</p>
                  <p className="truncate text-[11px] text-gray-400">{formatSize(readerFile.size)} · {readerFile.mimeType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(readerFile.path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    <Download size={13} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={closeReader}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                    aria-label="Close reader"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-gray-50">
                {readerLoading ? (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-gray-500">Loading document...</div>
                ) : readerError ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">{readerError}</div>
                ) : readerKind === "pdf" && readerUrl ? (
                  <iframe
                    src={readerUrl}
                    className="h-full w-full border-0"
                    title="PDF reader"
                  />
                ) : readerKind === "image" && readerUrl ? (
                  <div className="flex h-full items-center justify-center p-4">
                    <img src={readerUrl} alt={fileDisplayName(readerFile.name)} className="max-h-full max-w-full rounded-xl border border-gray-200 object-contain" />
                  </div>
                ) : readerKind === "text" ? (
                  <pre className="h-full overflow-auto whitespace-pre-wrap p-4 text-xs text-gray-700">{readerText ?? "No text content found."}</pre>
                ) : readerKind === "office" ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <FileText size={36} className="text-gray-300" />
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Office documents open in your device&apos;s app.</p>
                      <p className="mt-1 text-xs text-gray-500">Download to open in Word, Pages, Google Docs, or your preferred viewer.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(readerFile.path)}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"
                    >
                      <Download size={14} />
                      Download file
                    </button>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <p className="text-sm font-semibold text-gray-700">This file type cannot be previewed here yet.</p>
                    <button
                      type="button"
                      onClick={() => handleDownload(readerFile.path)}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"
                    >
                      <Download size={14} />
                      Download file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Inline editor — renders as a fixed overlay, no navigation, no base64 */}
    {editingPage && (
      <ScanEditor
        page={editingPage}
        onSave={handleEditorSave}
        onClose={() => setEditingPage(null)}
      />
    )}
    </>
  );
}
