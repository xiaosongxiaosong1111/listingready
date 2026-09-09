export const FACT_DEFINITIONS = [
  { key: "productName", label: "商品名称", required: true },
  { key: "brand", label: "品牌", required: false },
  { key: "material", label: "材质", required: true },
  { key: "dimensions", label: "尺寸及单位", required: true },
  { key: "color", label: "颜色", required: false },
  { key: "packQuantity", label: "包装数量", required: true },
  { key: "structure", label: "结构", required: false },
  { key: "features", label: "核心功能", required: true },
  { key: "audience", label: "目标人群", required: false },
  { key: "useCases", label: "使用场景", required: false },
  { key: "care", label: "养护说明", required: false },
  { key: "weight", label: "商品净重", required: false },
  { key: "loadCapacity", label: "承重", required: false },
] as const;

export type FactKey = typeof FACT_DEFINITIONS[number]["key"];
export type FactStatus = "confirmed" | "pending" | "not_applicable" | "rejected";
export const SOURCE_LABELS = {
  seller: "卖家填写", packaging: "商品包装", supplier: "供应商资料",
  photo: "实物照片（人工观察）", official: "品牌官网", manual: "人工测量 / 确认", ai_inference: "AI 推断（非证据）",
} as const;
export type FactSource = keyof typeof SOURCE_LABELS;
export type ProductFact = { key: FactKey; value: string; status: FactStatus; source: FactSource; sourceNote: string };
export type ProductInput = {
  schemaVersion: 1; category: string; marketplace: "amazon-us";
  facts: ProductFact[]; keywords: string; bannedTerms: string[];
};
export type NormalizedFact = ProductFact & { allowedInListing: boolean; exclusionReason: string | null };
export type ProductProfile = Omit<ProductInput, "facts"> & { facts: NormalizedFact[] };
export type ListingPart = { text: string; factIds: FactKey[] };
export type Listing = { title: ListingPart; itemHighlights: ListingPart; bullets: ListingPart[]; description: ListingPart; searchTerms: ListingPart };
export type Check = {
  id: string; severity: "pass" | "warn" | "block"; label: string; detail: string;
  field?: string; factIds?: FactKey[]; excerpt?: string;
};
export type RiskReport = {
  ruleVersion: string; status: "blocked" | "needs_review" | "ready_for_review";
  checks: Check[]; counts: { pass: number; warn: number; block: number };
  canExportReviewed: boolean;
};
export type GenerationResult = {
  schemaVersion: 1; id: string; generatedAt: string; profile: ProductProfile;
  listing: Listing; report: RiskReport;
  generation: { model: string; provider: "aliyun-token-plan"; promptVersion: string; durationMs: number; attempts: number; totalTokens: number | null; formatFailures: number; riskRepairs: number; upstreamRetries: number };
};
export const RULES = {
  version: "amazon-us-non-media-2026-09-10.v5",
  titleMax: 75, highlightsMax: 125, searchTermsMaxBytes: 249,
  // Internal editorial limits, not category-specific Amazon guarantees.
  bulletMax: 500, descriptionMax: 2000,
  titleSource: "https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470",
} as const;

export function listingParts(listing: Listing): Array<[string, ListingPart]> {
  return [["title", listing.title], ["itemHighlights", listing.itemHighlights],
    ...listing.bullets.map((part, i): [string, ListingPart] => [`bullets.${i}`, part]),
    ["description", listing.description], ["searchTerms", listing.searchTerms]];
}

export class AppError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message); this.code = code; this.status = status;
  }
}
