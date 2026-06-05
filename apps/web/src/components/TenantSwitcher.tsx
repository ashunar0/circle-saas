import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, Plus } from "lucide-react";
import { Dropdown } from "@heroui/react";
import { useOrgs } from "@/features/tenants/hooks";

type Props = { tenantId: string };

function initialOf(name: string | undefined): string {
  return name?.[0]?.toUpperCase() ?? "?";
}

export function TenantSwitcher({ tenantId }: Props) {
  const navigate = useNavigate();
  const { data: orgs = [] } = useOrgs();
  const current = orgs.find((o) => o.id === tenantId);

  return (
    <Dropdown>
      <Dropdown.Trigger className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[#EBEBEC]">
        <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-sm font-medium">
          {initialOf(current?.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{current?.name ?? "サークル"}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start" className="rounded-md">
        <Dropdown.Menu>
          {orgs.map((org) => (
            <Dropdown.Item key={org.id} className="rounded-sm" onAction={() => navigate({ to: "/t/$tenantId", params: { tenantId: org.id } })}>
              <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-foreground text-background text-xs font-medium">
                {initialOf(org.name)}
              </div>
              <span>{org.name}</span>
            </Dropdown.Item>
          ))}
          <Dropdown.Item className="rounded-sm text-accent" onAction={() => navigate({ to: "/tenants" })}>
            <Plus className="size-4" />
            <span>新規作成</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
