// /docs — operating + governance documentation bound to system state.

import { listDocs, docsManifest, DOC_KINDS } from "../../lib/docs/registry.mjs";
import { INITIAL_VERSION } from "../../lib/methodology.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentation · LOOPER" };

export default function DocsPage() {
  const manifest = docsManifest();
  const operating = listDocs({ kind: DOC_KINDS.OPERATING });
  const governance = listDocs({ kind: DOC_KINDS.GOVERNANCE });

  return (
    <main className="wrap py-8 space-y-10">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">DOCUMENTATION</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Operating and governance processes version-stamped to the system they describe. The
          documented Dial Board flow is the enforced flow.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-sm text-on-surface-variant">
          {manifest.count} documents · bound to methodology {INITIAL_VERSION}
        </p>
      </header>

      <DocSection title="OPERATING PROCESSES" docs={operating} />
      <DocSection title="GOVERNANCE PROCESSES" docs={governance} />
    </main>
  );
}

function DocSection({ title, docs }) {
  return (
    <section className="space-y-4">
      <h2 className="font-label-caps text-label-caps text-primary">{title}</h2>
      {docs.map((doc) => (
        <article key={doc.id} className="technical-border p-4">
          <header className="flex flex-wrap justify-between gap-2">
            <h3 className="font-headline-sm text-headline-sm text-primary">{doc.title}</h3>
            <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
              {doc.id} · {doc.version}
            </span>
          </header>
          <p className="mt-2 font-data-mono text-data-mono text-xs text-secondary">
            Bound to: {doc.boundTo}
          </p>
          <ol className="mt-4 space-y-2 list-decimal list-inside text-on-surface-variant text-sm">
            {doc.sections.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}