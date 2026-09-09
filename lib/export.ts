import { AppError } from "./domain.ts";
import { normalizeProfile, record } from "./facts.ts";
import { parseListing } from "./listing.ts";
import { validateListing } from "./validate.ts";
import { localizationPlan } from "./localization.ts";
import { safeGeneratedImageUrl, SCENE_KINDS } from "./scene.ts";

export function createExport(input: unknown) {
  if (!record(input) || !["draft", "reviewed"].includes(String(input.mode))) throw new AppError("INVALID_INPUT", "导出模式无效。");
  const profile = normalizeProfile(input.profile);
  let listing;
  try { listing = parseListing(input.listing); } catch { throw new AppError("INVALID_INPUT", "导出文案结构无效。"); }
  const report = validateListing(profile, listing);
  let marketingImage = null;
  if (input.marketingImage != null) {
    const image = input.marketingImage;
    if (!record(image) || !Object.hasOwn(SCENE_KINDS, String(image.kind)) || !["qwen-image-2.0", "qwen-image-2.0-pro"].includes(String(image.model)) || typeof image.promptSummary !== "string" || image.promptSummary.length > 1000 || typeof image.generatedAt !== "string" || !Number.isFinite(Date.parse(image.generatedAt))) throw new AppError("INVALID_INPUT", "图片导出信息无效。");
    marketingImage = { url: safeGeneratedImageUrl(image.url), kind: image.kind, model: image.model, generatedAt: image.generatedAt, promptSummary: image.promptSummary, humanReviewed: image.humanReviewed === true, notice: "AI 生成营销素材；元数据和复核声明来自浏览器会话，未经服务端签名或视觉鉴定。不是商品实拍证据，图片链接可能过期，请另存文件。" };
    if (input.mode === "reviewed" && !marketingImage.humanReviewed) throw new AppError("IMAGE_REVIEW_REQUIRED", "请先人工检查场景图外观，或仅导出草稿。", 409);
  }
  if (input.mode === "reviewed" && (!report.canExportReviewed || input.humanReviewed !== true)) throw new AppError("REVIEW_REQUIRED", "请解决待确认项和阻断项，并完成人工复核；仍可导出带风险报告的草稿。", 409);
  return {
    schemaVersion: 1, exportedAt: new Date().toISOString(), mode: input.mode,
    humanReviewed: input.mode === "reviewed" && input.humanReviewed === true,
    notice: input.mode === "reviewed" ? "用户自述已复核的草稿；不代表 Amazon 审核通过或自动上架。" : "未完成复核的 AI 草稿；不得直接作为已确认发布内容。",
    marketplace: "amazon-us", profile, listing, report, localization: localizationPlan(profile), marketingImage,
  };
}
