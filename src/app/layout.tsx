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
  themeColor: "#050505",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className={`${inter.className} bg-background-dark font-display text-slate-100 min-h-screen antialiased overflow-x-hidden`}>
        <div className="relative flex min-h-screen w-full flex-col bg-background-dark group/design-root overflow-x-hidden">
          {/* Hero/Cinematic Background */}
          <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
            <img 
              alt="Premium Background" 
              className="w-full h-full object-cover" 
              src="/assets/images/wallpaper.jpg"
            />
          </div>

          <div className="relative z-50">
            <Navbar />
          </div>

          <main className="flex-1 relative z-10 pt-32">
            <div className="w-full max-w-[1440px] mx-auto px-6 md:px-10">
              {children}
            </div>
          </main>
          
          {/* Bottom Status Bar */}
          <footer className="relative z-10 bg-black/80 backdrop-blur-xl border-t border-white/5 px-10 py-3 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <div className="flex gap-8">
              <span className="flex items-center gap-2">
                <span className="size-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981]"></span> 
                Server: Node-Alpha
              </span>
              <span className="flex items-center gap-2">
                <span className="size-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_#10b981]"></span> 
                Encrypted: AES-256
              </span>
            </div>
            <div>GSMVIAGEM EXCLUSIVE ECOSYSTEM © 2024</div>
            <div className="flex gap-4 text-primary">
              <a className="hover:text-white transition-colors" href="#">Support</a>
              <a className="hover:text-white transition-colors" href="#">Privacy</a>
            </div>
          </footer>
        </div>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
