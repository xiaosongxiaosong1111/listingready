import { AppError } from "./domain.ts";
import { normalizeProfile, record } from "./facts.ts";
import { parseListing } from "./listing.ts";
import { validateListing } from "./validate.ts";

export function createExport(input: unknown) {
  if (!record(input) || !["draft", "reviewed"].includes(String(input.mode))) throw new AppError("INVALID_INPUT", "导出模式无效。");
  const profile = normalizeProfile(input.profile);
  let listing;
  try { listing = parseListing(input.listing); } catch { throw new AppError("INVALID_INPUT", "导出文案结构无效。"); }
  const report = validateListing(profile, listing);
  if (input.mode === "reviewed" && (!report.canExportReviewed || input.humanReviewed !== true)) throw new AppError("REVIEW_REQUIRED", "请解决待确认项和阻断项，并完成人工复核；仍可导出带风险报告的草稿。", 409);
  return {
    schemaVersion: 1, exportedAt: new Date().toISOString(), mode: input.mode,
    humanReviewed: input.mode === "reviewed" && input.humanReviewed === true,
    notice: input.mode === "reviewed" ? "用户自述已复核的草稿；不代表 Amazon 审核通过或自动上架。" : "未完成复核的 AI 草稿；不得直接作为已确认发布内容。",
    marketplace: "amazon-us", profile, listing, report,
  };
}
