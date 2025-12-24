import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserRole,
  getNewsSources,
  SourceList,
} from "@/modules/news-sources";

export default async function NewsSourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();

  // Only admin and news_manager can access this page
  if (role !== "admin" && role !== "news_manager") {
    redirect("/");
  }

  const { sources, error } = await getNewsSources();

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">News Sources</h1>
          <p className="text-sm text-muted-foreground">
            Manage RSS feeds for the news widget
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      <SourceList
        initialSources={sources}
        userRole={role}
        userId={user.id}
      />
    </div>
  );
}
