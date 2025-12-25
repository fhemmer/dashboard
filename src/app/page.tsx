import { getWidgetSettings } from "@/app/actions.dashboard";
import { DashboardConfigSheet } from "@/components/dashboard-config-sheet";
import { DashboardGrid } from "@/components/dashboard-grid";
import { LandingPage } from "@/components/landing";
import { createClient } from "@/lib/supabase/server";
import type { WidgetId } from "@/lib/widgets";
import { ExpendituresWidget } from "@/modules/expenditures";
import { PRWidget } from "@/modules/github-prs";
import { MailWidget } from "@/modules/mail/components/mail-widget";
import { NewsWidget } from "@/modules/news";
import { TimerWidget } from "@/modules/timers";
import type { ReactNode } from "react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Show landing page for unauthenticated users
  if (!user) {
    return <LandingPage />;
  }

  // Get widget settings
  const { settings, isAdmin } = await getWidgetSettings();

  // Map widget IDs to their components
  const widgetComponents: Record<WidgetId, ReactNode> = {
    "pull-requests": <PRWidget />,
    news: <NewsWidget />,
    expenditures: isAdmin ? <ExpendituresWidget /> : null,
    timers: <TimerWidget />,
    mail: <MailWidget />,
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal dashboard overview.
          </p>
        </div>
        <DashboardConfigSheet settings={settings} isAdmin={isAdmin} />
      </div>

      <DashboardGrid settings={settings} widgetComponents={widgetComponents} />
    </div>
  );
}
