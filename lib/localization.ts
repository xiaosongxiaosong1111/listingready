import { FACT_DEFINITIONS, RULES } from "./domain.ts";
import type { FactKey, ProductProfile } from "./domain.ts";

// A transparent editorial plan, NOT a second AI call or a market-research claim.
export function localizationPlan(profile: ProductProfile) {
  const priority: FactKey[] = ["productName", "features", "material", "dimensions", "packQuantity", "structure", "useCases", "care", "color", "audience", "weight", "loadCapacity", "brand"];
  const facts = new Map(profile.facts.filter(f => f.allowedInListing).map(f => [f.key, f]));
  return {
    version: "amazon-us-editorial.v1.2026-09-08",
    origin: "deterministic-editorial-plan" as const,
    notice: "基于已确认资料的工作台编辑策略，不是 AI 市场调研、关键词流量数据或平台审核结论。",
    market: "Amazon US", language: "English",
    tone: "清楚、具体、克制；优先说明商品是什么、可做什么，再补充有证据的参数与使用方式。",
    priority: priority.filter(id => facts.has(id)).map(id => ({ factId: id, label: FACT_DEFINITIONS.find(d => d.key === id)!.label, value: facts.get(id)!.value })),
    omitted: profile.facts.filter(f => !f.allowedInListing).map(f => ({ factId: f.key, label: FACT_DEFINITIONS.find(d => d.key === f.key)!.label, reason: f.exclusionReason })),
    rules: [
      `标题先说明商品，再选有证据的差异点；本工作台限制 ${RULES.titleMax} 字符。`,
      "保留原始尺寸和单位，不擅自换算。需要美国惯用单位时，先核实并录入对应参数。",
      "卖点各讲一个不同事实；资料不足时少写，不为凑满五条而添加功能。",
      "搜索词只重组已确认内容，避开品牌、重复词、营销保证；关键词备忘不自动进入文案。",
      "不写未经证实的品牌、兼容性、认证、环保、医疗或性能结论。来源与待办留在复核区。",
    ],
  };
}

export function localizationText(plan: ReturnType<typeof localizationPlan>) {
  return ["本地化编辑说明（非买家文案）", plan.notice, plan.tone, "事实优先顺序：", ...plan.priority.map((p, i) => `${i + 1}. ${p.label}: ${p.value}`), ...plan.rules, "未采用的资料：", ...plan.omitted.map(p => `${p.label}: ${p.reason}`)].join("\n");
}
