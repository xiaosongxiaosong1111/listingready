import test from "node:test";
import assert from "node:assert/strict";
import { towelDemo, organizerDemo } from "../lib/demos.ts";
import { normalizeProfile, factExclusion } from "../lib/facts.ts";
import { buildMessages, generateListing } from "../lib/generate.ts";
import { validateListing } from "../lib/validate.ts";
import { createExport } from "../lib/export.ts";
import { localizationPlan, localizationText } from "../lib/localization.ts";
import { exportFilename, factChanges, fieldLabel, listingComparison, riskTargets } from "../lib/workbench.ts";
import { towelListing } from "./fixtures.mjs";

test("rejected facts and even confirmed AI inferences never enter the model", () => {
  for (const change of [{ status: "rejected" }, { status: "confirmed", source: "ai_inference" }]) {
    const p = towelDemo(); Object.assign(p.facts.find(f => f.key === "material"), change, { value: "SECRET_UNVERIFIED_VALUE" });
    const profile = normalizeProfile(p);
    assert.equal(profile.facts.find(f => f.key === "material").allowedInListing, false);
    assert.doesNotMatch(JSON.stringify(buildMessages(profile)), /SECRET_UNVERIFIED_VALUE/);
    const report = validateListing(profile, towelListing());
    assert.ok(report.counts.block > 0); assert.equal(report.canExportReviewed, false);
  }
});
test("client eligibility and normalized profile agree including NFKC uncertainty", () => {
  for (const p of [towelDemo(), organizerDemo()]) for (const fact of p.facts) {
    assert.equal(factExclusion(fact) === null, normalizeProfile(p).facts.find(f => f.key === fact.key).allowedInListing);
  }
  const fact = { ...towelDemo().facts[0], value: "ｕｎｋｎｏｗｎ" };
  assert.ok(factExclusion(fact));
});
test("core facts cannot be confirmed using AI inference as their sole evidence", () => {
  const p = towelDemo(); p.facts.find(f => f.key === "features").source = "ai_inference";
  assert.throws(() => normalizeProfile(p), e => e.code === "MISSING_FACTS");
});
test("editorial strategy is explicit, uses only allowed values and is included in export", () => {
  const p = organizerDemo(); p.facts.find(f => f.key === "material").value = "SECRET_PENDING_VALUE";
  const plan = localizationPlan(normalizeProfile(p));
  assert.equal(plan.origin, "deterministic-editorial-plan");
  assert.doesNotMatch(JSON.stringify(plan), /SECRET_PENDING_VALUE/);
  assert.ok(plan.omitted.some(f => f.factId === "material"));
  assert.equal(plan.priority[0].factId, "productName");
  assert.match(localizationText(plan), /非买家文案/);
  assert.equal(createExport({ profile: towelDemo(), listing: towelListing(), mode: "draft", localization: { forged: true } }).localization.version, plan.version);
});
test("full comparison includes every field, removed bullets and citation-only changes", () => {
  const before = towelListing(), after = towelListing();
  after.bullets.pop(); after.description.text = "Updated description"; after.title.factIds = ["productName"];
  const rows = listingComparison(before, after);
  assert.equal(rows.length, 9);
  assert.equal(rows.find(r => r.field === "bullets.4").after, undefined);
  assert.equal(rows.find(r => r.field === "title").textChanged, false);
  assert.equal(rows.find(r => r.field === "title").referencesChanged, true);
  assert.equal(rows.filter(r => r.changed).length, 3);
  assert.equal(before.bullets.length, 5);
});
test("comparison ignores reference order and detects source-only and status changes", () => {
  const a = towelListing(), b = towelListing(); b.title.factIds.reverse();
  assert.equal(listingComparison(a, b).some(r => r.changed), false);
  const before = towelDemo(), after = towelDemo();
  after.facts.find(f => f.key === "material").sourceNote = "New supplier specification";
  after.facts.find(f => f.key === "color").status = "rejected";
  assert.deepEqual(factChanges(before, after).map(f => f.key), ["material", "color"]);
});
test("risk links target actual listing and fact IDs without arbitrary selectors", () => {
  assert.deepEqual(riskTargets({ id: "risk", field: "bullets.1", factIds: ["dimensions", "dimensions"] }).map(t => t.id), ["listing-bullets.1", "value-dimensions"]);
  assert.deepEqual(riskTargets({ id: "fact.color", factIds: ["color"] }).map(t => t.id), ["value-color"]);
  assert.deepEqual(riskTargets({ id: "bullets.count" }).map(t => t.id), ["listing-bullets.0"]);
  assert.deepEqual(riskTargets({ id: "invalid", field: "__proto__", factIds: ["constructor"] }), []);
  assert.equal(fieldLabel("bullets.4"), "卖点 5");
});
test("filenames are bounded, portable and include marketplace and review state", () => {
  for (const name of ["../../CON", "产品<>:\"/\\|?*\u0000", ".", " ", "a".repeat(1000), "🍵毛巾"]) {
    const filename = exportFilename(name, "draft");
    assert.match(filename, /^listingready-[\p{L}\p{N}-]+-amazon-us-draft\.json$/u);
    assert.ok(filename.length < 100); assert.doesNotMatch(filename, /\.\./);
  }
  assert.equal(exportFilename("", "reviewed"), "listingready-product-amazon-us-reviewed.json");
});
test("perfect claims, explicit unsupported brands and brand search terms are blocked", () => {
  for (const [text, id] of [["Perfect towels for everyone.", "restricted"], ["Brand: MadeUpBrand.", "brand"], ["Manufactured by MadeUpBrand.", "brand"]]) {
    const l = towelListing(); l.description.text = text;
    assert.ok(validateListing(normalizeProfile(towelDemo()), l).checks.some(c => c.id.endsWith(id) && c.severity === "block"));
  }
  const l = towelListing(); l.searchTerms.text = "IKEA dish towel";
  assert.ok(validateListing(normalizeProfile(towelDemo()), l).checks.some(c => c.id.endsWith("brandSearch")));
  l.searchTerms.text = "kitchen towel"; l.description = { text: "Brand: IKEA.", factIds: ["brand"] };
  assert.equal(validateListing(normalizeProfile(towelDemo()), l).counts.block, 0);
});
test("duplicate bullets and search words require review rather than silently passing", () => {
  const l = towelListing(); l.bullets[1] = { ...l.bullets[0], text: l.bullets[0].text.toUpperCase() + "!" }; l.searchTerms.text = "towel kitchen towel";
  const report = validateListing(normalizeProfile(towelDemo()), l);
  assert.ok(report.checks.some(c => c.id === "bullets.1.duplicate" && c.severity === "warn"));
  assert.ok(report.checks.some(c => c.id === "search.repeated")); assert.equal(report.canExportReviewed, false);
});
test("model requests forbid redirects and do not leak the key on redirect rejection", async () => {
  let attempts = 0;
  await assert.rejects(generateListing(towelDemo(), { apiKey: "private-test-key" }, { fetch: async (_url, opts) => {
    attempts++; assert.equal(opts.redirect, "manual"); throw new Error("private-test-key redirect");
  } }), e => { assert.doesNotMatch(e.message, /private-test-key/); return e.code === "MODEL_UNREACHABLE"; });
  assert.equal(attempts, 1);
});
test("redirect responses stop without following Location or automatic retries", async () => {
  let calls = 0;
  await assert.rejects(generateListing(towelDemo(), { apiKey: "test-key" }, { fetch: async () => { calls++; return new Response(null, { status: 307, headers: { Location: "https://example.com" } }); } }), e => e.code === "MODEL_REDIRECT");
  assert.equal(calls, 1);
});

