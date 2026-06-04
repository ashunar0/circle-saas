import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth";
import { FormField } from "@/features/auth/components/FormField";

const schema = z.object({
  name: z.string().min(1, "サークル名は必須"),
  slug: z
    .string()
    .min(1, "slug は必須")
    .regex(/^[a-z0-9-]+$/, "英小文字・数字・ハイフンのみ"),
});
type FormValues = z.infer<typeof schema>;

type Org = { id: string; name: string; slug: string };

export const Route = createFileRoute("/tenants")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/signin" });
    }
  },
  component: TenantsPage,
});

function TenantsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const refresh = async () => {
    setLoading(true);
    setListError(null);
    try {
      const { data, error } = await authClient.organization.list();
      if (error) {
        setListError(error.message ?? "サークル一覧の取得に失敗しました");
        return;
      }
      setOrgs((data ?? []) as Org[]);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const { error } = await authClient.organization.create(values);
    if (error) {
      setSubmitError(error.message ?? "作成に失敗しました");
      return;
    }
    reset();
    await refresh();
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="text-2xl font-bold">サークル一覧</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">所属しているサークル</h2>
          {loading ? (
            <p className="text-default-500">読み込み中…</p>
          ) : listError ? (
            <p className="text-sm text-danger">{listError}</p>
          ) : orgs.length === 0 ? (
            <p className="text-default-500">まだサークルがありません</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {orgs.map((org) => (
                <li
                  key={org.id}
                  className="border rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-default-500">{org.slug}</p>
                  </div>
                  <Link
                    to="/t/$tenantId"
                    params={{ tenantId: org.id }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    開く →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">新規作成</h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={control}
              name="name"
              label="サークル名"
              placeholder="うちのサークル"
            />
            <FormField
              control={control}
              name="slug"
              label="slug"
              placeholder="my-circle"
            />
            {submitError && (
              <p className="text-sm text-danger">{submitError}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              isPending={isSubmitting}
              className="self-start"
            >
              作成
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
