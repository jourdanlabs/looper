"use client";

// Nav — the top-nav shell. Client component (active link is
// derived from the current path via usePathname) so the layout can stay a
// server component. Rendered once, in app/layout.jsx.
//
// Markup + classes match Stitch exactly:
//   • the wordmark sits left, then the BOARD / INTAKE / PORTFOLIO / DIALS / AUDIT
//     links (font-label-caps · text-label-caps), the active one carrying the
//     border-b-2 underline in primary ink;
//   • the right side reads "METHODOLOGY v1.0 · CHAIN VERIFIED", the verified
//     state in the green `secondary` token.
// The links use next/link. Active styling: active → primary ink + bottom rule;
// inactive → on-surface-variant, hover wash.

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "BOARD" },
  { href: "/intake", label: "INTAKE" },
  { href: "/prioritize", label: "PRIORITIZE" },
  { href: "/spec", label: "SPEC" },
  { href: "/backlog", label: "BACKLOG" },
  { href: "/capacity", label: "CAPACITY" },
  { href: "/reporting", label: "REPORTING" },
  { href: "/metrics", label: "METRICS" },
  { href: "/portfolio", label: "PORTFOLIO" },
  { href: "/docs", label: "DOCS" },
  { href: "/ppo", label: "GOVERNANCE" },
  { href: "/assistant", label: "ASSISTANT" },
  { href: "/dials", label: "DIALS" },
  { href: "/audit", label: "AUDIT" },
];

const ACTIVE =
  "font-label-caps text-label-caps text-primary border-b-2 border-primary pb-1 hover:bg-surface-container transition-colors duration-100";
const INACTIVE =
  "font-label-caps text-label-caps text-on-surface-variant pb-1 hover:bg-surface-container transition-colors duration-100";

export default function Nav() {
  const pathname = usePathname() || "/";
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bg-surface flex justify-between items-center w-full px-gutter h-12 max-w-container-max mx-auto border-b border-primary">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-headline-sm text-headline-sm text-primary tracking-tight whitespace-nowrap"
        >
          LOOPER
        </Link>
        <div className="hidden md:flex items-center gap-6 pt-1" data-tour="tabs">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? ACTIVE : INACTIVE}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-data-mono text-data-mono text-on-surface-variant">METHODOLOGY v1.0</span>
        <span className="font-data-mono text-data-mono text-on-surface-variant">·</span>
        <span className="font-data-mono text-data-mono text-secondary">CHAIN VERIFIED</span>
      </div>
    </nav>
  );
}
