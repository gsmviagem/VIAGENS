import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/utils/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GSMVIAGEM HUB - Command Center",
  description: "Hub operacional moderno para gestão de passagens e automação",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-[#020817] text-slate-50 min-h-screen antialiased`}>
        {isAuthenticated ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
              <Topbar />
              <main className="flex-1 overflow-y-auto bg-[#0a0f1c] p-4 md:p-6 lg:p-8 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
                <div className="relative z-10 h-full">{children}</div>
              </main>
            </div>
          </div>
        ) : (
          <main className="min-h-screen">
            {children}
          </main>
        )}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
