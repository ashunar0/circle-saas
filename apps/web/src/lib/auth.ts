import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { redirect } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query";

export const authClient = createAuthClient({
  plugins: [organizationClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export type TenantRole = "owner" | "admin" | "member";

export async function requireSession() {
  const { data: session } = await authClient.getSession();
  if (!session) {
    throw redirect({ to: "/signin" });
  }
  return session;
}

export function isAdminRole(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function fetchTenantRole(tenantId: string): Promise<TenantRole> {
  const res = await api.api.t[":tenantId"].whoami.$get({ param: { tenantId } });
  if (!res.ok) {
    throw redirect({ to: "/tenants" });
  }
  const data = await res.json();
  queryClient.setQueryData(["whoami", tenantId], data);
  return data.role as TenantRole;
}
