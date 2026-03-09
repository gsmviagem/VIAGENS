import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
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
          <div className="flex flex-col min-h-screen overflow-x-hidden">
            <Navbar />
            <main className="flex-1 relative bg-[#020817]">
              {/* Removed grid overlay for smoother UI */}
              <div className="relative z-10 w-full">
                {children}
              </div>
            </main>
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
