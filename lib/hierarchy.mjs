// LOOPER — hierarchy normalization + Planning Group spine.
//
// Every item carries planningGroup / team / product / level / parentId.
// Missing taxonomy fields are derived deterministically from area + valueType
// so legacy seed rows and partial Jira pulls still land in the right cuts.

import {
  LEVELS,
  LEVEL_LIST,
  PLANNING_GROUP_LIST,
  PLANNING_GROUPS,
  TEAM_LIST,
  TEAMS,
  PRODUCT_LIST,
  PRODUCTS,
} from "./types.mjs";

const AREA_TO_PLANNING_GROUP = Object.freeze({
  Payments: PLANNING_GROUPS.PAYMENTS,
  "Platform Ops": PLANNING_GROUPS.DEVELOPER_PLATFORM,
  Growth: PLANNING_GROUPS.GROWTH,
  Sales: PLANNING_GROUPS.GROWTH,
  "Core Platform": PLANNING_GROUPS.CORE_PLATFORM,
  "Internal Tools": PLANNING_GROUPS.DEVELOPER_PLATFORM,
  "Trust & Safety": PLANNING_GROUPS.TRUST_SAFETY,
});

const AREA_TO_TEAM = Object.freeze({
  Payments: TEAMS.PAYMENTS_ENG,
  "Platform Ops": TEAMS.DATA_ANALYTICS,
  Growth: TEAMS.CONSUMER_PRODUCT,
  Sales: TEAMS.CONSUMER_PRODUCT,
  "Core Platform": TEAMS.CORE_PLATFORM,
  "Internal Tools": TEAMS.DATA_ANALYTICS,
  "Trust & Safety": TEAMS.TRUST_SAFETY_ENG,
});

const AREA_TO_PRODUCT = Object.freeze({
  Payments: PRODUCTS.CHECKOUT,
  "Platform Ops": PRODUCTS.PLATFORM_CORE,
  Growth: PRODUCTS.MARKETPLACE,
  Sales: PRODUCTS.MARKETPLACE,
  "Core Platform": PRODUCTS.ACCOUNT_HUB,
  "Internal Tools": PRODUCTS.PLATFORM_CORE,
  "Trust & Safety": PRODUCTS.PLATFORM_CORE,
});

/** Derive planningGroup from area when not explicitly set. */
export function defaultPlanningGroup(it) {
  return AREA_TO_PLANNING_GROUP[it.area] ?? PLANNING_GROUPS.CORE_PLATFORM;
}

export function defaultTeam(it) {
  return AREA_TO_TEAM[it.area] ?? TEAMS.CORE_PLATFORM;
}

export function defaultProduct(it) {
  return AREA_TO_PRODUCT[it.area] ?? PRODUCTS.PLATFORM_CORE;
}

/** Normalize one initiative with the portfolio taxonomy defaults. */
export function normalizeItem(it) {
  const level = LEVEL_LIST.includes(it.level) ? it.level : LEVELS.INITIATIVE;
  return {
    ...it,
    level,
    planningGroup: it.planningGroup ?? defaultPlanningGroup(it),
    team: it.team ?? defaultTeam(it),
    product: it.product ?? defaultProduct(it),
    parentId: it.parentId ?? null,
  };
}

/** Normalize a batch; validate parent links when ids are present. */
export function normalizeBatch(items) {
  const normalized = items.map(normalizeItem);
  const byId = new Map(normalized.filter((it) => it.id).map((it) => [it.id, it]));

  for (const it of normalized) {
    if (!it.parentId) continue;
    const parent = byId.get(it.parentId);
    if (!parent) {
      it._hierarchyWarning = `parentId ${it.parentId} not found`;
      continue;
    }
    const childLevel = levelIndex(it.level);
    const parentLevel = levelIndex(parent.level);
    if (childLevel <= parentLevel) {
      it._hierarchyWarning = `level ${it.level} must be below parent ${parent.level}`;
    }
  }

  return normalized;
}

function levelIndex(level) {
  const i = LEVEL_LIST.indexOf(level);
  return i === -1 ? 0 : i;
}

/** Index children by parent id. */
export function buildHierarchyIndex(items) {
  const byId = new Map();
  const childrenOf = new Map();

  for (const it of items) {
    if (it.id) byId.set(it.id, it);
  }
  for (const it of items) {
    if (!it.parentId) continue;
    const list = childrenOf.get(it.parentId) ?? [];
    list.push(it);
    childrenOf.set(it.parentId, list);
  }

  return { byId, childrenOf };
}

/** Open backlog = intaken-able work not closed. Used for rescore-all. */
export function openBacklog(items) {
  return items.filter(
    (it) =>
      it.id &&
      it.valueType !== undefined &&
      it.state !== "Archived" &&
      it.state !== "Rejected"
  );
}

/** Group ranked items by Planning Group (stable sort within group by rank). */
export function groupByPlanningGroup(ranked) {
  const groups = {};
  for (const pg of PLANNING_GROUP_LIST) groups[pg] = [];
  for (const it of ranked) {
    const key = it.planningGroup ?? defaultPlanningGroup(it);
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }
  return groups;
}

/** Group ranked items by team. */
export function groupByTeam(ranked) {
  const groups = {};
  for (const t of TEAM_LIST) groups[t] = [];
  for (const it of ranked) {
    const key = it.team ?? defaultTeam(it);
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  }
  return groups;
}