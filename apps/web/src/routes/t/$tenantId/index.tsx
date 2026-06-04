import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { api } from "@/lib/api";

type Whoami = { organizationId: string; role: string };

export const Route = createFileRoute("/t/$tenantId/")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/signin" });
    }
  },
  component: TenantPage,
});

function TenantPage() {
  const { tenantId } = Route.useParams();
  const [me, setMe] = useState<Whoami | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const fetchWhoami = async () => {
      try {
        const res = await api.api.t[":tenantId"].whoami.$get({
          param: { tenantId },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (!canceled) setError(text || `HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!canceled) setMe(data);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "ネットワークエラー");
        }
      }
    };
    fetchWhoami();
    return () => {
      canceled = true;
    };
  }, [tenantId]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link to="/tenants" className="text-sm text-blue-600 hover:underline">
          ← サークル一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold">サークルダッシュボード</h1>
        {error ? (
          <p className="text-danger">エラー: {error}</p>
        ) : !me ? (
          <p className="text-default-500">読み込み中…</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p>
              organizationId: <code>{me.organizationId}</code>
            </p>
            <p>
              role: <strong>{me.role}</strong>
            </p>
          </div>
        )}
        <p className="text-xs text-default-400 mt-8">
          Phase 4 で expense list / 申請フォームが入ります
        </p>
      </div>
    </div>
  );
}
