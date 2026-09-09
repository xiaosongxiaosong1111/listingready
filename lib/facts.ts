import { AppError, FACT_DEFINITIONS, SOURCE_LABELS } from "./domain.ts";
import type { FactKey, FactSource, FactStatus, NormalizedFact, ProductProfile } from "./domain.ts";

export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max) throw new AppError("INVALID_INPUT", `${field}必须是 ${max} 字符以内的文本。`);
  const cleaned = value.normalize("NFKC").trim();
  if (required && !cleaned) throw new AppError("INVALID_INPUT", `请填写${field}。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleaned)) throw new AppError("INVALID_INPUT", `${field}含有无效控制字符。`);
  return cleaned;
}

const UNCERTAIN = /待确认|待测量|不确定|无法判断|可能|未知|待补充|\b(?:unknown|unconfirmed|uncertain|maybe|not verified|tbd|n\/a)\b/i;

export function factExclusion(fact: { status: FactStatus; value: string; source: FactSource; sourceNote: string }): string | null {
  if (fact.status !== "confirmed") return fact.status === "pending" ? "尚未确认" : fact.status === "rejected" ? "已否定，不可作为商品事实" : "不适用";
  if (fact.source === "ai_inference") return "AI 推断不是证据；请核实真实资料并更换来源后确认";
  if (!fact.value.trim()) return "已确认字段缺少内容";
  if (UNCERTAIN.test(fact.value.normalize("NFKC"))) return "内容仍包含不确定表述";
  if (!fact.sourceNote.trim()) return "缺少来源说明";
  return null;
}

export function normalizeProfile(input: unknown): ProductProfile {
  if (!record(input) || input.schemaVersion !== 1 || input.marketplace !== "amazon-us") throw new AppError("INVALID_INPUT", "需要 schemaVersion=1 的 Amazon US 商品资料。");
  const category = text(input.category, "商品品类", 80, true);
  if (!Array.isArray(input.facts) || input.facts.length > FACT_DEFINITIONS.length) throw new AppError("INVALID_INPUT", "商品事实列表无效。");
  const seen = new Map<FactKey, NormalizedFact>();
  for (const raw of input.facts) {
    if (!record(raw) || !FACT_DEFINITIONS.some(d => d.key === raw.key)) throw new AppError("INVALID_INPUT", "商品资料包含不支持的事实字段。");
    const key = raw.key as FactKey;
    if (seen.has(key)) throw new AppError("INVALID_INPUT", `事实字段 ${key} 重复。`);
    if (!["confirmed", "pending", "not_applicable", "rejected"].includes(String(raw.status)) || !Object.hasOwn(SOURCE_LABELS, String(raw.source))) throw new AppError("INVALID_INPUT", "事实状态或来源无效。");
    const status = raw.status as FactStatus;
    const value = text(raw.value, key, 1200);
    const sourceNote = text(raw.sourceNote, "来源说明", 600);
    const exclusionReason = factExclusion({ status, value, sourceNote, source: raw.source as FactSource });
    seen.set(key, { key, value, status, source: raw.source as FactSource, sourceNote, allowedInListing: exclusionReason === null, exclusionReason });
  }
  const facts = FACT_DEFINITIONS.map(({ key }) => seen.get(key) ?? {
    key, value: "", status: "pending" as const, source: "seller" as const,
    sourceNote: "", allowedInListing: false, exclusionReason: "尚未填写",
  });
  for (const key of ["productName", "features"] as const) {
    if (!facts.find(f => f.key === key)?.allowedInListing) throw new AppError("MISSING_FACTS", "商品名称和核心功能必须有已确认内容及来源说明。");
  }
  if (!Array.isArray(input.bannedTerms) || input.bannedTerms.length > 30) throw new AppError("INVALID_INPUT", "禁用词最多 30 项。");
  const bannedTerms = [...new Set(input.bannedTerms.map((v) => text(v, "禁用词", 80, true)))];
  return { schemaVersion: 1, category, marketplace: "amazon-us", facts, keywords: text(input.keywords, "关键词", 500), bannedTerms };
}

export function confirmedFacts(profile: ProductProfile) {
  // Source notes and excluded values are never sent to the model.
  return profile.facts.filter(f => f.allowedInListing).map(f => ({ id: f.key, value: f.value }));
}
