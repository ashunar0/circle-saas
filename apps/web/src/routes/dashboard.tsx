import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { authClient, signOut, useSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/signin" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  const onSignOut = async () => {
    await signOut();
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
