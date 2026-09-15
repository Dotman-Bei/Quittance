import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CommandPalette } from "@/components/layout/CommandPalette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quittance",
  description:
    "Settles an agent's payment for a paid endpoint only after the response has been checked against the requirements that endpoint itself advertised.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-default focus:border focus:border-accent focus:bg-ink-raised focus:px-3 focus:py-2 focus:text-accent"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="mx-auto max-w-page px-6 py-section">
          {children}
        </main>
        <Footer />
        <CommandPalette />
      </body>
    </html>
  );
}
