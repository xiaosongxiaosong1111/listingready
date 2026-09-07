import { FACT_DEFINITIONS, RULES, listingParts } from "./domain.ts";
import type { Check, FactKey, Listing, ProductProfile, RiskReport } from "./domain.ts";

const MATERIALS: Array<{ name: string; match: RegExp; evidence: RegExp }> = [
  { name: "cotton", match: /\bcotton\b/i, evidence: /\bcotton\b|棉/i },
  { name: "plastic", match: /\bplastic\b|\bpolypropylene\b|\bPP\b/i, evidence: /plastic|polypropylene|\bPP\b|塑料|聚丙烯/i },
  { name: "polyester", match: /\bpolyester\b/i, evidence: /polyester|涤纶|聚酯/i },
  { name: "bamboo", match: /\bbamboo\b/i, evidence: /bamboo|竹/i },
  { name: "wood", match: /\bwood(?:en)?\b/i, evidence: /wood|木/i },
  { name: "metal", match: /\bmetal\b/i, evidence: /metal|steel|alumin[ui]um|金属|钢|铝/i },
  { name: "stainless steel", match: /\bstainless(?:[ -]steel)?\b/i, evidence: /stainless|不锈钢/i },
  { name: "silicone", match: /\bsilicone\b/i, evidence: /silicone|硅胶/i },
  { name: "glass", match: /\bglass\b/i, evidence: /glass|玻璃/i },
  { name: "leather", match: /\bleather\b/i, evidence: /leather|皮革/i },
  { name: "nylon", match: /\bnylon\b/i, evidence: /nylon|尼龙/i },
];
const CLAIMS: Array<{ label: string; match: RegExp; evidence: RegExp; key: FactKey }> = [
  { label: "锁定堆叠结构", match: /\b(?:stackable|interlocking|locking[ -]stack|lockable)\b/i, evidence: /stackable|interlock|lockable|锁定|锁扣/i, key: "structure" },
  { label: "防水", match: /\bwaterproof\b/i, evidence: /waterproof|防水/i, key: "features" },
  { label: "吸水性能", match: /\b(?:super[ -]?absorbent|highly absorbent|quick[ -]dry(?:ing)?|lint[ -]free)\b/i, evidence: /super[ -]?absorbent|highly absorbent|quick[ -]dry|lint[ -]free|强吸水|速干|不掉毛/i, key: "features" },
];

export function normalizeNumbers(value: string) {
  const words: Record<string, string> = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12", twenty: "20" };
  return value.normalize("NFKC").toLowerCase().replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)\b/g, w => words[w]).replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
}
function numericTokens(value: string): string[] {
  return (normalizeNumbers(value).match(/\d+(?:\.\d+)?/g) ?? []).map(n => String(Number(n)));
}

