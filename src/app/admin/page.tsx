import { redirect } from "next/navigation";
import { requireAdminGuard } from "@/lib/admin/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const guard = await requireAdminGuard();
  if (!guard.ok) {
    if (guard.status === 401) redirect("/login");
    redirect("/dashboard");
  }

  return <AdminClient />;
}
