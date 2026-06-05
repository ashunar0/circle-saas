import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/settings")({
  beforeLoad: requireSession,
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">設定</h1>
    </div>
  );
}
