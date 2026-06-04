import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { requireSession, signOut, useSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireSession,
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const onSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error("Sign out failed:", error);
      return;
    }
    navigate({ to: "/signin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-default-600">Signed in as</p>
          <p className="font-medium">{session?.user.email}</p>
        </div>
        <Button variant="secondary" onPress={onSignOut} className="self-start">
          Sign out
        </Button>
      </div>
    </div>
  );
}
