import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { redirect } from "@tanstack/react-router";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export async function requireSession() {
  const { data: session } = await authClient.getSession();
  if (!session) {
    throw redirect({ to: "/signin" });
  }
  return session;
}
