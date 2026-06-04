import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-[#F5F5F5]">
      <Outlet />
    </div>
  ),
});
