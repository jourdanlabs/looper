# LOOPER

**A deterministic, auditable product-prioritization operating layer.**

LOOPER turns a stream of proposals into a defensible, ranked commitment set — and
keeps every decision reproducible six months later. Strategy becomes rank, rank
becomes commitment, and **every decision carries a receipt**.

It is a *system*, not a meeting. The scoring, the dedup gate, the capacity
allocation, and the audit trail all run from the same inputs every time — so the
answer to "why is this funded and that benched?" is a hash-chained record, not a
recollection.

---

## Why it's different

- **Deterministic.** Same inputs → same score → same rank, every run. No model
  opinion in the ranking path. The engine is a zero-runtime-dependency core
  (`node:crypto` only), so it runs air-gapped for confidential portfolios.
- **Receipted.** Every score, dedup verdict, allocation, and dial change is a
  hash-chained ledger entry. `verify()` walks the chain; tamper anywhere and it
  names where it broke.
- **Refuses.** Incomplete or unstructured intake is rejected at submission, not
  patched up at review. Evidence is enforced before an item can be compared.
- **Anti-duplication.** A dedup gate clusters proposals by outcome and holds the
  weaker duplicates *before* capacity is spent — so you don't fund three teams
  building the same calculator.

## The pipeline

```
intake → dedup → score (RICE + NPV) → tier → allocate → ledger
```

1. **Intake** — rubric-based submission with evidence enforcement; incomplete
   asks are refused.
2. **Dedup** — cluster by outcome, keep the strongest, hold the rest.
3. **Score** — RICE-adapted with a 3-year NPV impact model; a per-criterion and
   per-NPV-component breakdown ships as the receipt.
4. **Tier** — a six-tier lifecycle (Now → Archived); mandates auto-pin to the top.
5. **Allocate** — fund top-down against a capacity line; benched items get a
   receipt with the capacity state at decision time.
6. **Ledger** — the hash-chained record of every decision, replayable and
   verifiable.

## Modules

The web surface (Next.js) exposes the engine as one operating console:
prioritized board, backlog and capacity views, a reconcile-or-refuse reporting
layer, versioned metric sets, a governance-request gate, a cite-or-refuse
assistant, spec authoring, and a full audit terminal — every figure traceable to
an engine receipt.

## Quick start

```bash
npm install

# run the console
npm run dev            # http://localhost:3000

# or drive the engine from the CLI
npm run prioritize     # rank the seeded portfolio
npm run brief          # regenerate the markdown readout from the ledger
npm run verify         # walk the ledger chain and report CHAIN VERIFIED / BROKEN

# tests (determinism + ledger tamper-evidence)
npm test
```

All data under `seed/` is **synthetic demo data** — fictional teams, initiatives,
and roster. Point the engine at your own intake to use it for real.

## Architecture notes

- **Engine** (`lib/`) — pure, deterministic, `node:crypto` only. No network, no
  model, no external state in the ranking path.
- **Console** (`app/`, `components/`) — a Next.js reading surface over the engine;
  it renders receipts, it doesn't compute rankings client-side.
- **Ledger** (`lib/ledger.mjs`) — append-only, hash-chained; `verify()` is the
  contract.

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

---

Built by [JourdanLabs](https://jourdanlabs.com).
