import { FACT_DEFINITIONS, listingParts } from "./domain.ts";
import type { Check, Listing, ProductInput } from "./domain.ts";

export const STATUS_LABELS = { confirmed: "已确认", pending: "待确认", not_applicable: "不适用", rejected: "已否定" };
export function fieldLabel(field: string): string {
  const labels: Record<string, string> = { title: "商品标题", itemHighlights: "商品亮点 · Item Highlights", description: "商品描述", searchTerms: "后台搜索词" };
  if (/^bullets\.\d+$/.test(field)) return `卖点 ${Number(field.split(".")[1]) + 1}`;
  return labels[field] ?? field;
}

export function riskTargets(check: Check) {
  const targets: Array<{ id: string; label: string }> = [];
  if (check.field && /^(title|itemHighlights|description|searchTerms|bullets\.\d+)$/.test(check.field)) targets.push({ id: `listing-${check.field}`, label: `修改${fieldLabel(check.field)}` });
  else if (check.id === "bullets.count") targets.push({ id: "listing-bullets.0", label: "查看卖点" });
  for (const id of [...new Set(check.factIds ?? [])]) {
    const fact = FACT_DEFINITIONS.find(f => f.key === id);
    if (fact) targets.push({ id: `value-${id}`, label: `核对${fact.label}` });
  }
  return targets;
}

export function listingComparison(before: Listing, after: Listing) {
  const oldParts = new Map(listingParts(before));
  const newParts = new Map(listingParts(after));
  return [...new Set([...oldParts.keys(), ...newParts.keys()])].map(field => {
    const oldPart = oldParts.get(field), newPart = newParts.get(field);
    const textChanged = oldPart?.text !== newPart?.text;
    const referencesChanged = JSON.stringify([...(oldPart?.factIds ?? [])].sort()) !== JSON.stringify([...(newPart?.factIds ?? [])].sort());
    return { field, label: fieldLabel(field), before: oldPart, after: newPart, textChanged, referencesChanged, changed: textChanged || referencesChanged };
  });
}

export function factChanges(before: ProductInput, after: ProductInput) {
  return FACT_DEFINITIONS.flatMap(def => {
    const a = before.facts.find(f => f.key === def.key), b = after.facts.find(f => f.key === def.key);
    const changed = !a || !b || (["value", "status", "source", "sourceNote"] as const).some(key => a[key] !== b[key]);
    return changed ? [{ key: def.key, label: def.label, before: a, after: b }] : [];
  });
}

export function exportFilename(productName: string, mode: "draft" | "reviewed") {
  const name = [...productName.normalize("NFKC").replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")].slice(0, 48).join("") || "product";
  return `listingready-${name}-amazon-us-${mode}.json`;
}
