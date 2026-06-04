import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth";
import { FormField } from "@/components/FormField";
import { OrgList } from "@/features/tenants/components/OrgList";
import { useCreateOrg, useOrgs } from "@/features/tenants/hooks";
import {
  createOrgInput,
  type CreateOrgInput,
} from "@/features/tenants/schema";

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
  const { data: orgs = [], isLoading, error: listError } = useOrgs();
  const createOrg = useCreateOrg();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgInput),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: CreateOrgInput) => {
    createOrg.mutate(values, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="text-2xl font-bold">サークル一覧</h1>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">所属しているサークル</h2>
          {isLoading ? (
            <p className="text-default-500">読み込み中…</p>
          ) : listError ? (
            <p className="text-sm text-danger">{listError.message}</p>
          ) : orgs.length === 0 ? (
            <p className="text-default-500">まだサークルがありません</p>
          ) : (
            <OrgList orgs={orgs} />
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
            {createOrg.error && (
              <p className="text-sm text-danger">{createOrg.error.message}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              isPending={isSubmitting || createOrg.isPending}
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
