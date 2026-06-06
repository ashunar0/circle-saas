import { ArrowLeftRight, Download, Home, Settings, Users } from "lucide-react";

export const NAV_GROUPS = [
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
      { to: "/t/$tenantId/members", label: "メンバー", icon: Users, exact: false },
      { to: "/t/$tenantId/settings", label: "設定", icon: Settings, exact: false },
      { to: "/t/$tenantId/export", label: "エクスポート", icon: Download, exact: false },
    ],
  },
] as const;

export function findNavTitle(routePath: string | undefined): string | undefined {
  if (!routePath) return undefined;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === routePath || `${item.to}/` === routePath) return item.label;
    }
  }
  return undefined;
}
