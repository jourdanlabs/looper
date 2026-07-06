import assert from "node:assert/strict";
import test from "node:test";

import { adfToText, jiraIssueToInitiative, initiativeToJiraProperty } from "../lib/jira/map.mjs";
import { VALUE_TYPES } from "../lib/types.mjs";

test("adfToText extracts plain text from ADF", () => {
  const text = adfToText({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hello Jira" }] }],
  });
  assert.equal(text, "Hello Jira");
});

test("jiraIssueToInitiative maps summary and looper.v1 rubric", () => {
  const issue = {
    key: "INIT-100",
    fields: {
      summary: "Subscription dashboard",
      description: { type: "doc", content: [] },
      labels: ["looper:value-type:Internal Enabler", "looper:outcome:subscription visibility"],
      components: [{ name: "Production" }],
      reporter: { displayName: "Jordan Lee" },
      status: { name: "In Progress" },
      issuetype: { name: "Epic" },
    },
  };
  const property = {
    rubric: {
      reach: { value: 120, unit: "engineers", source: "Headcount 2026" },
      effortTeamWeeks: 6,
      deliveryConfidence: 0.8,
      valueConfidence: 0.8,
      evidence: { reach: "Headcount 2026" },
    },
  };
  const it = jiraIssueToInitiative(issue, property);
  assert.equal(it.id, "INIT-100");
  assert.equal(it.title, "Subscription dashboard");
  assert.equal(it.valueType, VALUE_TYPES.ENABLER);
  assert.equal(it.outcome, "subscription visibility");
  assert.equal(it.area, "Production");
  assert.equal(it._jira.key, "INIT-100");
});

test("initiativeToJiraProperty packs rank snapshot", () => {
  const prop = initiativeToJiraProperty({
    id: "INIT-100",
    title: "Test",
    _rank: 2,
    _score: 88,
    _tier: "Now",
    _funding: "FUNDED",
    _scoreReceipt: "abc123",
  });
  assert.equal(prop.snapshot.rank, 2);
  assert.equal(prop.snapshot.score, 88);
  assert.equal(prop.version, 1);
});