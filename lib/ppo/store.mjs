// Local PPO request store — no Jira required.

import { LEDGER_KINDS } from "../ledger.mjs";

export const PPO_REQUEST_TYPES = Object.freeze([
  { id: "add-team", label: "Add Team" },
  { id: "move-team", label: "Move Team" },
  { id: "remove-team", label: "Remove Team" },
  { id: "add-team-member", label: "Add Team Member" },
  { id: "move-team-member", label: "Move Team Member" },
  { id: "remove-team-member", label: "Remove Team Member" },
  { id: "elevate-access", label: "Elevate Align/Jira/Confluence Access" },
  { id: "pat-context-add", label: "Product Context — Add" },
  { id: "pat-context-update", label: "Product Context — Update" },
  { id: "pat-context-remove", label: "Product Context — Remove" },
  { id: "automation-request", label: "Automation Request" },
]);

const requests = [];
let seq = 1;

export function submitRequest(req, { ledger } = {}) {
  const type = PPO_REQUEST_TYPES.find((t) => t.id === req.type);
  if (!type) throw new Error(`Unknown PPO request type: ${req.type}`);
  if (!req.summary?.trim()) throw new Error("summary is required");

  const item = {
    id: `PPO-${seq++}`,
    type: req.type,
    typeLabel: type.label,
    summary: req.summary.trim(),
    details: req.details ?? {},
    requester: req.requester ?? "operator",
    status: "Awaiting Approval",
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approver: null,
  };

  requests.push(item);

  if (ledger) {
    ledger.append(LEDGER_KINDS.PPO_REQUESTED, {
      id: item.id,
      type: item.type,
      requester: item.requester,
      summary: item.summary,
    });
  }

  return item;
}

export function approveRequest(id, { approver = "committee", ledger } = {}) {
  const item = requests.find((r) => r.id === id);
  if (!item) throw new Error(`PPO request not found: ${id}`);
  if (item.status === "Approved") throw new Error(`Already approved: ${id}`);

  item.status = "Approved";
  item.approvedAt = new Date().toISOString();
  item.approver = approver;

  if (ledger) {
    ledger.append(LEDGER_KINDS.PPO_APPROVED, {
      id: item.id,
      type: item.type,
      approver,
      granted: item.details,
    });
    if (item.type === "elevate-access") {
      ledger.append(LEDGER_KINDS.ACCESS_GRANTED, {
        id: item.id,
        requester: item.requester,
        approver,
        scope: item.details,
      });
    }
  }

  return item;
}

export function listRequests({ status } = {}) {
  const list = [...requests].reverse();
  if (status) return list.filter((r) => r.status === status);
  return list;
}

export function ppoReset() {
  requests.length = 0;
  seq = 1;
}