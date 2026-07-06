// Synthetic Portfolio extract — JIRA, Align, Finance slices by Planning Group.
// Illustrative only. Some rows intentionally disagree to exercise reconcile-or-refuse.

import { PLANNING_GROUPS } from "../lib/types.mjs";

export const MASTER_EXTRACT_VERSION = "2026-Q2";

export const MASTER_EXTRACT = [
  {
    planningGroup: PLANNING_GROUPS.GROWTH,
    sources: {
      jira: { openItems: 14, fundedItems: 4, teamSlots: 5 },
      align: { openItems: 14, fundedItems: 4, teamSlots: 5 },
      finance: { fundedNpv: 9_200_000, budgetAllocated: 9_100_000 },
    },
  },
  {
    planningGroup: PLANNING_GROUPS.PAYMENTS,
    sources: {
      jira: { openItems: 11, fundedItems: 3, teamSlots: 4 },
      align: { openItems: 11, fundedItems: 3, teamSlots: 4 },
      finance: { fundedNpv: 7_800_000, budgetAllocated: 7_800_000 },
    },
  },
  {
    planningGroup: PLANNING_GROUPS.CORE_PLATFORM,
    sources: {
      jira: { openItems: 9, fundedItems: 2, teamSlots: 2 },
      align: { openItems: 10, fundedItems: 2, teamSlots: 2 }, // mismatch — refuse
      finance: { fundedNpv: 2_400_000, budgetAllocated: 2_400_000 },
    },
  },
  {
    planningGroup: PLANNING_GROUPS.DEVELOPER_PLATFORM,
    sources: {
      jira: { openItems: 6, fundedItems: 2, teamSlots: 2 },
      align: { openItems: 6, fundedItems: 2, teamSlots: 2 },
      finance: { fundedNpv: 1_100_000, budgetAllocated: 1_050_000 }, // mismatch — refuse
    },
  },
  {
    planningGroup: PLANNING_GROUPS.TRUST_SAFETY,
    sources: {
      jira: { openItems: 4, fundedItems: 1, teamSlots: 1 },
      align: { openItems: 4, fundedItems: 1, teamSlots: 1 },
      finance: { fundedNpv: 3_200_000, budgetAllocated: 3_200_000 },
    },
  },
];