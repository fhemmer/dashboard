"use client";

import { signOut } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { getGravatarUrl } from "@/lib/gravatar";
import { APP_NAME, APP_VERSION } from "@/lib/version";
import {
    ChevronUp,
    Clock,
    GitPullRequest,
    LayoutDashboard,
    Mail,
    Newspaper,
    User,
    Wallet,
    Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Pull Requests", href: "/prs", icon: GitPullRequest },
  { name: "News", href: "/news", icon: Newspaper },
  { name: "Mail", href: "/mail", icon: Mail },
  { name: "Expenditures", href: "/expenditures", icon: Wallet },
  { name: "Timers", href: "/timers", icon: Clock },
];

const adminNavigation: { name: string; href: string; icon: typeof LayoutDashboard }[] = [];

export function AppSidebar({
  userEmail,
  displayName,
  isAdmin,
}: {
  userEmail?: string;
  displayName?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME} className="group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!p-2">
              <Link href="/">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-bold">{APP_NAME}</span>
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                    v{APP_VERSION}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && adminNavigation.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName || userEmail || "User"}
                  suppressHydrationWarning
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {userEmail || "user@example.com"}
                    </p>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
