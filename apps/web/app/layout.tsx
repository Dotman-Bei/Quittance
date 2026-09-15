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
        {/* frontend.txt §1 ambient radial glow. Decorative, behind everything. */}
        <div className="ambient-glow" aria-hidden />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-2xl focus:border focus:border-volt focus:glass-card focus:px-3 focus:py-2 focus:text-volt"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="relative z-10 mx-auto max-w-[1280px] px-6 py-12">
          {children}
        </main>
        <Footer />
        <CommandPalette />
      </body>
    </html>
  );
}
