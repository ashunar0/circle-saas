import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { Dropdown } from "@heroui/react";
import { signOut, useSession } from "@/lib/auth";

export function UserMenu() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/signin" });
  };

  return (
    <Dropdown>
      <Dropdown.Trigger className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[#EBEBEC]">
        <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-medium">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{user?.name ?? "?"}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="top start" className="rounded-md">
        <Dropdown.Menu>
          <Dropdown.Item className="rounded-sm" onAction={handleSignOut}>
            <LogOut className="size-4" />
            <span>サインアウト</span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
