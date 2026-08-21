import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VaultClient, { type VaultFile } from "./VaultClient";

const BUCKET = "documents";
const CATEGORIES = ["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"] as const;
type Category = typeof CATEGORIES[number];

export default async function VaultPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const files: VaultFile[] = [];

  for (const category of CATEGORIES) {
    const prefix = `${user.id}/${category}`;
    const { data } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (!data) continue;

    for (const file of data) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      files.push({
        path: `${prefix}/${file.name}`,
        name: file.name,
        category: category as Category,
        size: file.metadata?.size ?? 0,
        createdAt: file.created_at ?? file.updated_at ?? new Date().toISOString(),
        mimeType: file.metadata?.mimetype ?? "application/octet-stream",
      });
    }
  }

  files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <VaultClient initialFiles={files} />;
}
