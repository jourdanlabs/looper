"use client";

// GateNoticeStitch — the Draft→Submitted evidence gate, rendered in the Stitch
// brutalist idiom. The verdict is the REAL engine's: lib/rubric.mjs canSubmit()
// decides; this only displays it.
//
//   • CLEAR   → a green-keyed banner: every claim cites evidence, structure
//               complete, eligible to enter the queue as Submitted.
//   • REFUSED → the CADMUS refusal: a 2px ink box on a 45° hatch, listing every
//               missing requirement by its rubric label (claimed-but-unsourced)
//               and any absent structural field. Refusal is a feature: a number
//               with no source behind it does not become Submitted.

export default function GateNoticeStitch({ gate, structuralMissing = [], flash }) {
  const evidenceMissing = gate?.missing ?? [];
  const blocked = !gate?.allowed || structuralMissing.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {!blocked ? (
        <div className="technical-border border-secondary bg-secondary-container/30 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">
              check_circle
            </span>
            <span className="font-label-caps text-label-caps text-on-secondary-container uppercase">
              CLEAR · DRAFT → SUBMITTED
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">
            Every claim cites its evidence and the structural rubric is complete.
            This initiative is eligible to enter the queue as{" "}
            <span className="font-data-mono text-data-mono text-primary">SUBMITTED</span>.
          </p>
        </div>
      ) : (
        <div
          className="border-2 border-primary p-4 flex flex-col gap-3"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #faf9f5, #faf9f5 8px, #eeeeea 8px, #eeeeea 16px)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">block</span>
            <span className="font-label-caps text-label-caps text-primary uppercase">
              REFUSED · DRAFT → SUBMITTED BLOCKED
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">
            Evidence is enforced <em>at submission, not at review</em>. The failure
            mode this kills is the number with no source behind it. Resolve the
            items below — then the gate opens.{" "}
            <span className="font-data-mono text-data-mono text-primary">
              No source, no submission.
            </span>
          </p>

          {structuralMissing.length > 0 && (
            <div className="bg-surface technical-border p-3">
              <div className="font-label-caps text-label-caps text-primary uppercase mb-2">
                STRUCTURAL — REQUIRED FIELDS MISSING
              </div>
              <div className="flex flex-wrap gap-2">
                {structuralMissing.map((f) => (
                  <span
                    key={f}
                    className="font-data-mono text-data-mono text-primary technical-border px-2 py-0.5 bg-surface-container"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidenceMissing.length > 0 && (
            <div className="bg-surface technical-border p-3">
              <div className="font-label-caps text-label-caps text-primary uppercase mb-2">
                EVIDENCE — CLAIMED BUT UNSOURCED
              </div>
              <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                {evidenceMissing.map((m) => (
                  <li key={m.field} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[14px] mt-0.5">
                      priority_high
                    </span>
                    <span className="font-body-md text-body-md text-primary">
                      {m.label}{" "}
                      <span className="font-data-mono text-data-mono text-on-surface-variant">
                        ({m.field})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {flash && (
        <div
          className={
            flash.kind === "ok"
              ? "technical-border border-secondary bg-secondary-container/30 p-3 flex items-center gap-2"
              : "technical-border border-primary p-3 flex items-center gap-2"
          }
        >
          <span
            className={
              flash.kind === "ok"
                ? "material-symbols-outlined text-secondary text-[18px]"
                : "material-symbols-outlined text-primary text-[18px]"
            }
          >
            {flash.kind === "ok" ? "task_alt" : "error"}
          </span>
          <span className="font-body-md text-body-md text-primary">{flash.text}</span>
        </div>
      )}
    </div>
  );
}
