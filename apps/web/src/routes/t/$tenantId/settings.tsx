import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdminRole } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/settings")({
  beforeLoad: ({ context, params }) => {
    if (!isAdminRole(context.role)) {
      throw redirect({ to: "/t/$tenantId", params: { tenantId: params.tenantId } });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">設定</h1>
    </div>
  );
}
