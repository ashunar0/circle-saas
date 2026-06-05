import { useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/t/$tenantId")({
  component: TenantShell,
});

function TenantShell() {
  const { tenantId } = Route.useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <div className="h-screen flex">
      <div className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${sidebarOpen ? "w-60" : "w-0"}`}>
        <Sidebar tenantId={tenantId} />
      </div>
      <main className="flex-1 min-w-0 flex flex-col">
        <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
