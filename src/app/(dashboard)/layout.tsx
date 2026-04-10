import TopRightActions from "@/components/nav/TopRightActions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopRightActions />
      {children}
    </div>
  );
}
