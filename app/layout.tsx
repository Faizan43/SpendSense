import type { Metadata } from "next";
import { Caprasimo, Figtree, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Body text. Figtree is the "Organic" design's body face.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Display/heading face. Caprasimo only ships weight 400 — every heading,
// button label and nav item renders at that single weight by design.
const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SpendSense",
    template: "%s · SpendSense",
  },
  description:
    "Photograph a receipt, get every item extracted and categorised, and see where your money actually goes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${figtree.variable} ${caprasimo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-center"
            closeButton
            offset={{ bottom: "24px" }}
            mobileOffset={{ bottom: "74px" }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
