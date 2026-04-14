"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { ChevronLeft, Check, Loader2 } from "lucide-react";

const EDITOR_INPUT_PREFIX = "vault-editor-input:";
const EDITOR_RESULT_KEY = "vault-editor-result";
const SCAN_IMAGE_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.55,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  initialQuality: 0.74,
} as const;

type EditorPayload = {
  pageId: string;
  dataUrl: string;
  fileName: string;
  isTextEnhanced?: boolean;
  fallbackDataUrl?: string | null;
  isEdited?: boolean;
};

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

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return imageCompression.getDataUrlFromFile(file);
}

async function normalizeDataUrl(dataUrl: string, fileName: string): Promise<string> {
  const file = await dataUrlToFile(dataUrl, fileName);
  const compressed = await imageCompression(file, {
    ...SCAN_IMAGE_COMPRESSION_OPTIONS,
    maxSizeMB: 0.45,
  });
  return fileToDataUrl(compressed);
}

async function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = dataUrl;
  });
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channelOffset: number
): number {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));

  const fx = x - x0;
  const fy = y - y0;

  const i00 = (y0 * width + x0) * 4 + channelOffset;
  const i10 = (y0 * width + x1) * 4 + channelOffset;
  const i01 = (y1 * width + x0) * 4 + channelOffset;
  const i11 = (y1 * width + x1) * 4 + channelOffset;

  const top = data[i00] * (1 - fx) + data[i10] * fx;
  const bottom = data[i01] * (1 - fx) + data[i11] * fx;
  return top * (1 - fy) + bottom * fy;
}

function applyHorizontalPerspectiveCorrection(
  sourceCanvas: HTMLCanvasElement,
  perspective: number
): HTMLCanvasElement {
  if (Math.abs(perspective) < 0.001) return sourceCanvas;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return sourceCanvas;

  const sourceImage = sourceContext.getImageData(0, 0, width, height);
  const input = sourceImage.data;
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
  if (!outputContext) return sourceCanvas;

  const outputImage = outputContext.createImageData(width, height);
  const output = outputImage.data;

  const insetMax = Math.round(width * 0.22 * Math.min(1, Math.abs(perspective)));
  const topInset = perspective > 0 ? insetMax : 0;
  const bottomInset = perspective < 0 ? insetMax : 0;

  for (let y = 0; y < height; y += 1) {
    const t = height <= 1 ? 0 : y / (height - 1);
    const left = topInset * (1 - t) + bottomInset * t;
    const right = (width - 1 - topInset) * (1 - t) + (width - 1 - bottomInset) * t;
    const span = Math.max(1, right - left);

    for (let x = 0; x < width; x += 1) {
      const ratio = width <= 1 ? 0 : x / (width - 1);
      const sourceX = left + ratio * span;
      const targetIndex = (y * width + x) * 4;

      output[targetIndex] = clampByte(sampleBilinear(input, width, height, sourceX, y, 0));
      output[targetIndex + 1] = clampByte(sampleBilinear(input, width, height, sourceX, y, 1));
      output[targetIndex + 2] = clampByte(sampleBilinear(input, width, height, sourceX, y, 2));
      output[targetIndex + 3] = 255;
    }
  }

  outputContext.putImageData(outputImage, 0, 0);
  return outputCanvas;
}

