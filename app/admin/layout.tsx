import { AdminRouteAuthBanner } from "@/components/admin-route-auth-banner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <AdminRouteAuthBanner />
      {children}
    </div>
  );
}
