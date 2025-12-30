"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { CustomThemeProvider } from "@/components/custom-theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

export function SidebarWrapper({
  userEmail,
  displayName,
  isAdmin,
  defaultOpen = true,
  children,
}: {
  userEmail?: string;
  displayName?: string;
  serverSidebarWidth?: number | null;
  isAdmin?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <CustomThemeProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar
          userEmail={userEmail}
          displayName={displayName}
          isAdmin={isAdmin}
        />
        {children}
      </SidebarProvider>
    </CustomThemeProvider>
  );
}
