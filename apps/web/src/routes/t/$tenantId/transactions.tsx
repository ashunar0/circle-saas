import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/t/$tenantId/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">取引</h1>
    </div>
  );
}
