import { getThemeById } from "@/app/themes/actions";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditThemeClient } from "./edit-client";

interface EditThemePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(props: EditThemePageProps) {
  const params = await props.params;
  const theme = await getThemeById(params.id);
  return {
    title: theme ? `Edit ${theme.name} | Dashboard` : "Edit Theme | Dashboard",
  };
}

export default async function EditThemePage(props: EditThemePageProps) {
  const params = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const theme = await getThemeById(params.id);

  if (!theme) {
    notFound();
  }

  return <EditThemeClient theme={theme} />;
}
