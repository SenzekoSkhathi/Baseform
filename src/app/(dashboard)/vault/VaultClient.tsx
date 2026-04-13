"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  FolderOpen,
  Upload,
  Camera,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Trash2,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export type VaultFile = {
  path: string;
  name: string;
  category: Category;
  size: number;
  createdAt: string;
  mimeType: string;
};

const CATEGORIES = [
  { id: "id-document", label: "ID Document", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { id: "matric-transcript", label: "Matric Transcript", color: "bg-green-50 text-green-700 border-green-100" },
  { id: "proof-of-address", label: "Proof of Address", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { id: "motivational-letter", label: "Motivational Letter", color: "bg-amber-50 text-amber-700 border-amber-100" },
  { id: "other", label: "Other", color: "bg-gray-100 text-gray-600 border-gray-200" },
] as const;

type Category = (typeof CATEGORIES)[number]["id"];

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MAX_SCAN_PAGES = 12;

function categoryMeta(id: Category) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

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

function readerKindForFile(file: VaultFile): ReaderKind {
  const ext = extensionFromName(file.name);
  const mime = file.mimeType.toLowerCase();

  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
  if (mime.startsWith("text/") || ["txt", "md", "csv", "json"].includes(ext)) return "text";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "office";

  return "unsupported";
}

function clampByte(value: number): number {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function detectDocumentBounds(gray: Uint8ClampedArray, width: number, height: number) {
  const cornerSample = Math.max(8, Math.round(Math.min(width, height) * 0.04));
  const sampleStep = 2;

  const read = (x: number, y: number) => gray[y * width + x];
  let sum = 0;
  let count = 0;

  for (let y = 0; y < cornerSample; y += sampleStep) {
    for (let x = 0; x < cornerSample; x += sampleStep) {
      sum += read(x, y);
      sum += read(width - 1 - x, y);
      sum += read(x, height - 1 - y);
      sum += read(width - 1 - x, height - 1 - y);
      count += 4;
    }
  }

  const background = count > 0 ? sum / count : 240;
  const delta = 18;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let matches = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const pixel = read(x, y);
      if (Math.abs(pixel - background) <= delta) continue;

      matches += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (matches < 80 || maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, width, height };
  }

  const detectedWidth = maxX - minX + 1;
  const detectedHeight = maxY - minY + 1;
  const detectedArea = detectedWidth * detectedHeight;
  const fullArea = width * height;

  // Fallback when detection is unreliable (too small/too large relative to frame).
  if (detectedArea < fullArea * 0.18 || detectedArea > fullArea * 0.98) {
    return { x: 0, y: 0, width, height };
  }

  const pad = Math.max(10, Math.round(Math.min(width, height) * 0.02));
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  const w = Math.min(width - x, detectedWidth + pad * 2);
  const h = Math.min(height - y, detectedHeight + pad * 2);

  return { x, y, width: w, height: h };
}

async function loadImageForPdf(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read one of the selected images."));
      img.src = objectUrl;
    });

    // Keep scan pages lightweight for lower-memory phones.
    const maxSide = 1400;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Could not process image.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const source = context.getImageData(0, 0, width, height);
    const rgba = source.data;
    const gray = new Uint8ClampedArray(width * height);

    for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
      gray[p] = clampByte(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
    }

    const bounds = detectDocumentBounds(gray, width, height);
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = bounds.width;
    outputCanvas.height = bounds.height;
    const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
    if (!outputContext) throw new Error("Could not process image.");

    const output = outputContext.createImageData(bounds.width, bounds.height);
    const outputRgba = output.data;

    for (let y = 0; y < bounds.height; y += 1) {
      for (let x = 0; x < bounds.width; x += 1) {
        const sourceIndex = (bounds.y + y) * width + (bounds.x + x);
        const targetIndex = (y * bounds.width + x) * 4;
        const base = gray[sourceIndex];

        // Scanner-style cleanup: grayscale + boosted contrast with brighter whites.
        let enhanced = clampByte((base - 128) * 1.45 + 128 + 6);
        if (enhanced > 222) enhanced = 255;

        outputRgba[targetIndex] = enhanced;
        outputRgba[targetIndex + 1] = enhanced;
        outputRgba[targetIndex + 2] = enhanced;
        outputRgba[targetIndex + 3] = 255;
      }
    }

    outputContext.putImageData(output, 0, 0);

    return {
      dataUrl: outputCanvas.toDataURL("image/jpeg", 0.82),
      width: bounds.width,
      height: bounds.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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

    pdf.addImage(image.dataUrl, "JPEG", x, y, renderWidth, renderHeight, undefined, "FAST");
  }

  return pdf.output("blob");
}

