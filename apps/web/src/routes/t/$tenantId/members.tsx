import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/members")({
  beforeLoad: requireSession,
  component: MembersPage,
});

function MembersPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">メンバー</h1>
    </div>
  );
}
