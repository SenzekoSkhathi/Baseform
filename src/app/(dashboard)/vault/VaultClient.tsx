"use client";

import { useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  FolderOpen,
  Upload,
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

type Props = {
  initialFiles: VaultFile[];
};

export default function VaultClient({ initialFiles }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [files, setFiles] = useState<VaultFile[]>(initialFiles);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [uploadCategory, setUploadCategory] = useState<Category>("id-document");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large — maximum size is ${MAX_SIZE_MB} MB.`);
      return;
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
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadSuccess(`${file.name} uploaded successfully.`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Refresh file list
    startTransition(async () => {
      const listRes = await fetch("/api/vault");
      if (listRes.ok) {
        const updated = await listRes.json();
        setFiles(updated);
      }
    });
  }

  async function handleDownload(path: string) {
    const res = await fetch(`/api/vault/download?path=${encodeURIComponent(path)}`);
    const json = await res.json();
    if (!res.ok || !json.url) return;
    window.open(json.url, "_blank", "noopener,noreferrer");
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

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Document Vault</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Store and organise your application documents securely.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUploadPanel((v) => !v);
                setUploadError(null);
                setUploadSuccess(null);
              }}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <Upload size={15} />
              Upload
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400">Total documents</p>
              <p className="mt-0.5 text-2xl font-black text-gray-900">{files.length}</p>
            </div>
            {CATEGORIES.slice(0, 2).map((cat) => (
              <div key={cat.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                <p className="text-xs text-gray-400">{cat.label}</p>
                <p className="mt-0.5 text-2xl font-black text-gray-900">{countByCategory[cat.id] ?? 0}</p>
              </div>
            ))}
          </div>
        </header>

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

              {uploading && (
                <p className="text-xs font-medium text-orange-500">Uploading...</p>
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
      </div>
    </div>
  );
}
