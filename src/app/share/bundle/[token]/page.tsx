import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { FileText, Download, Calendar, ShieldCheck, Lock } from "lucide-react";

export default async function SharedBundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ u: string }>;
}) {
  const { token } = await params;
  const { u: userId } = await searchParams;

  if (!token || !userId) {
    notFound();
  }

  const admin = createAdminClient();

  // Fetch the bundle JSON from the user's storage
  const { data, error } = await admin.storage
    .from("documents")
    .download(`${userId}/bundles/${token}.json`);

  if (error || !data) {
    notFound();
  }

  const bundleData = JSON.parse(await data.text()) as {
    userId: string;
    title: string;
    paths: string[];
    createdAt: string;
    expiresAt: string;
  };

  if (new Date(bundleData.expiresAt) < new Date()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="mb-4 rounded-full bg-red-100 p-4 text-red-500">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
        <p className="mt-2 text-sm text-gray-600">
          This secure document bundle has expired and is no longer accessible.
        </p>
      </div>
    );
  }

  // Generate signed URLs for all paths (valid for 1 hour for this page load)
  const { data: signedUrls, error: signError } = await admin.storage
    .from("documents")
    .createSignedUrls(bundleData.paths, 3600);

  if (signError || !signedUrls) {
    notFound();
  }

  // Fetch the user's profile to show who shared it
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  const senderName = profile?.full_name || "A student";

  return (
    <div className="min-h-screen bg-gray-50/50 selection:bg-orange-100 selection:text-orange-900">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-20">
        
        {/* Header */}
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
            <ShieldCheck size={14} /> Secure Document Share
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 md:text-5xl">
            {bundleData.title}
          </h1>
          <p className="mt-4 max-w-lg text-base font-medium text-gray-500 md:text-lg">
            Shared securely by <span className="font-bold text-gray-900">{senderName}</span>
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-gray-400">
            <Calendar size={14} />
            Expires {new Date(bundleData.expiresAt).toLocaleDateString()}
          </div>
        </header>

        {/* Document List */}
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40">
          <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <h2 className="text-sm font-bold text-gray-700">Included Documents ({signedUrls.length})</h2>
          </div>
          
          <ul className="divide-y divide-gray-100">
            {signedUrls.map((file, i) => {
              // Extract filename from the path
              const originalPath = bundleData.paths[i];
              const parts = originalPath.split("/");
              const filename = parts[parts.length - 1];
              // Remove timestamp prefix if it exists (e.g. 17351654165-MyDoc.pdf -> MyDoc.pdf)
              const cleanName = filename.replace(/^\d+-/, "");

              return (
                <li key={i} className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-orange-50/30">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-inner group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                        {cleanName}
                      </p>
                      <p className="text-xs font-medium text-gray-500">Document</p>
                    </div>
                  </div>
                  
                  <a
                    href={file.signedUrl}
                    download={cleanName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition-all hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                  >
                    <Download size={14} />
                    View / Download
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-xs font-medium text-gray-400">
            Protected by Baseform Document Vault. Links automatically expire after 7 days.
          </p>
        </footer>
      </div>
    </div>
  );
}
