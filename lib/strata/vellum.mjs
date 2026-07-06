// VELLUM — provenance envelope: every published number carries source + SHA.

import { sha } from "../ledger.mjs";

/**
 * Wrap a value with its source lineage and content fingerprint.
 * @param {*} value
 * @param {{ source: string, extractVersion?: string, fields?: string[] }} meta
 */
export function vellumWrap(value, meta) {
  const body = JSON.stringify({ value, source: meta.source, extractVersion: meta.extractVersion ?? null });
  return {
    value,
    source: meta.source,
    extractVersion: meta.extractVersion ?? null,
    fields: meta.fields ?? [],
    fingerprint: sha(body).slice(0, 16),
  };
}