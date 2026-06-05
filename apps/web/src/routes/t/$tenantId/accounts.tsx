import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/accounts")({
  beforeLoad: requireSession,
  component: AccountsPage,
});

function AccountsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">口座</h1>
    </div>
  );
}
