import { FACT_DEFINITIONS, SOURCE_LABELS, listingParts } from "./domain.ts";
import type { createExport } from "./export.ts";
import { fieldLabel, STATUS_LABELS } from "./workbench.ts";

// Plain text is escaped, never interpreted as embedded HTML or Markdown links.
function safe(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()#+.!|~-])/g, "\\$1").replace(/\r?\n/g, "  \n");
}

export function exportMarkdown(bundle: ReturnType<typeof createExport>) {
  const lines = ["# ListingReady 上新资料报告", "", `状态：${bundle.mode === "reviewed" ? "用户自述已人工复核的草稿" : "未完成复核的 AI 草稿"}`, "",
    safe(bundle.notice), "", `导出时间：${safe(bundle.exportedAt)}`, "", "目标市场：Amazon 美国站", "",
    "## 英文文案", ""];
  for (const [field, part] of listingParts(bundle.listing)) lines.push(`### ${safe(fieldLabel(field))}`, "", safe(part.text), "", `事实引用：${part.factIds.map(safe).join(" / ") || "缺失"}`, "");
  lines.push("## 全部商品事实与来源", "", `品类：${safe(bundle.profile.category)}`, "");
  for (const fact of bundle.profile.facts) {
    const label = FACT_DEFINITIONS.find(d => d.key === fact.key)!.label;
    lines.push(`### ${label}`, "", `内容：${safe(fact.value) || "未填写"}`, "", `确认状态：${STATUS_LABELS[fact.status]}`, "",
      `可进入文案：${fact.allowedInListing ? "是" : "否"}`, "", `来源：${SOURCE_LABELS[fact.source]}`, "", `来源说明：${safe(fact.sourceNote) || "未填写"}`, "");
    if (fact.exclusionReason) lines.push(`排除原因：${safe(fact.exclusionReason)}`, "");
  }
  lines.push("## 完整风险报告", "", `规则版本：${safe(bundle.report.ruleVersion)}`, "",
    `阻断 ${bundle.report.counts.block} 项；待复核 ${bundle.report.counts.warn} 项；规则通过 ${bundle.report.counts.pass} 项。`, "");
  for (const check of bundle.report.checks) lines.push(`### ${check.severity === "block" ? "阻断" : check.severity === "warn" ? "待复核" : "规则通过"} ${safe(check.label)}`, "", safe(check.detail), "", `位置：${safe(check.field ? fieldLabel(check.field) : (check.factIds ?? []).join(" / ")) || "全局"}`, "");
  lines.push("## 图片与使用边界", "", "本报告不包含参考照片原文件，不是平台审核通过证明，不会自动发布到 Amazon。规则和事实引用不能代替人工核验。", "");
  if (bundle.marketingImage) lines.push("附有 AI 营销图片记录；图片保真需独立人工核对。", "", `图片地址：${safe(bundle.marketingImage.url)}`, "", `图片人工复核：${bundle.marketingImage.humanReviewed ? "用户声明已复核" : "未复核"}`, "", safe(bundle.marketingImage.notice), "");
  else lines.push("未附 AI 图片。", "");
  lines.push("完整机器可读数据与生成元数据请另存同一版本的 JSON 包。", "");
  return lines.join("\n");
}
