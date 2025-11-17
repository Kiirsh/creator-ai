// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import { Toaster } from "sonner";
import { Poppins } from "next/font/google";

// Load Poppins Bold and expose as a CSS variable we can use anywhere
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-poppins",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* Add the font variable to body so components/pages can reference it */}
      <body className={`bg-neutral-950 text-white ${poppins.variable}`}>
        <SiteHeader />
        {children}
        {/* Toasts */}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          closeButton
          expand={false}
        />
      </body>
    </html>
  );
}
