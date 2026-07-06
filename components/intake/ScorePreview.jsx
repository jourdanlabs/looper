"use client";

// ScorePreview — the live, deterministic score panel for /intake.
//
// It does NOT reimplement scoring. It calls the real engine — lib/score.mjs
// scoreInitiative — on the current form's Initiative and renders the receipt:
// the 0–100 display score, the RICE terms, and the per-component 3-yr NPV. Same
// inputs → byte-identical number, every keystroke. This is the audit guarantee
// made visible at submission time.

import { scoreInitiative } from "../../lib/score.mjs";
import { ScoreMeter, Label, Mono } from "../index.js";

function money(v) {
  const n = Number(v) || 0;
  const neg = n < 0;
  const a = Math.abs(n);
  let out;
  if (a >= 1_000_000) out = `$${(a / 1_000_000).toFixed(2)}M`;
  else if (a >= 1_000) out = `$${Math.round(a / 1_000)}k`;
  else out = `$${Math.round(a)}`;
  return neg ? `(${out})` : out;
}

const COMPONENT_LABELS = {
  revenue: "Revenue",
  costSave: "Cost-save",
  costAvoid: "Cost-avoid",
  riskReduction: "Risk-reduction",
  customerImpact: "Customer-impact",
  ongoingTCO: "Ongoing TCO",
};

export default function ScorePreview({ initiative }) {
  // Run the real engine. Guard against the empty/napkin shape so the panel
  // never throws — an unscoreable draft simply reads 0, honestly.
  let result;
  try {
    result = scoreInitiative(initiative);
  } catch {
    result = null;
  }

  const score = result?.score ?? 0;
  const bd = result?.breakdown;
  const rice = bd?.rice;
  const npv = bd?.npv;

  return (
    <div className="stack" style={{ gap: "0.85rem" }}>
      <div className="spread" style={{ alignItems: "center" }}>
        <div>
          <Label>Deterministic score preview</Label>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: "0.2rem" }}>
            Live from <Mono>lib/score.mjs</Mono> · same inputs → same number
          </div>
        </div>
        <ScoreMeter score={score} width={120} />
      </div>

      <hr className="divider" style={{ margin: "0.2rem 0" }} />

      {/* RICE terms — the receipt, not a re-derivation. */}
      <div>
        <Label>RICE terms</Label>
        <div className="grid-3" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
          <Field label="Reach" v={rice ? Math.round(rice.reach).toLocaleString() : "—"} />
          <Field label="Impact (NPV)" v={npv ? money(npv.total) : "—"} />
          <Field
            label="Confidence"
            v={rice ? rice.confidence.toFixed(2) : "—"}
          />
          <Field
            label="Effort (team-wks)"
            v={rice ? rice.effortTeamWeeks : "—"}
          />
          <Field
            label="Value-type wt"
            v={rice ? rice.valueTypeWeight.toFixed(2) : "—"}
          />
          <Field
            label="Talent factor"
            v={rice ? rice.talentFactor.toFixed(2) : "—"}
          />
        </div>
      </div>

      {/* NPV component breakdown — the time-value-correct dollar figure. */}
      <div>
        <Label>3-yr NPV components</Label>
        <table className="table" style={{ marginTop: "0.4rem" }}>
          <tbody>
            {npv
              ? Object.entries(npv.components).map(([k, v]) => (
                  <tr key={k}>
                    <td>{COMPONENT_LABELS[k] || k}</td>
                    <td className="num">{money(v)}</td>
                  </tr>
                ))
              : (
                <tr>
                  <td className="muted">No scoreable inputs yet</td>
                  <td className="num muted">—</td>
                </tr>
              )}
            <tr>
              <td>
                <strong>NPV Impact</strong>
              </td>
              <td className="num">
                <strong>{npv ? money(npv.total) : "—"}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ fontSize: "0.72rem" }}>
        Raw priority{" "}
        <Mono>{bd ? bd.priorityRaw.toLocaleString() : "—"}</Mono> · methodology{" "}
        <Mono>{bd?.methodologyVersion ?? "v1.0"}</Mono>. The preview scores every
        draft for transparency; whether it can be <em>submitted</em> is the
        evidence gate, not the number.
      </div>
    </div>
  );
}

function Field({ label, v }) {
  return (
    <div className="well" style={{ padding: "0.5rem 0.6rem" }}>
      <div className="label">{label}</div>
      <div
        className="mono"
        style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: "0.15rem" }}
      >
        {v}
      </div>
    </div>
  );
}