export default function VaultEditorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const pageId = useMemo(() => params.get("pageId") ?? "", [params]);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("scan.jpg");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [initialImageDataUrl, setInitialImageDataUrl] = useState<string | null>(null);
  const [fallbackDataUrl, setFallbackDataUrl] = useState<string | null>(null);
  const [isTextEnhanced, setIsTextEnhanced] = useState(false);
  const [initialIsTextEnhanced, setInitialIsTextEnhanced] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [cropPerspective, setCropPerspective] = useState(0);

  useEffect(() => {
    if (!pageId) {
      setError("No page selected.");
      setIsReady(true);
      return;
    }

    try {
      const raw = sessionStorage.getItem(`${EDITOR_INPUT_PREFIX}${pageId}`);
      if (!raw) {
        setError("Could not load this page for editing.");
        setIsReady(true);
        return;
      }

      const payload = JSON.parse(raw) as EditorPayload;
      setImageDataUrl(payload.dataUrl);
      setInitialImageDataUrl(payload.dataUrl);
      setFallbackDataUrl(payload.fallbackDataUrl ?? null);
      setIsTextEnhanced(Boolean(payload.isTextEnhanced));
      setInitialIsTextEnhanced(Boolean(payload.isTextEnhanced));
      setFileName(payload.fileName || `scan-${Date.now()}.jpg`);
      setIsReady(true);
    } catch {
      setError("Could not load this page for editing.");
      setIsReady(true);
    }
  }, [pageId]);

  const withProcessing = async (work: () => Promise<void>, failMessage: string) => {
    setError(null);
    setProcessing(true);
    try {
      await work();
    } catch {
      setError(failMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = async (direction: "left" | "right") => {
    if (!imageDataUrl) return;

    await withProcessing(async () => {
      const image = await loadImageFromDataUrl(imageDataUrl);
      const rotateRight = direction === "right";
      const canvas = document.createElement("canvas");
      canvas.width = image.height;
      canvas.height = image.width;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No context");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotateRight ? 90 : -90) * (Math.PI / 180));
      context.drawImage(image, -image.width / 2, -image.height / 2);

      const rotatedUrl = canvas.toDataURL("image/jpeg", 0.84);
      canvas.width = 1;
      canvas.height = 1;
      const normalized = await normalizeDataUrl(rotatedUrl, fileName);

      setImageDataUrl(normalized);
      setFallbackDataUrl(null);
      setIsTextEnhanced(false);
      setShowCompare(false);
    }, "Could not rotate this image.");
  };

  const handleEnhanceToggle = async () => {
    if (!imageDataUrl) return;

    if (isTextEnhanced && fallbackDataUrl) {
      setImageDataUrl(fallbackDataUrl);
      setFallbackDataUrl(null);
      setIsTextEnhanced(false);
      setShowCompare(false);
      return;
    }

    await withProcessing(async () => {
      const image = await loadImageFromDataUrl(imageDataUrl);
      const width = image.width;
      const height = image.height;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No context");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const source = context.getImageData(0, 0, width, height);
      const rgba = source.data;

      for (let i = 0; i < rgba.length; i += 4) {
        const gray = clampByte(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
        let enhanced = clampByte((gray - 128) * 1.55 + 128 + 8);
        if (enhanced > 218) enhanced = 255;

        rgba[i] = enhanced;
        rgba[i + 1] = enhanced;
        rgba[i + 2] = enhanced;
        rgba[i + 3] = 255;
      }

      context.putImageData(source, 0, 0);
      const enhancedUrl = canvas.toDataURL("image/jpeg", 0.84);
      canvas.width = 1;
      canvas.height = 1;
      const normalized = await normalizeDataUrl(enhancedUrl, fileName);

      setFallbackDataUrl(imageDataUrl);
      setImageDataUrl(normalized);
      setIsTextEnhanced(true);
    }, "Could not enhance text on this image.");
  };

  const handleSmartCrop = async () => {
    if (!imageDataUrl) return;

    await withProcessing(async () => {
      const image = await loadImageFromDataUrl(imageDataUrl);
      const width = image.width;
      const height = image.height;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No context");
      context.drawImage(image, 0, 0, width, height);

      const source = context.getImageData(0, 0, width, height);
      const rgba = source.data;
      const gray = new Uint8ClampedArray(width * height);

      for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
        gray[p] = clampByte(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114);
      }

      const bounds = detectDocumentBounds(gray, width, height);
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = bounds.width;
      cropCanvas.height = bounds.height;
      const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
      if (!cropContext) throw new Error("No context");

      cropContext.fillStyle = "#ffffff";
      cropContext.fillRect(0, 0, bounds.width, bounds.height);
      cropContext.drawImage(
        image,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
      );

      const croppedUrl = cropCanvas.toDataURL("image/jpeg", 0.84);
      canvas.width = 1;
      canvas.height = 1;
      cropCanvas.width = 1;
      cropCanvas.height = 1;
      const normalized = await normalizeDataUrl(croppedUrl, fileName);
      setImageDataUrl(normalized);
      setFallbackDataUrl(null);
      setIsTextEnhanced(false);
      setShowCompare(false);
    }, "Smart crop failed on this image.");
  };

  const handleApplyCrop = async () => {
    if (!imageDataUrl || !cropAreaPixels) return;

    await withProcessing(async () => {
      const image = await loadImageFromDataUrl(imageDataUrl);
      const cropX = Math.max(0, Math.round(cropAreaPixels.x));
      const cropY = Math.max(0, Math.round(cropAreaPixels.y));
      const cropWidth = Math.max(1, Math.round(cropAreaPixels.width));
      const cropHeight = Math.max(1, Math.round(cropAreaPixels.height));

      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("No context");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, cropWidth, cropHeight);
      context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

      const perspectiveCanvas = applyHorizontalPerspectiveCorrection(canvas, cropPerspective);
      const croppedUrl = perspectiveCanvas.toDataURL("image/jpeg", 0.84);
      canvas.width = 1;
      canvas.height = 1;
      if (perspectiveCanvas !== canvas) {
        perspectiveCanvas.width = 1;
        perspectiveCanvas.height = 1;
      }
      const normalized = await normalizeDataUrl(croppedUrl, fileName);

      setImageDataUrl(normalized);
      setFallbackDataUrl(null);
      setIsTextEnhanced(false);
      setShowCompare(false);
    }, "Could not apply crop.");
  };

  const handleSaveAndBack = async () => {
    if (!imageDataUrl || !pageId) return;

    const hasEdits =
      imageDataUrl !== initialImageDataUrl ||
      isTextEnhanced !== initialIsTextEnhanced;

    const payload: EditorPayload = {
      pageId,
      dataUrl: imageDataUrl,
      fileName,
      isTextEnhanced,
      fallbackDataUrl,
      isEdited: hasEdits,
    };

    sessionStorage.setItem(EDITOR_RESULT_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(`${EDITOR_INPUT_PREFIX}${pageId}`);
    router.replace("/vault");
  };

  const handleBack = () => {
    if (pageId) sessionStorage.removeItem(`${EDITOR_INPUT_PREFIX}${pageId}`);
    router.replace("/vault");
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff9f2] text-gray-600">
        <Loader2 size={18} className="mr-2 animate-spin" />
        Loading editor...
      </div>
    );
  }

  if (error || !imageDataUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff9f2] p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-600">{error || "Could not load editor."}</p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
          >
            Back to vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700"
        >
          <ChevronLeft size={14} />
          Back
        </button>

        <p className="truncate px-3 text-xs font-semibold text-gray-500">Image Editor</p>

        <button
          type="button"
          onClick={handleSaveAndBack}
          disabled={processing}
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          <Check size={14} />
          Save
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50 px-4 py-2 scrollbar-none">
        <button
          type="button"
          onClick={handleEnhanceToggle}
          disabled={processing}
          className={[
            "shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-60",
            isTextEnhanced
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-emerald-100 bg-white text-emerald-700",
          ].join(" ")}
        >
          {isTextEnhanced ? "Show original" : "Enhance text"}
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

      {isTextEnhanced && fallbackDataUrl && (
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

      {showCompare && fallbackDataUrl && (
        <div className="grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50 p-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <p className="border-b border-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Original</p>
            <img src={fallbackDataUrl} alt="Original scan" className="h-24 w-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
            <p className="border-b border-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">Enhanced</p>
            <img src={imageDataUrl} alt="Enhanced scan" className="h-24 w-full object-cover" />
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1 bg-black">
        <Cropper
          image={imageDataUrl}
          crop={cropPosition}
          zoom={cropZoom}
          aspect={undefined}
          onCropChange={setCropPosition}
          onZoomChange={setCropZoom}
          onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)}
          showGrid
          objectFit="contain"
        />
      </div>

      <div className="space-y-3 border-t border-gray-100 px-4 py-3">
        {processing && (
          <div className="text-xs font-semibold text-orange-600">Processing image...</div>
        )}
        {error && (
          <div className="text-xs font-semibold text-red-600">{error}</div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-gray-600">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={cropZoom}
            onChange={(e) => setCropZoom(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-600">Perspective correction</label>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={cropPerspective}
            onChange={(e) => setCropPerspective(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </div>

        <button
          type="button"
          onClick={handleApplyCrop}
          disabled={!cropAreaPixels || processing}
          className="w-full rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          Apply crop
        </button>
      </div>
    </div>
  );
}
