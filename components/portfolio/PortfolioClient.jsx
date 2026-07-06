"use client";

// PortfolioClient — the interactive Stitch "Allocation & Capacity" view.
//
// Receives a fully-computed, serialized engine slice from the server page
// (app/portfolio/page.jsx). The engine — and its node:crypto ledger — runs
// server-side; this component never scores or re-aggregates. Every number on
// screen is a literal of what lib/portfolio.mjs already computed. The only
// state here is *view* state:
//
//   • a live SYS_TIME clock + per-row availability countdowns (the Stitch
//     "feels live" detail, ported faithfully — cosmetic only, no data effect);
//   • a distribution LENS toggle (value type / talent / mandate / time-to-
//     realize) driving the three "RESOURCE DISTRIBUTION" allocation cards;
//   • a business-impact filter (All / Partner / Consumer / Platform)
//     slicing the funded-roster capacity table.
//
// Markup is the Stitch portfolio_capacity_view layout, rebuilt on the
// COMPILED design-system vocabulary: technical-border / border-b-technical
// hairlines, the font-*/text-* token pairs, the `secondary` green accent, and
// Material Symbols ligatures. Stitch's own `.brutal-border*` and Tailwind-CDN
// config are NOT used (the helpers in globals.css replace them).

import { useEffect, useMemo, useState } from "react";

// ── the distribution lenses ───────────────────────────────────────────────
// Each lens is one of the engine's funded distributions. `growthKeys` marks
// which buckets carry the single green accent (the structural "growth" read);
// for the non-value-type lenses the accent goes to the bucket named in `accent`.
const LENSES = [
  {
    id: "value",
    label: "VALUE TYPE",
    icon: "category",
    caption: "FUNDED MIX BY VALUE TYPE",
  },
  {
    id: "talent",
    label: "TALENT",
    icon: "groups",
    caption: "FUNDED MIX BY TALENT PROFILE",
  },
  {
    id: "mandate",
    label: "MANDATE",
    icon: "gavel",
    caption: "AUTO-PINNED VS DISCRETIONARY",
  },
  {
    id: "time",
    label: "TIME-TO-REALIZE",
    icon: "schedule",
    caption: "FIRST POSITIVE NPV YEAR",
  },
];

const IMPACTS = ["Partner", "Consumer", "Platform"];

// Status → Stitch badge palette (FUNDED green / mandate ink / held hatched).
function statusBadgeClass(status) {
  switch (status) {
    case "FUNDED":
      return "bg-secondary-container text-on-secondary-container";
    case "MANDATE":
      return "bg-primary text-on-primary";
    default:
      return "bg-surface-variant text-on-surface";
  }
}

// Deterministic "time to availability" label from a funded row's team draw +
// rank. Cosmetic roster flavor (matches the Stitch countdown column); never
// feeds a decision. Mandate rows read PINNED, everything else counts down.
function availabilitySeed(row) {
  if (row.mandate) return null; // PINNED — no countdown
  const base = 6 + row.rank * 9 + row.teams * 13; // days
  const d = base % 90;
  const h = (row.rank * 7 + row.teams * 3) % 24;
  const m = (row.npvShort * 11 + row.rank * 5) % 60;
  return { d, h, m };
}

