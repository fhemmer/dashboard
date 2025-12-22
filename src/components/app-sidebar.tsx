"use client";

import { signOut } from "@/app/auth/actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarWidth, useSidebarWidthInit } from "@/hooks/use-sidebar-width";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import {
    GitPullRequest,
    GripVertical,
    LayoutDashboard,
    Newspaper,
    User,
    Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pull Requests", href: "/prs", icon: GitPullRequest },
  { name: "News", href: "/news", icon: Newspaper },
];

export function AppSidebar({
  userEmail,
  displayName,
  serverSidebarWidth,
  onWidthChange,
}: {
  userEmail?: string;
  displayName?: string;
  serverSidebarWidth?: number | null;
  onWidthChange?: (width: number) => void;
}) {
  const pathname = usePathname();
  const { width, setWidth, minWidth, maxWidth } = useSidebarWidth();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useSidebarWidthInit(serverSidebarWidth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        onWidthChange?.(width);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, setWidth, minWidth, maxWidth, onWidthChange]
  );

  return (
    <div
      ref={sidebarRef}
      style={{ width }}
      className={cn(
        "relative flex h-full flex-col border-r bg-card/50 backdrop-blur-xl",
        isResizing && "select-none"
      )}
    >
      <Link
        href="/"
        className="flex h-16 items-center px-6 border-b hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 font-bold">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span>{APP_NAME}</span>
            <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              suppressHydrationWarning
              className="flex w-full items-center gap-3 px-2 mb-4 rounded-lg py-2 hover:bg-accent transition-colors text-left"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {userEmail ? (
                  <Image
                    src={getGravatarUrl(userEmail, { size: 64 })}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium">U</span>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail || "user@example.com"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="w-full text-destructive focus:text-destructive cursor-pointer"
                >
                  Sign Out
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            setWidth(width - 10);
          } else if (e.key === "ArrowRight") {
            setWidth(width + 10);
          }
        }}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
