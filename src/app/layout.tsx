import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/header";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SidebarInset } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/version";
import { NotificationBellServer } from "@/modules/notifications/components/notification-bell-server";
import type { Metadata } from "next";
import {
    Fira_Code,
    Geist,
    Geist_Mono,
    Inter,
    JetBrains_Mono,
    Lato,
    Merriweather,
    Nunito,
    Open_Sans,
    Playfair_Display,
    Roboto,
    Source_Serif_4,
} from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

async function getProfileData(userId: string): Promise<{
  displayName: string | null;
  sidebarWidth: number | null;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, sidebar_width, role")
    .eq("id", userId)
    .single();
  return {
    displayName: profile?.display_name ?? null,
    sidebarWidth: profile?.sidebar_width ?? null,
    isAdmin: profile?.role === "admin",
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

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
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
      'lato': '--font-lato',
      'playfair': '--font-playfair',
      'jetbrains': '--font-jetbrains',
      'fira-code': '--font-fira-code',
      'source-serif': '--font-source-serif',
      'merriweather': '--font-merriweather',
      'agave': '--font-agave'
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
  playfair.variable,
  jetbrainsMono.variable,
  firaCode.variable,
  sourceSerif.variable,
  merriweather.variable,
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

  // Read sidebar state from cookie server-side to prevent hydration mismatch
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get("sidebar_state");
  const defaultSidebarOpen = sidebarCookie?.value !== "false";

  return (
    <html lang="en" className={`dark ${fontVariables}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased bg-background text-foreground relative font-sans"
      >
        <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        </div>
        {user ? (
          <SidebarWrapper
            userEmail={user.email}
            displayName={profileData?.displayName ?? undefined}
            serverSidebarWidth={profileData?.sidebarWidth}
            isAdmin={profileData?.isAdmin}
            defaultOpen={defaultSidebarOpen}
          >
            <SidebarInset>
              <Header notificationBell={<NotificationBellServer />} />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </SidebarInset>
          </SidebarWrapper>
        ) : (
          <main className="h-screen w-full">{children}</main>
        )}
        <Analytics />
      </body>
    </html>
  );
}