test("performance filler requires specifically cited positive evidence", () => {
  for (const text of ["Long-lasting results.", "Reliable performance.", "Durable dish towels.", "Ｄｕｒａｂｌｅ towels."]) {
    const p = towelDemo(), l = towelListing();
    l.description = { text, factIds: ["features"] };
    assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.field === "description" && c.label === "无依据功能声明"));
  }
  const p = towelDemo(), l = towelListing();
  p.facts.find(f => f.key === "features").value = "Durable construction, supplier abrasion test verified";
  l.description = { text: "Durable construction.", factIds: ["features"] };
  assert.equal(validateListing(normalizeProfile(p), l).checks.some(c => c.field === "description" && c.label === "无依据功能声明"), false);
  l.description.factIds = ["material"];
  assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.field === "description" && c.label === "无依据功能声明"));
});

test("confirmed negative facts cannot justify positive waterproof or durable claims", () => {
  for (const [evidence, text] of [["Not waterproof", "Waterproof towels."], ["不防水", "Waterproof towels."], ["Durability is not confirmed", "Durable towels."], ["不是耐用产品", "Long-lasting towels."]]) {
    const p = towelDemo(), l = towelListing();
    p.facts.find(f => f.key === "features").value = evidence;
    l.description = { text, factIds: ["features"] };
    assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.field === "description" && c.label === "无依据功能声明"));
  }
  const l = towelListing(); l.description.text = "Ｐｅｒｆｅｃｔ towels.";
  assert.ok(validateListing(normalizeProfile(towelDemo()), l).checks.some(c => c.id === "description.restricted"));
});

