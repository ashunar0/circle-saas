import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * sidebar 開閉 state。狭い画面 (<768px) では閉じ、広くなったら開く方向に
 * 自動で sync する。手動 toggle (setOpen) はもちろん効くが、breakpoint
 * 跨ぎで上書きされる。
 */
export function useSidebarOpenState() {
  const [open, setOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setOpen(!e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return [open, setOpen] as const;
}
