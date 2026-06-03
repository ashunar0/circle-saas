import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@heroui/react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Circle SaaS</h1>
      <p className="text-gray-600 mb-4">
        Phase 0.5: Tailwind v4 + HeroUI v3 が動いてる証跡
      </p>
      <Button variant="primary">Click me</Button>
    </div>
  );
}
