import "./globals.css";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import Nav from "../components/Nav.jsx";

// Fonts arrive two ways, both pointing at the same faces:
//   1. The Google Fonts <link> tags in <head> below — exactly the Stitch stack
//      (Inter 400/700/800/900, IBM Plex Mono 400/500/600, Material Symbols
//      Outlined). These are what the Stitch font-*/material-symbols utilities
//      paint with, and they ship the heavy display weights (800/900) Stitch
//      uses for headlines.
//   2. next/font, exposed as the CSS vars --font-inter / --font-plex-mono, which
//      back the Tailwind fontFamily fallbacks and the legacy --font-sans/-mono.
// Loaded through the build pipeline — NOT the runtime Tailwind CDN — so there is
// no flash-of-unstyled-content.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata = {
  title: "LOOPER",
  description:
    "A deterministic, auditable intake → dedup → score(NPV) → tier → allocate → ledger operating layer. Strategy becomes rank, rank becomes commitment, every decision carries a receipt.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <head>
        {/* Stitch font stack — Inter (display), IBM Plex Mono (data/labels),
            Material Symbols Outlined (the icon font). preconnect first for a
            fast first paint. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-on-background min-h-screen antialiased flex flex-col font-body-md text-body-md">
        <Nav />
        {children}
        <footer className="foot">
          <div className="wrap">
            TAMPER-EVIDENT DECISION CHAIN · Every line on this surface is regenerated from the
            system of record and cites a ledger receipt — it cannot go stale, and it cannot be
            quietly rewritten. SYNTHETIC DEMO DATA; NO CONFIDENTIAL INFORMATION. Deterministic ·
            zero-LLM in the decision path · local-first.
          </div>
        </footer>
      </body>
    </html>
  );
}