// Keep units: a known pack count never proves a weight or dimension.
function measurements(value: string): Array<{ n: string; unit: string }> {
  let v = normalizeNumbers(value).replace(/(\d)\s*"/g, "$1 in").replace(/(\d)\s*'/g, "$1 ft");
  v = v.replace(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(inches|inch|in|cm|mm|ft|厘米|毫米)/gi,
    (_, a, b, c, u) => `${a} ${u} ${b} ${u} ${c ? `${c} ${u}` : ""}`);
  const aliases: Record<string, string> = { inches: "in", inch: "in", 厘米: "cm", 毫米: "mm", 公斤: "kg", 千克: "kg", 克: "g", pounds: "lb", lbs: "lb", ounces: "oz", ounce: "oz", 个: "pack", 件: "pack", pieces: "pack", piece: "pack", pcs: "pack", count: "pack", ct: "pack", packs: "pack", towels: "pack" };
  const matches = [...v.matchAll(/\b(\d+(?:\.\d+)?)\s*-?\s*(inches\b|inch\b|in\b|cm\b|mm\b|ft\b|kg\b|g\b|lbs?\b|pounds\b|ounces?\b|oz\b|packs?\b|pieces?\b|pcs\b|count\b|ct\b|towels\b|%|°\s*[fc]\b|公斤|千克|厘米|毫米|克|个|件)/gi)];
  const result = matches.map(m => ({ n: String(Number(m[1])), unit: aliases[m[2]] ?? m[2].replace(/\s/g, "") }));
  for (const m of v.matchAll(/\b(?:pack|set)\s+of\s+(\d+)\b/g)) result.push({ n: String(Number(m[1])), unit: "pack" });
  return result;
}

export function validateListing(profile: ProductProfile, listing: Listing): RiskReport {
  const checks: Check[] = [];
  const add = (check: Check) => checks.push(check);
  const allowed = new Map(profile.facts.filter(f => f.allowedInListing).map(f => [f.key, f]));
  const missing = FACT_DEFINITIONS.filter(d => d.required && !allowed.has(d.key));
  for (const f of profile.facts) if (!f.allowedInListing && (f.status !== "not_applicable" || missing.some(d => d.key === f.key))) add({ id: `fact.${f.key}`, severity: "warn", label: `${FACT_DEFINITIONS.find(d => d.key === f.key)!.label}待确认`, detail: `${f.exclusionReason}，该字段未发送给模型。补充内容及来源后重新生成。`, factIds: [f.key] });
  const titleLength = [...listing.title.text].length;
  add({ id: "title.length", severity: titleLength <= RULES.titleMax ? "pass" : "block", label: "标题长度", detail: `${titleLength} / ${RULES.titleMax} 字符（非媒体类）`, field: "title" });
  add({ id: "highlights.length", severity: [...listing.itemHighlights.text].length <= RULES.highlightsMax ? "pass" : "block", label: "Item Highlights 长度", detail: `${[...listing.itemHighlights.text].length} / ${RULES.highlightsMax} 字符`, field: "itemHighlights" });
  const bytes = new TextEncoder().encode(listing.searchTerms.text).length;
  add({ id: "search.bytes", severity: bytes <= RULES.searchTermsMaxBytes ? "pass" : "block", label: "搜索词字节数", detail: `${bytes} / ${RULES.searchTermsMaxBytes} UTF-8 字节`, field: "searchTerms" });
  add({ id: "bullets.count", severity: listing.bullets.length === 5 ? "pass" : "warn", label: "卖点数量", detail: `${listing.bullets.length} 条；本工作台目标 5 条，证据不足时允许少写，不得凑造事实。` });
  if (/[!$?{}^¬¦]/.test(listing.title.text)) add({ id: "title.symbols", severity: "warn", label: "标题特殊字符", detail: "请核对品类标题字符要求。", field: "title" });
  const words = listing.title.text.toLowerCase().match(/[a-z]+/g) ?? [];
  const repeated = [...new Set(words)].filter(w => !["a", "an", "the", "and", "or", "for", "of", "in", "on", "with", "to"].includes(w) && words.filter(t => t === w).length > 2);
  if (repeated.length) add({ id: "title.repeated", severity: "warn", label: "标题重复用词", detail: repeated.join(", "), field: "title" });
  for (const [field, part] of listingParts(listing)) {
    const issue = (id: string, label: string, detail: string, excerpt?: string) => add({ id: `${field}.${id}`, severity: "block", label, detail, field, factIds: part.factIds, excerpt });
    const references = part.factIds.map(id => allowed.get(id));
    if (!part.factIds.length || references.some(f => !f)) issue("sources", "事实引用缺失或无效", "每段必须引用已确认事实；模型的引用关系仍需人工核对。");
    const knownNumbers = new Set(numericTokens(references.filter(Boolean).map(f => f!.value).join("\n")));
    const unknownNumbers = [...new Set(numericTokens(part.text).filter(n => !knownNumbers.has(n)))];
    if (unknownNumbers.length) issue("numbers", "无依据数字", `引用事实中找不到：${unknownNumbers.join(", ")}。禁止自动补造参数。`, unknownNumbers.join(", "));
    for (const m of measurements(part.text)) {
      let keys: FactKey[];
      if (["in", "cm", "mm", "ft"].includes(m.unit)) keys = ["dimensions"];
      else if (["kg", "g", "lb", "oz"].includes(m.unit)) keys = /\b(?:load|hold|holds|support|capacity|weight capacity)\b/i.test(part.text) ? ["loadCapacity"] : ["weight"];
      else if (m.unit === "pack") keys = ["packQuantity"];
      else if (m.unit.startsWith("°")) keys = ["care"];
      else keys = ["material", "care", "features"];
      const supported = keys.some(key => part.factIds.includes(key) && measurements(allowed.get(key)?.value ?? "").some(s => s.n === m.n && s.unit === m.unit));
      if (!supported) issue(`measurement.${m.n}.${m.unit}`, "参数或单位缺少对应证据", `${m.n} ${m.unit} 未出现在对应的已确认参数中。保留原始单位，换算后请另行确认。`, `${m.n} ${m.unit}`);
    }
    // Distinguish a material claim from an object being stored or cleaned.
    const materialClaim = field === "title" || field === "itemHighlights" || /\b(?:made|crafted|built|material|construction|cotton|polyester|bamboo|silicone|nylon|polypropylene)\b/i.test(part.text);
    if (materialClaim) for (const material of MATERIALS) if (material.match.test(part.text) && (!part.factIds.includes("material") || !material.evidence.test(allowed.get("material")?.value ?? ""))) issue(`material.${material.name}`, "无依据材质", `材质字段未确认 ${material.name}，或该段未引用材质事实。`, material.name);
    for (const rule of CLAIMS) if (rule.match.test(part.text) && (!part.factIds.includes(rule.key) || !rule.evidence.test(allowed.get(rule.key)?.value ?? ""))) issue(`claim.${rule.key}.${rule.label}`, "无依据功能声明", `${rule.label}缺少对应的已确认事实。`, part.text.match(rule.match)?.[0]);
    const prohibited = /\b(?:best|no\.?\s*1|number\s*one|guaranteed|money[ -]back|fda|ce certified|certified|antibacterial|anti[ -]bacterial|cure|cures|treats|medical[ -]grade|non[ -]toxic|bpa[ -]free|food[ -]safe|eco[ -]friendly)\b|100\s*%\s*(?:safe|effective|guarantee)/i;
    if (prohibited.test(part.text)) issue("restricted", "高风险宣传用语", "本版保守拦截排名、保证、医疗、环保与认证等声明，需专门核验后再使用。", part.text.match(prohibited)?.[0]);
    for (const term of profile.bannedTerms) if (part.text.normalize("NFKC").toLowerCase().includes(term.toLowerCase())) issue(`banned.${term}`, "命中自定义禁用词", `请移除禁用词：${term}`, term);
    if (/https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(part.text)) issue("contact", "包含链接或联系方式", "Listing 文案中不应包含来源网址、邮箱或外部联系方式。");
    if (/待确认|待测量|\b(?:verify before|unconfirmed|not verified|TBD)\b/i.test(part.text)) issue("disclaimer", "待办内容混入买家文案", "把参数待办放在风险面板，不要放进商品卖点。");
    const limit = field.startsWith("bullets.") ? RULES.bulletMax : field === "description" ? RULES.descriptionMax : null;
    if (limit && [...part.text].length > limit) add({ id: `${field}.editorialLength`, severity: "warn", label: "文案超过工作台建议长度", detail: `建议不超过 ${limit} 字符；这是本项目编辑规则。`, field });
  }
  if (!checks.some(c => c.severity === "block")) add({ id: "evidence.rules", severity: "pass", label: "已覆盖风险规则未发现阻断项", detail: "数字、部分材质与功能词、引用、长度已检查。规则无法穷尽语义错误；引用由模型提供，请对照原始资料复核。" });
  const counts = { pass: 0, warn: 0, block: 0 };
  const unique = [...new Map(checks.map(c => [c.id, c])).values()];
  unique.forEach(c => counts[c.severity]++);
  return { ruleVersion: RULES.version, status: counts.block ? "blocked" : counts.warn ? "needs_review" : "ready_for_review", checks: unique, counts, canExportReviewed: counts.block === 0 && counts.warn === 0 && missing.length === 0 };
}
