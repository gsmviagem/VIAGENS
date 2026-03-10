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
      <body className={`${inter.className} bg-background-dark text-white min-h-screen antialiased overflow-x-hidden`}>
        {isAuthenticated ? (
          <div className="flex flex-col min-h-screen relative">
            {/* Global Cinematic Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent-blue/10 blur-[150px] rounded-full"></div>
              <div
                className="absolute inset-0 opacity-20 bg-center bg-no-repeat bg-cover mix-blend-overlay"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072')" }}
              ></div>
            </div>

            <div className="relative z-50">
              <Navbar />
            </div>

            <main className="flex-1 relative z-10 pt-20">
              {/* Global container for consistent side margins across all pages */}
              <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-10">
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
