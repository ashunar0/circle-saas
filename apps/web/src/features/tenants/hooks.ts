import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";
import type { CreateOrgInput } from "./schema";

export type Org = { id: string; name: string; slug: string };

const ORGS_KEY = ["organizations"] as const;
const WHOAMI_KEY = (tenantId: string) => ["whoami", tenantId] as const;

export function useOrgs() {
  return useQuery({
    queryKey: ORGS_KEY,
    queryFn: async (): Promise<Org[]> => {
      const { data, error } = await authClient.organization.list();
      if (error) {
        throw new Error(error.message ?? "サークル一覧の取得に失敗しました");
      }
      return (data ?? []) as Org[];
    },
  });
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrgInput) => {
      const { error } = await authClient.organization.create(input);
      if (error) {
        throw new Error(error.message ?? "作成に失敗しました");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORGS_KEY });
    },
  });
}

export function useWhoami(tenantId: string) {
  return useQuery({
    queryKey: WHOAMI_KEY(tenantId),
    queryFn: async () => {
      const res = await api.api.t[":tenantId"].whoami.$get({
        param: { tenantId },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
