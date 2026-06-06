import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAdminRole } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/members")({
  beforeLoad: ({ context, params }) => {
    if (!isAdminRole(context.role)) {
      throw redirect({ to: "/t/$tenantId", params: { tenantId: params.tenantId } });
    }
  },
  component: MembersPage,
});

function MembersPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">メンバー</h1>
    </div>
  );
}
