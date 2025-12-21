"use client";

import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import {
    ChevronRight,
    Database,
    LayoutDashboard,
    Settings,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Data Explorer", href: "#", icon: Database },
  { name: "Integrations", href: "#", icon: Zap },
  { name: "Settings", href: "#", icon: Settings },
];

export function AppSidebar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 border-b">
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
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Plan
        </div>
        <div className="mb-6 px-3">
          <div className="rounded-lg border bg-accent/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pro Plan</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full w-3/4 bg-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              75% of resources used
            </p>
          </div>
        </div>

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
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-medium">
              {userEmail?.[0].toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">User</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail || "user@example.com"}</p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  );
}
