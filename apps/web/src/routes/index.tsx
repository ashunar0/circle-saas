import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h1>Circle SaaS</h1>
      <p>Phase 0.4: TanStack Router file-based が動いてる証跡</p>
    </div>
  );
}
