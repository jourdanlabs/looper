"use client";

// GuidedTour — a self-contained, dependency-free PRESENTATION walkthrough of the
// LOOPER board. A title slide → 12 spotlight stops grouped into four acts →
// a closing slide, with optional AUTO-PLAY (timed advance + a progress bar) so it
// can run itself like a deck or be driven by hand. Spotlights anchor to real DOM
// via [data-tour="…"]; everything is inline-styled against the app's own tokens
// (ink on paper, the #196c42 verified-green, IBM Plex Mono labels, Inter display,
// 1px technical borders, square corners) so it reads native and survives the purge.
//
// Drive it: ▶/❚❚ play-pause · ← → / Enter step · Space play-pause · R replay · Esc close.

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const LS_KEY = "looper-tour-v4";
const MONO = "var(--font-plex-mono), 'IBM Plex Mono', ui-monospace, monospace";
const SANS = "var(--font-inter), Inter, system-ui, sans-serif";
const GREEN = "#196c42";
const GREEN_HI = "#2f9e63";
const INK = "#16110d";
const MUTED = "#47464b";
const STEP_MS = 7200; // auto-advance dwell on a content stop
const COVER_MS = 4200; // dwell on the title slide before it rolls

const STEPS = [
  {
    kind: "cover",
    kicker: "JourdanLabs · Live walkthrough",
    title: "LOOPER",
    sub: "Every module on one tamper-evident chain. Two minutes, end to end.",
  },

  { kind: "step", n: 1, act: "I · The board", sel: '[data-tour="identity"]', title: "This is LOOPER.",
    body: "The published priority queue — one screen, regenerated from the decision record so it can't go stale." },
  { kind: "step", n: 2, act: "I · The board", sel: '[data-tour="stats"]', title: "Every number here is computed, not typed.",
    body: "Funded, benched, duplicates held, capacity, in-year NPV — produced by the engine from the same inputs every time. Nobody hand-keys these into a slide." },
  { kind: "step", n: 3, act: "I · The board", sel: '[data-tour="chain"]', title: "The whole board is provable.",
    body: "Change any past decision and CHAIN VERIFIED flips to CHAIN BROKEN and names where it broke. That's the difference from a deck." },

  { kind: "step", n: 4, act: "II · The queue", sel: '[data-tour="filters"]', title: "Filter by business impact.",
    body: "Partner, Consumer, Platform — counts are live. And the line on the right is the invitation: click any row for its receipt." },
  { kind: "step", n: 5, act: "II · The queue", sel: '[data-tour="queue"]', title: "Ranked by score, funded against capacity.",
    body: "NOW is funded; LATER is benched this cycle. Open any row for its full score breakdown and the ledger trail that proves the why." },

  { kind: "step", n: 6, act: "III · The gates", sel: '[data-tour="dedup"]', title: "Same outcome, proposed three times.",
    body: "The engine clusters by outcome, funds the strongest, holds the rest — before a line of code. One calculator, not three at a million each." },
  { kind: "step", n: 7, act: "III · The gates", sel: '[data-tour="refused"]', title: "The napkin gets refused at intake.",
    body: "Structure and evidence enforced at submission, not patched up at review. If it isn't a real intake, it never enters the queue — and the refusal is on the record." },

  { kind: "step", n: 8, act: "IV · The output", sel: '[data-tour="readout"]', title: "The readout replays from the chain.",
    body: "A markdown brief regenerated from the ledger — not hand-edited. Paste it anywhere and it stays true to the system of record. It cannot quietly drift." },

  { kind: "step", n: 9, act: "IV · Spec", sel: '[data-tour="tabs"]', title: "Funded decisions become build-ready specs.",
    body: "Open SPEC on a funded initiative and CADMUS turns the decision into a real spec — objective, acceptance criteria, non-goals, constraints — deterministically. Same inputs, same spec, every time; and it refuses to guess, flagging what's underspecified instead of inventing it. The bridge from what we decided to what to build." },

  { kind: "step", n: 10, act: "IV · LOOPER", sel: '[data-tour="tabs"]', title: "Prioritize → backlog → capacity.",
    body: "PRIORITIZE rescoring the full open backlog into one stack rank — same inputs, same order, RANKING_PUBLISHED on the chain. BACKLOG slices All / Planning Group / Team. CAPACITY shows utilization by Planning Group — and the engineer roster below it maps each person's strength and skillset to the team." },
  { kind: "step", n: 11, act: "IV · LOOPER", sel: '[data-tour="tabs"]', title: "STRATA reporting & governed metrics.",
    body: "REPORTING reconciles the Portfolio extract across JIRA, Align, and Finance — or refuses. METRICS runs Delivery and Flow sets with SHA-fingerprinted definitions. DOCS binds operating and governance processes to the system state they describe." },
  { kind: "step", n: 12, act: "IV · LOOPER", sel: '[data-tour="tabs"]', title: "Governance, assistant, and the audit trail.",
    body: "Governance is the approval gate for team, access, and Product Context changes — receipted. The ASSISTANT answers from governed sources only, or refuses. DIALS sandboxes weight changes; AUDIT looks up any decision by hash. INTAKE still scores live — or refuses at the door." },

  {
    kind: "outro",
    kicker: "That's LOOPER v1",
    title: "Prioritization as math. Every decision a receipt.",
    sub: "Every module on one Planning Group spine — funded-to-spec via CADMUS, reconcile-or-refuse reporting, cite-or-refuse answers. Running today.",
  },
];
const CONTENT = STEPS.filter((s) => s.kind === "step").length;
const LAST = STEPS.length - 1;

