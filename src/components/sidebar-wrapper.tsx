"use client";

import { updateSidebarWidth } from "@/app/account/actions";
import { AppSidebar } from "@/components/app-sidebar";
import { useCallback, useRef } from "react";

export function SidebarWrapper({
  userEmail,
  displayName,
  serverSidebarWidth,
}: {
  userEmail?: string;
  displayName?: string;
  serverSidebarWidth?: number | null;
}) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleWidthChange = useCallback((width: number) => {
    // Debounce saving to DB
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateSidebarWidth(width);
    }, 500);
  }, []);

  return (
    <AppSidebar
      userEmail={userEmail}
      displayName={displayName}
      serverSidebarWidth={serverSidebarWidth}
      onWidthChange={handleWidthChange}
    />
  );
}
