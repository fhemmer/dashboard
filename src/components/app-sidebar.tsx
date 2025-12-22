"use client";

import { signOut } from "@/app/auth/actions";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getGravatarUrl } from "@/lib/gravatar";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import {
    GitPullRequest,
    LayoutDashboard,
    Newspaper,
    User,
    Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pull Requests", href: "/prs", icon: GitPullRequest },
  { name: "News", href: "/news", icon: Newspaper },
];

export function AppSidebar({
  userEmail,
  displayName,
}: {
  userEmail?: string;
  displayName?: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-xl">
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
    </div>
  );
}
