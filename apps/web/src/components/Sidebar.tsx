import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, Download, Home, Settings, Users, Wallet } from "lucide-react";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { useWhoami } from "@/features/tenants/hooks";

const GROUPS = [
  {
    label: null,
    adminOnly: false,
    items: [
      { to: "/t/$tenantId", label: "ホーム", icon: Home, exact: true },
      { to: "/t/$tenantId/transactions", label: "取引", icon: ArrowLeftRight, exact: false },
    ],
  },
  {
    label: "管理",
    adminOnly: true,
    items: [
      { to: "/t/$tenantId/accounts", label: "口座", icon: Wallet, exact: false },
      { to: "/t/$tenantId/members", label: "メンバー", icon: Users, exact: false },
      { to: "/t/$tenantId/settings", label: "設定", icon: Settings, exact: false },
      { to: "/t/$tenantId/export", label: "エクスポート", icon: Download, exact: false },
    ],
  },
] as const;

type Props = { tenantId: string };

export function Sidebar({ tenantId }: Props) {
  const { data: me } = useWhoami(tenantId);
  const isAdmin = me?.role === "admin" || me?.role === "owner";
  const groups = GROUPS.filter((g) => !g.adminOnly || isAdmin);

  return (
    <aside className="w-60 shrink-0 border-r border-separator flex flex-col">
      <div className="p-3">
        <TenantSwitcher tenantId={tenantId} />
      </div>
      <nav className="flex flex-col gap-4 px-3 pb-3 flex-1">
        {groups.map((group) => (
          <div key={group.label ?? "main"} className="flex flex-col gap-1">
            {group.label && (
              <p className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} params={{ tenantId }} activeOptions={{ exact: item.exact }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-[#EBEBEC]" activeProps={{ className: "bg-[#EBEBEC] font-semibold text-black" }} inactiveProps={{ className: "text-muted" }}>
                  <Icon size={16} aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-separator">
        <UserMenu />
      </div>
    </aside>
  );
}
