import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/utils/supabase/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GSMVIAGEM HUB",
  description: "Hub operacional moderno para gestão de passagens e automação",
  themeColor: "#050505",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icon.png"
  }
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
      <body className={`${inter.className} bg-background-dark font-display text-slate-100 h-screen antialiased overflow-hidden`}>
        <div className="relative flex h-screen w-full flex-col bg-background-dark group/design-root overflow-hidden">
          {/* Background Decorative Elements (3D lighting feel) */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-white opacity-[0.02] blur-[150px] -z-10 rounded-full pointer-events-none"></div>
          <div className="fixed bottom-0 left-0 w-[800px] h-[800px] bg-secondary opacity-[0.01] blur-[200px] -z-10 rounded-full pointer-events-none"></div>

          {/* Global Map Wireframe (Subtle Background) */}
          <div className="fixed inset-0 pointer-events-none -z-20 opacity-[0.03]">
            <img 
              alt="World Map Pattern" 
              className="w-full h-full object-cover grayscale invert"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhnexR-sCLcfPFttEGxT2yRYGIuYM38sBcpX1rt1RE45Zh4P5gUMW-IVFCy7uVPNrKT5TnaOnKgpM5RPWm3rQPFD1YautDXn67PNUUKcMyJtUsSkHhHN7kQKFsI55LG_0nBdTSH4IST40lMiRDgq3YQ8pNtDvr1OwJOgF_LU8sqAt1MB-1Gbc73Kb-2Epmiq0y3xux6t4wb8lv02n79g_5vUKFLDPIsxveA4M-1-dZSBpVzE9MygStCO7Y34pXx71rJKsvnvqBaA"
            />
          </div>

          <Navbar />
          
          <main className="flex-1 overflow-hidden relative z-10">
            <div className="w-full max-w-[1600px] mx-auto h-full p-4 md:p-8">
              {children}
            </div>
          </main>
        </div>
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
