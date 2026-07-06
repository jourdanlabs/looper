// /dials — the Dial Board (§6), reskinned to the "System Dials" design and
// wired to the REAL engine.
//
// SERVER component: it computes the PUBLISHED baseline (the engine uses
// node:crypto for the chain, so it must run server-side), builds the id→title
// map, and resolves the default dials — then hands all of that to the client
// <StitchDialBoard>, which owns the sliders and the publish flow.
//
// The live re-rank and the publish itself happen through two server route
// handlers (app/dials/preview + app/dials/publish) so the engine is never
// imported into client code. See the CONTRACT, §5.3.
//
// All numbers on this surface are real engine output — the published version,
// the chain head + verify, the value-type list, and the baseline ranking. None
// of Stitch's placeholder values (40%/30%/v1.2/04:23:59) survive: the Stitch
// markup and classes are kept, the data underneath is the engine's.

import { prioritize } from "../../lib/engine.mjs";
import { rankUnder } from "../../lib/methodology.mjs";
import { resolveDials } from "../../lib/dials.mjs";
import { VALUE_TYPE_LIST } from "../../lib/types.mjs";
import { INITIATIVES } from "../../seed/initiatives.mjs";
import StitchDialBoard from "../../components/dials/StitchDialBoard.jsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dials · LOOPER" };

export default function DialsPage() {
  // Full pipeline once — for the published methodology stamp + the live chain
  // head/verify shown in the header.
  const result = prioritize(INITIATIVES, { capacity: 12 });

  // The published baseline ranking under the default dials. Pure rank (no
  // ledger) — exactly what the sandbox compares against.
  const defaultDials = resolveDials();
  const baseline = rankUnder(INITIATIVES, {}, { capacity: 12 });

  // id → {title, valueType, area} for the client rail (the engine result has the
  // full items; we only ship the display fields the board needs).
  const titles = {};
  for (const it of INITIATIVES) {
    titles[it.id] = {
      title: it.title,
      valueType: it.valueType ?? "",
      area: it.area ?? "",
    };
  }

  return (
    <main className="lg:ml-0 p-margin min-h-screen flex flex-col gap-gutter max-w-container-max mx-auto">
      <StitchDialBoard
        valueTypeList={[...VALUE_TYPE_LIST]}
        defaultDials={{
          valueTypeWeights: { ...defaultDials.valueTypeWeights },
          r: defaultDials.r,
          horizon: defaultDials.horizon,
          confidenceSensitivity: defaultDials.confidenceSensitivity,
        }}
        baseline={baseline}
        titles={titles}
        initialVersion={result.methodology_version}
        head={result.head || ""}
      />
    </main>
  );
}
