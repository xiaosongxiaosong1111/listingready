import { AppError, FACT_DEFINITIONS, listingParts } from "./domain.ts";
import type { FactKey, Listing, ListingPart } from "./domain.ts";
import { record } from "./facts.ts";

function parsePart(value: unknown): ListingPart {
  if (!record(value) || typeof value.text !== "string" || !value.text.trim() || value.text.length > 6000 || !Array.isArray(value.factIds) || value.factIds.length > 13 || !value.factIds.every(id => typeof id === "string" && FACT_DEFINITIONS.some(d => d.key === id))) {
    throw new AppError("INVALID_MODEL_OUTPUT", "模型返回的文案或事实引用格式无效，请重试。", 502);
  }
  // Never truncate claims: the validator must see the complete model output.
  return { text: value.text.trim(), factIds: [...new Set(value.factIds)] as FactKey[] };
}

export function parseListing(value: unknown): Listing {
  if (!record(value) || !Array.isArray(value.bullets) || value.bullets.length < 1 || value.bullets.length > 8) throw new AppError("INVALID_MODEL_OUTPUT", "模型没有返回有效的 Listing 结构。", 502);
  return { title: parsePart(value.title), itemHighlights: parsePart(value.itemHighlights), bullets: value.bullets.map(parsePart), description: parsePart(value.description), searchTerms: parsePart(value.searchTerms) };
}

export function parseModelJson(content: unknown): Listing {
  if (typeof content !== "string" || content.length > 30000) throw new AppError("INVALID_MODEL_OUTPUT", "模型返回内容为空或过长。", 502);
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { throw new AppError("INVALID_MODEL_OUTPUT", "模型未返回有效 JSON，请重试。", 502); }
  return parseListing(parsed);
}

export function listingText(listing: Listing) {
  return listingParts(listing).map(([field, part]) => `${field}\n${part.text}`).join("\n\n");
}
