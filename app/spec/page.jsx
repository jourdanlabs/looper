// /spec — Spec Authoring (LOOPER module #10). Turn a FUNDED item into a
// build-ready spec: stories, estimates, open questions, and a receipt sealed on
// the one chain as SPEC_DRAFTED. Deterministic — same funded item, same spec,
// same receipt. The engine (CADMUS 6D semantic) runs behind an engine-agnostic
// seam; no model sits in the decision path. Unfunded items cannot be specced —
// spec follows the fund decision, it does not front-run it.

import { runPrioritize } from "../../lib/store/run.mjs";
import { FUNDING } from "../../lib/types.mjs";
import SpecStudio from "../../components/spec/SpecStudio.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Spec · LOOPER" };

export default async function SpecPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });

  const funded = r.ranked
    .filter((it) => it._funding === FUNDING.FUNDED)
    .map((it) => ({
      id: it.id,
      title: it.title,
      area: it.area,
      sponsor: it.sponsor,
      outcome: it.outcome,
      rank: it._rank,
      score: it._score,
      valueType: it.valueType,
      effortTeamWeeks: it.effortTeamWeeks,
      planningGroup: it.planningGroup ?? null,
    }));

  const heldExample = r.ranked.find((it) => it._funding !== FUNDING.FUNDED);
  const refusedSample = heldExample
    ? { id: heldExample.id, title: heldExample.title, funding: heldExample._funding }
    : null;

  return (
    <SpecStudio
      funded={funded}
      refusedSample={refusedSample}
      head={r.head || ""}
      verified={r.verify?.ok ?? false}
      methodologyVersion={r.methodology_version}
    />
  );
}
