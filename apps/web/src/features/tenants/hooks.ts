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

function generateSlug(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const shortId = crypto.randomUUID().slice(0, 8);
  return `${ascii || "org"}-${shortId}`;
}

export function useCreateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrgInput) => {
      const { error } = await authClient.organization.create({
        name: input.name,
        slug: generateSlug(input.name),
      });
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
