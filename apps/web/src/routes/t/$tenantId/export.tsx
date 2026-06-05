import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/export")({
  beforeLoad: requireSession,
  component: ExportPage,
});

function ExportPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">エクスポート</h1>
    </div>
  );
}
