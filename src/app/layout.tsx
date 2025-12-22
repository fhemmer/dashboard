import { Header } from "@/components/header";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/version";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Lato, Nunito, Open_Sans, Roboto } from "next/font/google";
import "./globals.css";

async function getProfileData(userId: string): Promise<{ displayName: string | null; sidebarWidth: number | null }> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, sidebar_width")
    .eq("id", userId)
    .single();
  return {
    displayName: profile?.display_name ?? null,
    sidebarWidth: profile?.sidebar_width ?? null,
  };
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} Dashboard`,
  description: "Manage your demo records and monitor system activity.",
};

// Script to apply theme and font before React hydration to prevent flash
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (!theme) {
      theme = 'dark';
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    var fontMap = {
      'geist': '--font-geist-sans',
      'inter': '--font-inter',
      'roboto': '--font-roboto',
      'nunito': '--font-nunito',
      'open-sans': '--font-open-sans',
      'lato': '--font-lato'
    };
    var font = localStorage.getItem('dashboard-font') || 'geist';
    var fontVar = fontMap[font] || fontMap['geist'];
    document.documentElement.setAttribute('data-font', font);
    document.documentElement.style.setProperty('--font-sans', 'var(' + fontVar + ')');
  } catch (e) {}
})();
`;

const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  inter.variable,
  roboto.variable,
  nunito.variable,
  openSans.variable,
  lato.variable,
].join(" ");

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileData = user ? await getProfileData(user.id) : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${fontVariables} antialiased bg-background text-foreground relative`}
      >
        <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        </div>
        {user ? (
          <div className="flex h-screen overflow-hidden">
            <SidebarWrapper
              userEmail={user.email}
              displayName={profileData?.displayName ?? undefined}
              serverSidebarWidth={profileData?.sidebarWidth}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        ) : (
          <main className="h-screen w-full">{children}</main>
        )}
      </body>
    </html>
  );
}
