// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Toaster } from "sonner";
import { Inter, Poppins } from "next/font/google";
import AppSidebar from "@/components/layout/AppSidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-base",
  display: "swap",
});

// Poppins stays for the logo/brand moments
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-poppins",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} min-h-screen bg-background text-foreground`}>
        <div className="min-h-screen flex flex-col">
          <SiteHeader />

          <div className="flex flex-1 w-full">
            <AppSidebar />
            <main className="flex-1 px-4 md:px-8 py-8">
              <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
            </main>
          </div>

          <Toaster
            theme="light"
            position="top-center"
            richColors
            closeButton
            expand={false}
          />
        </div>
      </body>
    </html>
  );
}
