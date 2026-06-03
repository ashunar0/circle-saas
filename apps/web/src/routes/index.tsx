import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const [ping, setPing] = useState<{ ok: boolean } | null>(null);

  useEffect(() => {
    api.api.ping.$get().then(async (res) => {
      const data = await res.json();
      setPing(data);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Circle SaaS</h1>
      <p className="text-gray-600 mb-4">
        Phase 0.7: Hono RPC 型貫通が動いてる証跡
      </p>
      <p className="mb-4">
        /api/ping response: {ping ? JSON.stringify(ping) : "loading..."}
      </p>
      <Button variant="primary">Click me</Button>
    </div>
  );
}
