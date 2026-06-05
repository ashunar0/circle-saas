import { Link } from "@tanstack/react-router";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { useWhoami } from "@/features/tenants/hooks";
import { NAV_GROUPS } from "@/lib/nav";

type Props = { tenantId: string };

export function Sidebar({ tenantId }: Props) {
  const { data: me } = useWhoami(tenantId);
  const isAdmin = me?.role === "admin" || me?.role === "owner";
  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isAdmin);

  return (
    <aside className="w-60 h-full border-r border-separator flex flex-col">
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
