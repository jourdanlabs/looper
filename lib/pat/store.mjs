// Product Context Module — local context files for the assistant.

import { sha } from "../ledger.mjs";

const files = new Map();

// Seed context
files.set("checkout", {
  id: "checkout",
  product: "Checkout",
  version: "1.0.0",
  updatedAt: "2026-06-01T00:00:00Z",
  content:
    "Checkout covers partner and consumer onboarding and checkout. Planning Group: Payments, Growth. Key metric: transaction volume and pricing service uptime.",
});

files.set("account-hub", {
  id: "account-hub",
  product: "Account Hub",
  version: "1.0.0",
  updatedAt: "2026-06-01T00:00:00Z",
  content:
    "Account Hub is the customer-facing portal and internal account tools. Planning Group: Core Platform. Subscription management and payment workflows are in scope.",
});

files.set("platform-core", {
  id: "platform-core",
  product: "Platform Core",
  version: "1.0.0",
  updatedAt: "2026-06-01T00:00:00Z",
  content:
    "Platform Core is shared infrastructure, data pipelines, and internal enablers. Planning Group: Developer Platform.",
});

export function listPatContext() {
  return [...files.values()].map(summarize);
}

export function getPatContext(id) {
  const f = files.get(id);
  if (!f) return null;
  return { ...f, fingerprint: fingerprint(f) };
}

export function upsertPatContext({ id, product, content }, { ledger } = {}) {
  const existing = files.get(id);
  const next = {
    id,
    product,
    version: bumpPatch(existing?.version ?? "0.0.0"),
    updatedAt: new Date().toISOString(),
    content,
  };
  files.set(id, next);

  if (ledger) {
    ledger.append("PAT_CONTEXT_UPDATED", {
      id,
      product,
      version: next.version,
      fingerprint: fingerprint(next),
    });
  }

  return { ...next, fingerprint: fingerprint(next) };
}

export function removePatContext(id, { ledger } = {}) {
  const existing = files.get(id);
  if (!existing) return null;
  files.delete(id);
  if (ledger) {
    ledger.append("PAT_CONTEXT_REMOVED", { id, product: existing.product });
  }
  return existing;
}

export function patReset() {
  files.clear();
}

function summarize(f) {
  return { id: f.id, product: f.product, version: f.version, updatedAt: f.updatedAt, fingerprint: fingerprint(f) };
}

function fingerprint(f) {
  return sha(JSON.stringify({ id: f.id, product: f.product, content: f.content, version: f.version })).slice(0, 16);
}

function bumpPatch(v) {
  const parts = v.split(".").map(Number);
  parts[2] = (parts[2] ?? 0) + 1;
  return parts.join(".");
}