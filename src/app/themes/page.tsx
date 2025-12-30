import { getUserThemes } from "./actions";
import { ThemeList } from "@/modules/themes/components/theme-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Custom Themes | Dashboard",
  description: "Create and manage custom themes for your dashboard",
};

export default async function ThemesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const themes = await getUserThemes();

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Themes</h1>
          <p className="text-muted-foreground">
            Create and manage personalized themes for your dashboard
          </p>
        </div>
        <Button asChild>
          <Link href="/themes/new">
            <Plus className="mr-1 h-4 w-4" />
            New Theme
          </Link>
        </Button>
      </div>

      <ThemeList themes={themes} />
    </div>
  );
}
