import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$tenantId")({
  component: TenantShell,
});

function TenantShell() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 border-r border-default-200 bg-white" />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
