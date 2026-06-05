import { useMatches } from "@tanstack/react-router";
import { Bell, PanelLeft } from "lucide-react";
import { findNavTitle } from "@/lib/nav";

type Props = { onToggleSidebar: () => void };

export function Header({ onToggleSidebar }: Props) {
  const matches = useMatches();
  const leaf = matches[matches.length - 1];
  const title = findNavTitle(leaf?.routeId);

  return (
    <header className="flex items-center gap-3 px-4 py-3">
      <button type="button" onClick={onToggleSidebar} className="cursor-pointer rounded-md p-2 hover:bg-[#EBEBEC]" aria-label="サイドバー切替">
        <PanelLeft className="size-4 text-foreground" />
      </button>
      <h1 className="flex-1 text-base font-semibold">{title}</h1>
      <button type="button" className="cursor-pointer rounded-md p-2 hover:bg-[#EBEBEC]" aria-label="通知">
        <Bell className="size-4 text-foreground" />
      </button>
    </header>
  );
}
