import { createFileRoute } from "@tanstack/react-router";
import { requireSession } from "@/lib/auth";

export const Route = createFileRoute("/t/$tenantId/transactions")({
  beforeLoad: requireSession,
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">取引</h1>
    </div>
  );
}
