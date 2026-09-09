import { AppError } from "./domain.ts";
import type { FactKey, ProductInput } from "./domain.ts";

export const MAX_REFERENCE_BYTES = 1_200_000;
export const SCENE_KINDS = { lifestyle: "营销场景图", detail: "详情页外观素材" } as const;
export type SceneKind = keyof typeof SCENE_KINDS;
export type SceneResult = {
  id: string; generatedAt: string; url: string; model: string; durationMs: number;
  provider: "aliyun-token-plan"; promptVersion: string; promptSummary: string;
  factIds: FactKey[]; scene: string; kind: SceneKind; referenceUsed: true;
  notice: string;
};
export function sceneSuggestions(category: string) {
  if (/厨房|餐|kitchen|dining/i.test(category)) return ["简洁厨房台面，柔和自然光", "整洁餐边柜，日常居家氛围"];
  if (/宠物|pet/i.test(category)) return ["整洁的宠物用品收纳角，无动物出镜", "明亮的室内地面，安静居家氛围"];
  if (/旅行|户外|outdoor|travel/i.test(category)) return ["明亮玄关的出行准备区", "旅行整理台面，中性简洁背景"];
  if (/办公|文具|收纳|desk|office|storage/i.test(category)) return ["居家办公桌，柔和自然光", "整洁书架旁的学习区"];
  return ["中性色展示台，自然侧光", "简洁居家陈列区，干净背景"];
}
export function sceneInputKey(profile: ProductInput, scene: string, kind: SceneKind, referenceImage: string) {
  return JSON.stringify([profile, scene, kind, referenceImage]);
}
export function canReviewScene(state: { resultId?: string; loadedImageId: string | null; stale: boolean; busy: boolean; failed: boolean; referenceConfirmed: boolean }) {
  return !!state.resultId && state.loadedImageId === state.resultId && !state.stale && !state.busy && !state.failed && state.referenceConfirmed;
}
export function validateReferenceImage(input: unknown): string {
  if (typeof input !== "string" || input.length > Math.ceil(MAX_REFERENCE_BYTES / 3) * 4 + 40) throw new AppError("INVALID_IMAGE", "参考图过大，请使用 1.2 MB 以内的 JPG、PNG 或 WebP。");
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input);
  if (!match || match[2].length % 4 !== 0) throw new AppError("INVALID_IMAGE", "仅接受本地 JPG、PNG 或 WebP 参考图，不接受外部链接或 SVG。");
  let bytes: string;
  try { bytes = atob(match[2]); } catch { throw new AppError("INVALID_IMAGE", "参考图片编码无效。"); }
  if (bytes.length > MAX_REFERENCE_BYTES || bytes.length < 16) throw new AppError("INVALID_IMAGE", "参考图片内容无效或过大。");
  const valid = match[1] === "jpeg" ? bytes.charCodeAt(0) === 255 && bytes.charCodeAt(1) === 216 && bytes.charCodeAt(2) === 255
    : match[1] === "png" ? bytes.slice(0, 8) === "\x89PNG\r\n\x1a\n"
    : bytes.slice(0, 4) === "RIFF" && bytes.slice(8, 12) === "WEBP";
  if (!valid) throw new AppError("INVALID_IMAGE", "参考图格式与文件内容不一致。");
  return input;
}
export function safeGeneratedImageUrl(input: unknown): string {
  if (typeof input !== "string" || input.length > 4096) throw new AppError("INVALID_IMAGE_OUTPUT", "图像服务未返回可用图片。", 502);
  let url: URL;
  try { url = new URL(input); } catch { throw new AppError("INVALID_IMAGE_OUTPUT", "图像链接无效。", 502); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !/^[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com$/.test(url.hostname)) throw new AppError("INVALID_IMAGE_OUTPUT", "图像链接不在允许的阿里云图片存储域内，已停止展示。", 502);
  return url.href;
}
