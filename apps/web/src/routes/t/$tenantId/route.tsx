import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/t/$tenantId")({
  component: TenantShell,
});

function TenantShell() {
  const { tenantId } = Route.useParams();
  return (
    <div className="min-h-screen flex">
      <Sidebar tenantId={tenantId} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