type Props = {
  initialFiles: VaultFile[];
};

type ScanDraftPage = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function VaultClient({ initialFiles }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);
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
  const [scanDraftPages, setScanDraftPages] = useState<ScanDraftPage[]>([]);
  const [showScanReview, setShowScanReview] = useState(false);
  const [uploadNameInput, setUploadNameInput] = useState("");
  const [scanOutputName, setScanOutputName] = useState("");
  const [readerFile, setReaderFile] = useState<VaultFile | null>(null);
  const [readerKind, setReaderKind] = useState<ReaderKind>("unsupported");
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [readerText, setReaderText] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);

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
    return () => {
      scanDraftPagesRef.current.forEach((page) => URL.revokeObjectURL(page.previewUrl));
    };
  }, []);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
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

    // Refresh file list
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

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleScanClick() {
    if (!isMobileViewport) return;
    scannerInputRef.current?.click();
  }

  function clearScanDraft() {
    setScanDraftPages((prev) => {
      prev.forEach((page) => URL.revokeObjectURL(page.previewUrl));
      return [];
    });
  }

  function removeScanDraftPage(pageId: string) {
    setScanDraftPages((prev) => {
      const page = prev.find((item) => item.id === pageId);
      if (page) URL.revokeObjectURL(page.previewUrl);
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

  async function handleScanImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));

    if (selected.length === 0) {
      setUploadError("Select at least one image to scan.");
      if (scannerInputRef.current) scannerInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);

    const nextTotal = scanDraftPages.length + selected.length;
    if (nextTotal > MAX_SCAN_PAGES) {
      setUploadError(`Scan limit reached. Please keep each scan PDF to ${MAX_SCAN_PAGES} pages or fewer.`);
      if (scannerInputRef.current) scannerInputRef.current.value = "";
      return;
    }

    const newPages: ScanDraftPage[] = selected.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setScanDraftPages((prev) => [...prev, ...newPages]);
    setScanOutputName((prev) => prev || `${uploadCategory}-scan`);
    setShowScanReview(true);

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

    try {
      const filesForPdf = scanDraftPages.map((page) => page.file);
      const pdfBlob = await buildPdfFromImages(filesForPdf);
      const safeBaseName = sanitizeDocumentName(scanOutputName || `${uploadCategory}-scan`) || `${uploadCategory}-scan`;
      const pdfFile = new File(
        [pdfBlob],
        `${safeBaseName}-${Date.now()}.pdf`,
        { type: "application/pdf" }
      );

      const pageLabel = `${filesForPdf.length} scanned page${filesForPdf.length > 1 ? "s" : ""} PDF`;
      const uploaded = await uploadFileToVault(pdfFile, pageLabel);
      if (uploaded) {
        clearScanDraft();
        setScanOutputName("");
        setShowScanReview(false);
      }
    } catch {
      setUploadError("Could not create PDF from your images. Please try again.");
    } finally {
      setScannerConverting(false);
    }
  }

  async function handleDownload(path: string) {
    const res = await fetch(`/api/vault/download?path=${encodeURIComponent(path)}`);
    const json = await res.json();
    if (!res.ok || !json.url) return;
    window.open(json.url, "_blank", "noopener,noreferrer");
  }

  async function openReader(file: VaultFile) {
    setReaderFile(file);
    setReaderKind(readerKindForFile(file));
    setReaderUrl(null);
    setReaderText(null);
    setReaderError(null);
    setReaderLoading(true);

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
      setReaderUrl(signedUrl);

      if (kind === "text") {
        const textRes = await fetch(signedUrl);
        if (!textRes.ok) {
          setReaderError("Could not load text preview.");
        } else {
          setReaderText(await textRes.text());
        }
      }
    } catch {
      setReaderError("Could not open this document right now.");
    } finally {
      setReaderLoading(false);
    }
  }

  function closeReader() {
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
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_8%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_92%_14%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-8 pt-6 md:px-6 md:pt-8">
        {/* Header */}
        <header className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_16px_45px_rgba(249,115,22,0.12)] md:p-6">
          <button
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Document Vault</h1>
              <p className="text-sm font-medium text-gray-500">
                Store and organise your application documents securely.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
            <button
              onClick={handleScanClick}
              disabled={uploading || scannerConverting || !isMobileViewport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              title={isMobileViewport ? "Scan document" : "Document scanner is available on mobile"}
            >
              <Camera size={15} />
              {scannerConverting ? "Scanning..." : "Scanner"}
              {pendingScanCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <Upload size={15} />
              Upload
            </button>
          </div>

          <input
            ref={scannerInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleScanImagesSelect}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

        </header>

        {isMobileViewport && showScanReview && (
          <section className="mt-4 rounded-3xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-gray-900">Scan Preview</h2>
              <button
                type="button"
                onClick={() => {
                  clearScanDraft();
                  setShowScanReview(false);
                }}
                disabled={scannerConverting}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
              >
                Clear
              </button>
            </div>

            {scanDraftPages.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">No pages yet. Tap Scan to PDF to capture pages.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {scanDraftPages.map((page, index) => (
                  <div key={page.id} className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white p-2">
                    <img
                      src={page.previewUrl}
                      alt={`Scanned page ${index + 1}`}
                      className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-800">Page {index + 1}</p>
                      <p className="truncate text-[11px] text-gray-400">{page.file.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveScanDraftPage(page.id, "up")}
                        disabled={index === 0 || scannerConverting}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                        aria-label={`Move page ${index + 1} up`}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScanDraftPage(page.id, "down")}
                        disabled={index === scanDraftPages.length - 1 || scannerConverting}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                        aria-label={`Move page ${index + 1} down`}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeScanDraftPage(page.id)}
                        disabled={scannerConverting}
                        className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        aria-label={`Remove page ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500">PDF name</label>
              <input
                type="text"
                value={scanOutputName}
                onChange={(e) => setScanOutputName(e.target.value)}
                placeholder="e.g. Grade 11 Report"
                disabled={scannerConverting}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleScanClick}
                disabled={scannerConverting || uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                <Camera size={13} />
                Add page
              </button>
              <button
                type="button"
                onClick={handleCreatePdfFromDraft}
                disabled={!scanDraftPages.length || scannerConverting || uploading}
                className="flex-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {scannerConverting ? "Creating PDF..." : `Create PDF (${scanDraftPages.length})`}
              </button>
            </div>
          </section>
        )}

        {/* Upload panel */}
        {showUploadPanel && (
          <div className="mt-4 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Upload a document</h2>
              <button
                onClick={() => setShowUploadPanel(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Document category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as Category)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  Document name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={uploadNameInput}
                  onChange={(e) => setUploadNameInput(e.target.value)}
                  placeholder="e.g. My certified ID"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">
                  File <span className="text-gray-400">(PDF, JPG, PNG, DOCX — max {MAX_SIZE_MB} MB)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-orange-600 disabled:opacity-60"
                />
              </div>

              {isMobileViewport && (
                <button
                  type="button"
                  onClick={handleScanClick}
                  disabled={uploading || scannerConverting}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <Camera size={14} />
                  {scannerConverting ? "Converting images to PDF..." : "Scan document with camera (mobile)"}
                  {pendingScanCount > 0 && (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {pendingScanCount}
                    </span>
                  )}
                </button>
              )}

              {(uploading || scannerConverting) && (
                <p className="text-xs font-medium text-orange-500">
                  {scannerConverting ? "Processing scan..." : "Uploading..."}
                </p>
              )}

              {uploadError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                  <AlertCircle size={14} />
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                  <CheckCircle2 size={14} />
                  {uploadSuccess}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={[
              "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              activeCategory === "all"
                ? "border-orange-200 bg-orange-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            All ({files.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={[
                "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                activeCategory === cat.id
                  ? "border-orange-200 bg-orange-500 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              {cat.label} ({countByCategory[cat.id] ?? 0})
            </button>
          ))}
        </div>

        {/* File list */}
        <section className="mt-3 rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-sm md:p-5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FolderOpen size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-700">
                {files.length === 0 ? "No documents yet" : "No documents in this category"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {files.length === 0
                  ? "Upload your first document using the button above."
                  : "Switch to a different category or upload a new document."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((file) => {
                const meta = categoryMeta(file.category);
                const isDeleting = deletingPath === file.path;
                return (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                      <FileText size={18} className="text-orange-400" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {fileDisplayName(file.name)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-gray-400">{formatSize(file.size)}</span>
                        <span className="text-[11px] text-gray-400">{formatDate(file.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openReader(file)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Open"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleDownload(file.path)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        title="Download"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.path)}
                        disabled={isDeleting || isPending}
                        className="rounded-lg p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

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
                ) : readerKind === "office" && readerUrl ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(readerUrl)}`}
                    className="h-full w-full border-0"
                    title="Office document reader"
                  />
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
  );
}