function fmtCountdown(c) {
  if (!c) return "PINNED";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(c.d)}d ${p(c.h)}h ${p(c.m)}m`;
}

export default function PortfolioClient({
  header, // { titleTag, subtitle, env }
  stats, // { npvMoney, capacityUsed, capacity, utilization, atMax }
  lenses, // { value:[{key,count,pct,accent}], talent:[…], mandate:[…], time:[…] }
  roster, // [{ id, title, area, impact, valueType, status, rank, teams, npvMoney, npvShort, mandate }]
  receipts, // { head, chainOk, chainCount, methodology }
  insight, // { npvTotalMoney, defensivePct, growthPct, fundedGrowthCount, optionalityFunded, growthThin }
}) {
  // live SYS_TIME clock (Stitch header detail) — mounts client-side so SSR
  // stays deterministic; updates once a second.
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toISOString().split("T")[1].split(".")[0]);
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // per-row availability countdowns (cosmetic, seeded deterministically, then
  // drift slightly so the roster "feels live" exactly like Stitch's view).
  const [countdowns, setCountdowns] = useState(() =>
    Object.fromEntries(roster.map((r) => [r.id, availabilitySeed(r)]))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setCountdowns((cur) => {
        const next = { ...cur };
        for (const id of Object.keys(next)) {
          const c = next[id];
          if (!c || Math.random() > 0.7) continue;
          let { d, h, m } = c;
          m -= 1;
          if (m < 0) {
            m = 59;
            h -= 1;
          }
          if (h < 0) {
            h = 23;
            d -= 1;
          }
          if (d < 0) {
            d = 0;
            h = 0;
            m = 0;
          }
          next[id] = { d, h, m };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const [lens, setLens] = useState("value");
  const [impact, setImpact] = useState("All");

  const active = LENSES.find((l) => l.id === lens);
  const dist = lenses[lens] || [];

  // roster filter (the funded capacity table)
  const counts = useMemo(() => {
    const c = { All: roster.length };
    for (const i of IMPACTS) c[i] = roster.filter((r) => r.impact === i).length;
    return c;
  }, [roster]);

  const visible = useMemo(
    () => (impact === "All" ? roster : roster.filter((r) => r.impact === impact)),
    [roster, impact]
  );

  return (
    <main className="flex-1 relative z-10 flex flex-col">
      <div className="max-w-container-max mx-auto w-full p-margin flex flex-col gap-margin">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <header className="border-b-technical pb-unit flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              {header.titleTag}
            </h1>
            <p className="font-data-mono text-data-mono text-on-surface-variant mt-2">
              {header.subtitle}
            </p>
          </div>
          <div className="text-right font-data-mono text-data-mono flex flex-col gap-1">
            <span>
              SYS_TIME:{" "}
              <span className="text-primary font-bold">{clock} UTC</span>
            </span>
            <span>ENV: {header.env}</span>
            <span>
              CHAIN:{" "}
              <span
                className={
                  receipts.chainOk
                    ? "text-secondary font-bold"
                    : "text-error font-bold"
                }
              >
                {receipts.chainOk ? "VERIFIED" : "BROKEN"}
              </span>
            </span>
          </div>
        </header>

        {/* ── Top stat bar ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-unit">
          <StatCard label="FUNDED NPV // 3-YR">{stats.npvMoney}</StatCard>
          <StatCard label="ACTIVE TEAMS">
            {stats.capacityUsed} / {stats.capacity}
            <span
              className={`font-data-mono text-data-mono ml-2 ${
                stats.atMax
                  ? "text-secondary group-hover:text-secondary-fixed"
                  : "text-on-surface-variant group-hover:text-on-primary"
              }`}
            >
              {stats.atMax ? "MAX CAP" : "OPEN"}
            </span>
          </StatCard>
          <StatCard label="CAPACITY UTILIZATION">{stats.utilization}%</StatCard>
        </section>

        {/* ── Structural insight banner ("where's growth?") ──────────────── */}
        <StructuralBanner insight={insight} />

        {/* ── Resource distribution (the lens) ────────────────────────────── */}
        <section className="flex flex-col gap-unit">
          <div className="flex flex-wrap items-stretch justify-between gap-unit">
            <h2 className="font-label-caps text-label-caps text-primary bg-surface-variant p-2 technical-border flex items-center grow">
              FUNDED ALLOCATION // {active.caption}
            </h2>
            {/* lens toggle */}
            <div className="flex technical-border divide-x divide-primary">
              {LENSES.map((l) => {
                const on = l.id === lens;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLens(l.id)}
                    aria-pressed={on}
                    className={`flex items-center gap-2 px-3 py-2 font-label-caps text-label-caps transition-none ${
                      on
                        ? "bg-primary text-on-primary"
                        : "bg-surface-bright text-on-surface-variant hover:bg-surface-variant hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {l.icon}
                    </span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-unit">
            {dist.map((b) => (
              <AllocationCard
                key={b.key}
                label={b.key}
                count={b.count}
                pct={b.pct}
                accent={b.accent}
              />
            ))}
          </div>
        </section>

        {/* ── Funded capacity roster ──────────────────────────────────────── */}
        <section className="flex flex-col gap-0 technical-border bg-surface-bright">
          <div className="bg-primary text-on-primary p-3 flex items-center justify-between">
            <h2 className="font-label-caps text-label-caps">
              FUNDED INITIATIVE CAPACITY ROSTER
            </h2>
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </div>

          {/* impact filter strip */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b-technical bg-surface-container-low">
            <span className="font-label-caps text-label-caps text-on-surface-variant mr-1">
              BUSINESS IMPACT:
            </span>
            <FilterChip active={impact === "All"} onClick={() => setImpact("All")}>
              ALL · {counts.All}
            </FilterChip>
            {IMPACTS.map((i) => (
              <FilterChip
                key={i}
                active={impact === i}
                onClick={() => setImpact(i)}
              >
                {i.toUpperCase()} · {counts[i]}
              </FilterChip>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-technical bg-surface-container font-label-caps text-label-caps text-on-surface-variant">
                  <th className="p-3 font-normal technical-border">INIT_ID</th>
                  <th className="p-3 font-normal technical-border">IMPACT</th>
                  <th className="p-3 font-normal technical-border">INITIATIVE</th>
                  <th className="p-3 font-normal technical-border text-right">
                    NPV // 3-YR
                  </th>
                  <th className="p-3 font-normal technical-border text-right">
                    TEAMS
                  </th>
                  <th className="p-3 font-normal technical-border">STATUS</th>
                  <th className="p-3 font-normal technical-border text-right">
                    TIME TO AVAILABILITY
                  </th>
                </tr>
              </thead>
              <tbody className="font-data-mono text-data-mono">
                {visible.map((row) => {
                  const c = countdowns[row.id];
                  const pinned = !c;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-surface transition-none border-b-technical group"
                    >
                      <td className="p-3 technical-border group-hover:bg-primary group-hover:text-on-primary">
                        {row.id}
                      </td>
                      <td className="p-3 technical-border">
                        {row.impact.toUpperCase()}
                      </td>
                      <td className="p-3 technical-border">{row.title}</td>
                      <td className="p-3 technical-border text-right">
                        {row.npvMoney}
                      </td>
                      <td className="p-3 technical-border text-right">
                        {row.teams}
                      </td>
                      <td className="p-3 technical-border">
                        <span
                          className={`${statusBadgeClass(
                            row.status
                          )} px-2 py-1 font-label-caps text-[10px]`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td
                        className={`p-3 technical-border text-right ${
                          pinned ? "text-secondary" : "text-on-surface-variant"
                        }`}
                      >
                        {fmtCountdown(c)}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr className="border-b-technical">
                    <td
                      className="p-3 technical-border text-on-surface-variant"
                      colSpan={7}
                    >
                      NO FUNDED WORK MAPS TO {impact.toUpperCase()} — CLEAR THE
                      FILTER.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2 bg-surface-container font-data-mono text-data-mono text-[10px] text-on-surface-variant flex flex-wrap gap-2 justify-between">
            <span>
              SHOWING {visible.length} OF {roster.length} FUNDED INITIATIVES ·
              METHODOLOGY {receipts.methodology}
            </span>
            <span>
              CHAIN {receipts.chainCount} EVENTS · HEAD {receipts.head}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}

// ── Stat card — Stitch's hover-invert grid panel ───────────────────────────
function StatCard({ label, children }) {
  return (
    <div className="technical-border bg-surface-bright p-gutter flex flex-col justify-between hover:bg-primary hover:text-on-primary group transition-none">
      <div className="font-label-caps text-label-caps text-on-surface-variant group-hover:text-on-primary mb-6">
        {label}
      </div>
      <div className="font-headline-md text-headline-md">{children}</div>
    </div>
  );
}

// ── Structural insight banner — the "where's growth?" read, built in the
// Stitch idiom (hard-edged technical panel, single green accent). Flags green
// when funded growth is genuinely represented; otherwise carries the plain
// ink/warning read. Honest either way — the copy mirrors the funded-NPV split
// the engine computed.
function StructuralBanner({ insight }) {
  const flagged = !insight.growthThin; // green only when growth is represented
  const accentStripe = flagged ? "border-secondary" : "border-primary";
  const panelBg = flagged ? "bg-secondary-container" : "bg-surface-bright";
  const eyebrowColor = flagged
    ? "text-on-secondary-container"
    : "text-on-surface-variant";
  return (
    <section
      className={`technical-border ${panelBg} border-l-4 ${accentStripe} p-gutter flex flex-col gap-3`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`material-symbols-outlined text-[18px] ${
            flagged ? "text-secondary" : "text-primary"
          }`}
        >
          {flagged ? "trending_up" : "warning"}
        </span>
        <span className={`font-label-caps text-label-caps ${eyebrowColor}`}>
          STRUCTURAL READ // FUNDED NPV MIX
        </span>
      </div>

      <p className="font-body-lg text-body-lg text-on-background max-w-[78ch]">
        Of <strong className="font-bold">{insight.npvTotalMoney}</strong> in
        funded 3-year NPV,{" "}
        <strong className="font-bold">{insight.defensivePct}%</strong> is
        cost-save, risk-reduction, or internal-enabler value, and{" "}
        <strong className="font-bold text-secondary">
          {insight.growthPct}%
        </strong>{" "}
        is direct revenue or strategic optionality.{" "}
        {insight.optionalityFunded === 0 ? (
          <>
            <strong className="font-bold">Zero</strong> strategic-optionality
            work is funded — the slate is buying down cost and risk, not buying
            growth options.{" "}
            <em className="not-italic underline decoration-1 underline-offset-2">
              Where&apos;s growth?
            </em>
          </>
        ) : (
          <>
            {insight.fundedGrowthCount} discretionary growth bet
            {insight.fundedGrowthCount === 1 ? "" : "s"} carried the line. Growth
            is represented, but thin — watch it next cycle.
          </>
        )}
      </p>
    </section>
  );
}

// ── Allocation card — Stitch's segmented "N/N teams" bar, generalized to any
// distribution bucket. `pct` of the segments fill green/ink; the remainder is
// dashed (the "unallocated" cells in Stitch). The accent bucket fills green.
function AllocationCard({ label, count, pct, accent }) {
  const CELLS = 6;
  const filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * CELLS);
  const cells = Array.from({ length: CELLS }, (_, i) => i < filled);
  return (
    <div className="technical-border bg-surface-bright p-gutter flex flex-col gap-4">
      <div className="flex justify-between items-center border-b-technical pb-2 gap-2">
        <span className="font-label-caps text-label-caps truncate" title={label}>
          {label}
        </span>
        <span className="font-data-mono text-data-mono whitespace-nowrap">
          {count} {count === 1 ? "ITEM" : "ITEMS"}
        </span>
      </div>
      <div className="flex gap-1 h-8">
        {cells.map((on, i) =>
          on ? (
            <div
              key={i}
              className={`flex-1 border-r border-background ${
                accent ? "bg-secondary" : "bg-primary"
              }`}
            />
          ) : (
            <div
              key={i}
              className="flex-1 bg-surface-variant border border-primary border-dashed"
            />
          )
        )}
      </div>
      <div className="font-data-mono text-data-mono text-on-surface-variant text-right">
        {pct}% OF FUNDED
      </div>
    </div>
  );
}

// ── filter chip (roster business-impact) ───────────────────────────────────
function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2 py-1 font-label-caps text-[10px] technical-border transition-none ${
        active
          ? "bg-primary text-on-primary"
          : "bg-surface-bright text-on-surface-variant hover:bg-surface-variant hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
