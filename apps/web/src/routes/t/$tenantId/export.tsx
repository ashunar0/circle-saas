import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdminRole } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/export")({
  beforeLoad: ({ context, params }) => {
    if (!isAdminRole(context.role)) {
      throw redirect({ to: "/t/$tenantId", params: { tenantId: params.tenantId } });
    }
  },
  component: ExportPage,
});

function ExportPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">エクスポート</h1>
    </div>
  );
}
