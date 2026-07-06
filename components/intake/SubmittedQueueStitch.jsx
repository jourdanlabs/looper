"use client";

// SubmittedQueueStitch — the in-session list of items that cleared the gate,
// in the Stitch bordered-panel idiom (the floating "04_SUBMITTED_QUEUE" corner
// tag, hard hairlines, the green score bar from the engine).
//
// HONEST SCOPE: v1 has no backend persistence. A submission that passes the
// real canSubmit() is appended here to show what WOULD enter the prioritization
// queue (intake → dedup → score → tier → allocate, on the Board). Nothing is
// written to the ledger here — the Board route owns the chain. Resets on reload.
// The scores shown are the REAL engine's scoreInitiative() output, captured at
// submit time.

function ScoreBar({ score }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-2 bg-surface-container technical-border">
        <div className="h-full bg-secondary" style={{ width: `${v}%` }} />
      </div>
      <span className="font-data-mono text-data-mono text-primary tabular-nums w-7 text-right">
        {v}
      </span>
    </div>
  );
}

export default function SubmittedQueueStitch({ items, onClear }) {
  return (
    <section className="border border-primary bg-surface p-6 relative mt-2">
      <div className="absolute -top-3 left-4 bg-background px-2 font-label-caps text-label-caps text-primary uppercase border border-primary">
        05_SUBMITTED_QUEUE
      </div>

      <div className="flex justify-between items-center mb-3 mt-2">
        <span className="font-data-mono text-data-mono text-on-surface-variant uppercase">
          {items.length} QUEUED · IN-SESSION
        </span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="font-label-caps text-label-caps text-primary uppercase technical-border px-3 py-1 bg-surface-container hover:bg-primary hover:text-on-primary transition-colors duration-100"
          >
            CLEAR
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant m-0">
          Nothing submitted yet. A draft that clears the evidence gate lands here
          and would enter the prioritization queue on the Board. Synthetic /
          in-session only — no backend persistence in v1.
        </p>
      ) : (
        <div className="flex flex-col">
          <div className="grid grid-cols-[2.5rem_1fr_1.2fr_1fr_5rem] gap-3 items-center pb-2 border-b border-primary">
            <Head>·</Head>
            <Head>ID</Head>
            <Head>TITLE</Head>
            <Head>VALUE TYPE</Head>
            <Head className="text-right">SCORE</Head>
          </div>
          {items.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[2.5rem_1fr_1.2fr_1fr_5rem] gap-3 items-center py-2.5 border-b border-outline-variant"
            >
              <span className="material-symbols-outlined text-secondary text-[16px]">
                check_circle
              </span>
              <span className="font-data-mono text-data-mono text-primary">{row.id || "—"}</span>
              <span className="font-body-md text-body-md text-primary truncate">{row.title}</span>
              <span className="font-data-mono text-data-mono text-on-surface-variant uppercase truncate">
                {row.valueType || "—"}
              </span>
              <ScoreBar score={row.score} />
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="font-data-mono text-data-mono text-on-surface-variant mt-3 m-0 leading-relaxed">
          WOULD ENTER THE QUEUE ON THE BOARD (INTAKE → DEDUP → SCORE → TIER →
          ALLOCATE). NOT PERSISTED · NOT YET ON THE LEDGER — THIS IS THE INTAKE
          WAITING ROOM, HONESTLY LOCAL.
        </p>
      )}
    </section>
  );
}

function Head({ children, className = "" }) {
  return (
    <span
      className={`font-label-caps text-label-caps text-on-surface-variant uppercase ${className}`}
    >
      {children}
    </span>
  );
}