test("pack of a material percentage is not misread as a pack quantity", () => {
  const profile = normalizeProfile(towelDemo());
  for (const phrase of ["4-pack of 100% cotton towels.", "Set of 100 % cotton towels."]) {
    const l = towelListing(); l.itemHighlights = { text: phrase, factIds: ["packQuantity", "material", "productName"] };
    assert.equal(validateListing(profile, l).counts.block, 0);
  }
  const l = towelListing(); l.itemHighlights = { text: "Pack of 100 towels.", factIds: ["packQuantity", "material", "productName"] };
  assert.ok(validateListing(profile, l).checks.some(c => c.id === "itemHighlights.measurement.100.pack"));
});

test("specific dish drying evidence cannot justify general household cleaning", () => {
  const p = towelDemo(), l = towelListing();
  l.bullets[3] = { text: "For kitchen dish drying and daily household cleaning tasks.", factIds: ["useCases"] };
  assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.id.includes("泛化清洁用途") && c.severity === "block"));
  p.facts.find(f => f.key === "useCases").value = "General household cleaning / 家务清洁";
  assert.equal(validateListing(normalizeProfile(p), l).checks.some(c => c.id.includes("泛化清洁用途")), false);
  p.facts.find(f => f.key === "useCases").value = "Not for household cleaning";
  assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.id.includes("泛化清洁用途")));
});

test("color lists do not establish selectable purchase variants", () => {
  const p = towelDemo(), l = towelListing();
  for (const text of ["Available in white, dark gray, and patterned color options.", "Customers may select from white, dark gray, or patterned variations.", "The towel comes in a 4 pack featuring white and patterned options."]) {
    l.description = { text, factIds: ["color", "packQuantity"] };
    assert.ok(validateListing(normalizeProfile(p), l).checks.some(c => c.id === "description.colorVariants" && c.severity === "warn"));
  }
  l.description = { text: "White, dark gray and patterned towels.", factIds: ["color"] };
  assert.equal(validateListing(normalizeProfile(p), l).checks.some(c => c.id === "description.colorVariants"), false);
  p.facts.find(f => f.key === "color").value = "White and dark gray selectable options / 白色及深灰色可选";
  l.description = { text: "Select from white and dark gray.", factIds: ["color"] };
  assert.equal(validateListing(normalizeProfile(p), l).checks.some(c => c.id === "description.colorVariants"), false);
});
