// /metrics — Delivery + Flow governed metric sets.

import { runPrioritize } from "../../lib/store/run.mjs";
import { computeMetrics } from "../../lib/metrics/compute.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metrics · LOOPER" };

export default async function MetricsPage() {
  const { result: r } = await runPrioritize({ capacity: 12 });
  const computed = computeMetrics(r);

  return (
    <main className="wrap py-8 space-y-10">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">METRICS</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Delivery and Flow metric sets — versioned definitions, SHA-fingerprinted, computed
          deterministically from the engine. Publish via API seals METRIC_PUBLISHED on the chain.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-sm text-on-surface-variant">
          Methodology {computed.methodology_version} · head {computed.head?.slice(0, 12)}
        </p>
      </header>

      <MetricSet title="DELIVERY METRICS" metrics={computed.sets.delivery} />
      <MetricSet title="FLOW METRICS" metrics={computed.sets.flow} />
    </main>
  );
}

function MetricSet({ title, metrics }) {
  return (
    <section className="technical-border p-4 space-y-4">
      <h2 className="font-label-caps text-label-caps text-primary">{title}</h2>
      {metrics.map((m) => (
        <div key={m.id} className="border-t border-outline-variant pt-3">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-data-mono text-data-mono text-sm">{m.label}</span>
            <span className="font-data-mono text-data-mono text-xs text-on-surface-variant">
              {m.id} · fp {m.fingerprint}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-data-mono text-data-mono text-sm">
            {m.entries.map((e) => (
              <span key={`${m.id}-${e.cut}`}>
                {e.cut}: <strong>{formatVal(e.value, m.unit)}</strong>
                <span className="text-on-surface-variant text-xs ml-1">({e.envelope.fingerprint.slice(0, 8)})</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function formatVal(v, unit) {
  if (unit === "usd") return `$${(v / 1e6).toFixed(2)}M`;
  if (unit === "pct") return `${v}%`;
  if (unit === "score") return v.toFixed(2);
  return v;
}