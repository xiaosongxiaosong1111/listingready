import { AppError } from "./domain.ts";

const MAX_BODY_BYTES = 32_768;
export async function readJson(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) throw new AppError("CONTENT_TYPE", "请使用 application/json 请求。", 415);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AppError("CROSS_ORIGIN", "不接受跨站生成请求。", 403);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new AppError("BODY_TOO_LARGE", "商品资料过长。", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_JSON", "请求内容为空。");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new AppError("BODY_TOO_LARGE", "商品资料过长。", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError("INVALID_JSON", "请求内容不是有效 JSON。"); }
}
export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
export function errorResponse(error: unknown) {
  return error instanceof AppError ? jsonResponse({ error: error.message, code: error.code }, error.status) : jsonResponse({ error: "处理失败，请稍后重试。", code: "INTERNAL_ERROR" }, 500);
}