function readRect(sel) {
  if (typeof document === "undefined" || !sel) return null;
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function GuidedTour() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  const [playing, setPlaying] = useState(false);

  const step = STEPS[i];

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setRect(readRect(STEPS[i]?.sel));
  }, [i]);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(LS_KEY)) setOpen(true);
    } catch {
      /* private mode — launcher still works */
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const el = step?.sel ? document.querySelector(step.sel) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(measure, el ? 360 : 0);
    return () => clearTimeout(t);
  }, [open, i, step, measure]);

  useEffect(() => {
    if (!open) return;
    const on = () => measure();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open, measure]);

  const finish = useCallback(() => {
    setOpen(false);
    setPlaying(false);
    try {
      window.localStorage.setItem(LS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);
  const next = useCallback(() => setI((n) => Math.min(LAST, n + 1)), []);
  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const start = useCallback(() => {
    setI(0);
    setOpen(true);
    setPlaying(false);
  }, []);
  const restart = useCallback(() => {
    setI(0);
    setPlaying(true);
  }, []);

  // Auto-advance while playing; stops itself on the closing slide.
  useEffect(() => {
    if (!open || !playing) return;
    if (step.kind === "outro") {
      setPlaying(false);
      return;
    }
    const ms = step.kind === "cover" ? COVER_MS : STEP_MS;
    const t = setTimeout(() => setI((n) => (n >= LAST ? n : n + 1)), ms);
    return () => clearTimeout(t);
  }, [open, playing, i, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") { e.preventDefault(); finish(); }
      else if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, finish, restart]);

  // ── Launcher ──────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        aria-label="Watch the walkthrough"
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 55, fontFamily: MONO, fontSize: 11,
          fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "#ffffff",
          color: INK, border: "1px solid #000000", boxShadow: "3px 3px 0 0 rgba(22,17,13,0.16)",
          padding: "9px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
        }}
      >
        <span style={{ color: GREEN, fontSize: 13, lineHeight: 1 }}>▸</span> Watch the walkthrough
      </button>
    );
  }

  // ── Geometry (content stops only) ─────────────────────────────────────────
  const W = Math.min(420, vp.w - 32);
  const PAD = 16;
  const CARD_H = 320;
  let cardPos = null;
  if (step.kind === "step") {
    if (!rect) {
      cardPos = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: W };
    } else {
      const left = Math.max(PAD, Math.min(rect.left, Math.max(PAD, vp.w - W - PAD)));
      let top;
      if (rect.top + rect.height + 16 + CARD_H <= vp.h - PAD) top = rect.top + rect.height + 16;
      else if (rect.top - 16 - CARD_H >= PAD) top = rect.top - 16 - CARD_H;
      else top = vp.h - CARD_H - PAD;
      top = vp.h >= CARD_H + 2 * PAD ? Math.max(PAD, Math.min(top, vp.h - CARD_H - PAD)) : PAD;
      cardPos = { top, left, width: W };
    }
  }

  let spot = null;
  if (step.kind === "step" && rect) {
    const H = Math.min(rect.height + 14, vp.h * 0.7);
    const cy = rect.top + rect.height / 2;
    spot = {
      position: "fixed", top: cy - H / 2, left: Math.max(6, rect.left - 6),
      width: Math.min(rect.width + 12, vp.w - 12), height: H,
      boxShadow: "0 0 0 9999px rgba(10,10,9,0.74)", border: `2px solid ${GREEN}`, borderRadius: 2,
      zIndex: 60, pointerEvents: "none",
      transition: "top .42s cubic-bezier(.4,0,.2,1), left .42s cubic-bezier(.4,0,.2,1), width .42s cubic-bezier(.4,0,.2,1), height .42s cubic-bezier(.4,0,.2,1)",
    };
  }

  const btn = {
    fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "9px 14px", cursor: "pointer", border: "1px solid #000000", lineHeight: 1, background: "#fff", color: INK,
  };
  const btnGreen = { ...btn, background: GREEN, color: "#fff", borderColor: GREEN };
  const iconBtn = { ...btn, padding: "8px 11px", minWidth: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 };
  const stepMs = step.kind === "cover" ? COVER_MS : STEP_MS;

  const keyframes =
    "@keyframes hlFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes hlRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
    "@keyframes hlSlide{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}";

  return (
    <div role="dialog" aria-modal="true" aria-label="Guided walkthrough">
      <style>{keyframes}</style>

      {/* dim — spotlight cutout for stops, full cinematic scrim for the slides */}
      {spot ? (
        <div style={spot} aria-hidden="true" />
      ) : (
        <div
          aria-hidden="true"
          onClick={step.kind === "step" ? finish : undefined}
          style={{ position: "fixed", inset: 0, background: "rgba(10,10,9,0.82)", zIndex: 60, animation: "hlFade .3s ease" }}
        />
      )}

      {/* ── COVER / OUTRO — the presentation slides ─────────────────────────── */}
      {(step.kind === "cover" || step.kind === "outro") && (
        <div style={{ position: "fixed", inset: 0, zIndex: 61, background: "rgba(10,10,9,0.97)", display: "flex", alignItems: "center", justifyContent: "center", padding: "6vw", animation: "hlFade .3s ease" }}>
          <div key={`slide-${i}`} style={{ width: "min(680px, 92vw)", animation: "hlSlide .45s cubic-bezier(.2,.7,.2,1)" }}>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: GREEN_HI, marginBottom: 18 }}>
              {step.kicker}
            </div>
            <h1 style={{ fontFamily: SANS, fontSize: "clamp(40px,7vw,72px)", lineHeight: 1.03, letterSpacing: "-.025em", fontWeight: 900, color: "#fff", margin: 0 }}>
              {step.title}
            </h1>
            <p style={{ fontFamily: SANS, fontSize: "clamp(16px,2.3vw,21px)", lineHeight: 1.45, color: "#cfcdc9", margin: "20px 0 0", maxWidth: "46ch" }}>
              {step.sub}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 34, flexWrap: "wrap", alignItems: "center" }}>
              {step.kind === "cover" ? (
                <>
                  <button type="button" onClick={() => { setI(1); setPlaying(true); }} style={{ ...btnGreen, padding: "12px 22px", fontSize: 12 }}>▶ Play walkthrough</button>
                  <button type="button" onClick={() => { setI(1); setPlaying(false); }} style={{ ...btn, background: "transparent", color: "#fff", borderColor: "#555", padding: "12px 20px", fontSize: 12 }}>Click through →</button>
                  <button type="button" onClick={finish} style={{ ...btn, background: "transparent", color: "#8a8a86", border: "none", padding: "12px 6px", fontSize: 12 }}>Skip</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={restart} style={{ ...btn, background: "transparent", color: "#fff", borderColor: "#555", padding: "12px 20px", fontSize: 12 }}>↺ Replay</button>
                  <button type="button" onClick={finish} style={{ ...btnGreen, padding: "12px 22px", fontSize: 12 }}>Done ✓</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT STOP — the spotlight card ───────────────────────────────── */}
      {step.kind === "step" && cardPos && (
        <div
          key={`card-${i}`}
          style={{
            position: "fixed", ...cardPos, zIndex: 61, background: "#ffffff", border: "1px solid #000000",
            borderTop: `3px solid ${GREEN}`, boxShadow: "6px 8px 0 0 rgba(22,17,13,0.22)", padding: "16px 20px 14px",
            boxSizing: "border-box", animation: "hlRise .32s cubic-bezier(.2,.7,.2,1)",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: GREEN, marginBottom: 9 }}>
            {step.act}
          </div>
          <h3 style={{ fontFamily: SANS, fontSize: 20, lineHeight: 1.2, fontWeight: 800, color: INK, margin: "0 0 8px", letterSpacing: "-.01em" }}>
            {step.title}
          </h3>
          <p style={{ fontFamily: SANS, fontSize: 14, lineHeight: 1.5, color: MUTED, margin: 0 }}>{step.body}</p>

          {/* auto-advance fill bar */}
          <div style={{ height: 3, background: "#e6e3dc", margin: "14px 0 12px", overflow: "hidden" }}>
            <div
              key={`fill-${i}-${playing}`}
              style={{ height: "100%", background: GREEN, width: playing ? "100%" : "0%", transition: playing ? `width ${stepMs}ms linear` : "none" }}
            />
          </div>

          {/* controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <button type="button" onClick={() => setPlaying((p) => !p)} style={iconBtn} aria-label={playing ? "Pause" : "Play"}>
                {playing ? "❚❚" : "▶"}
              </button>
              <span style={{ fontFamily: MONO, fontSize: 11, color: MUTED, letterSpacing: ".06em" }}>
                {String(step.n).padStart(2, "0")} / {String(CONTENT).padStart(2, "0")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {i > 0 && <button type="button" onClick={prev} style={btn}>← Back</button>}
              <button type="button" onClick={i >= LAST ? finish : next} style={btnGreen}>{i >= LAST ? "Done ✓" : "Next →"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
