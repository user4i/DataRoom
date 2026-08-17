import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "GS1 Data Room",
  description: "Virtual data room for nested folders, PDFs, and sharing",
};

const themeBootstrap = `(function(){try{var s=localStorage.getItem("dataroom-theme");var p=s==="light"||s==="dark"||s==="medium"||s==="system"?s:"system";var t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t==="dark"?"dark":"light";r.classList.toggle("dark",t==="dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${geist.variable} min-h-screen antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
