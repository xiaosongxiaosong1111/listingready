"use client";
import { useEffect, useRef, useState } from "react";
import type { ProductInput } from "../lib/domain";
import { normalizeProfile } from "../lib/facts";
import { canReviewScene, MAX_REFERENCE_BYTES, SCENE_KINDS, sceneInputKey, sceneSuggestions, validateReferenceImage } from "../lib/scene";
import type { SceneKind, SceneResult } from "../lib/scene";

export type SceneAttachment = SceneResult & { humanReviewed: boolean };
function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("无法读取参考图。")); reader.readAsDataURL(blob); });
}
export function SceneWorkbench({ product, demo, disabled, onAttachment, onBusy }: { product: ProductInput; demo: string; disabled: boolean; onAttachment: (attachment: SceneAttachment | null) => void; onBusy: (busy: boolean) => void }) {
  const [scene, setScene] = useState(() => sceneSuggestions(product.category)[0]);
  const [kind, setKind] = useState<SceneKind>("lifestyle");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [loadedImageId, setLoadedImageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ key: string; image: SceneResult } | null>(null);
  const [notice, setNotice] = useState("上传清晰的商品参考图；生成后与原图对照，不能把 AI 图片当作实拍证据。");
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const working = useRef(false);
  const inputKey = sceneInputKey(product, scene, kind, reference);
  const stale = !!result && result.key !== inputKey;
  const reviewEnabled = canReviewScene({ resultId: result?.image.id, loadedImageId, stale, busy: busy || disabled, failed: error, referenceConfirmed: confirmed });
  let eligible = false;
  try { normalizeProfile(product); eligible = true; } catch { /* Show non-throwing prerequisite help below. */ }
  useEffect(() => () => { controller.current?.abort(); }, []);
  function invalidate() { setConfirmed(false); setReviewed(false); onAttachment(null); }
  async function loadReference(blob: Blob) {
    if (blob.size > MAX_REFERENCE_BYTES) throw new Error("参考图需小于 1.2 MB，请先压缩或换一张清晰图片。");
    const value = validateReferenceImage(await asDataUrl(blob));
    setReference(value); invalidate(); setError(false); setNotice("参考图已载入。请确认使用权及商品对应关系，再生成。");
  }
  async function useDemoPhoto() {
    try { const response = await fetch("/product/scene-horizontal.jpg"); if (!response.ok) throw new Error("无法载入案例参考图。"); await loadReference(await response.blob()); }
    catch (e) { setError(true); setNotice(e instanceof Error ? e.message : "参考图读取失败。"); }
  }
  async function generate() {
    if (working.current || !confirmed || !eligible || disabled) return;
    working.current = true; setBusy(true); onBusy(true); setError(false); setReviewed(false); onAttachment(null);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 160000);
    setNotice("正在依据参考图生成营销素材，可能需要一两分钟。失败不会清空 Listing，也不会自动重复调用。");
    try {
      const response = await fetch("/api/generate-scene", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: product, scene, kind, referenceImage: reference, referenceConfirmed: confirmed }), signal: abort.signal });
      if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("图像服务没有返回可读取的结果，请稍后检查。");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "图像生成失败。");
      const image = payload as SceneResult;
      setResult({ key: inputKey, image }); onAttachment({ ...image, humanReviewed: false });
      setNotice("已生成 AI 营销素材。请比较主体结构、颜色、部件和配件；有失真就不要勾选复核。");
    } catch (e) {
      setError(true); setNotice(abort.signal.aborted ? "已停止等待；上游可能仍在处理并计费，请勿立即重复提交。" : e instanceof Error ? e.message : "图片生成失败。");
      if (result && !stale) onAttachment({ ...result.image, humanReviewed: false });
    } finally { clearTimeout(timeout); controller.current = null; working.current = false; setBusy(false); onBusy(false); }
  }
  return <section className="wb-panel scene-panel" id="scene" aria-busy={busy}>
    <div className="section-heading"><div><p className="overline">04 / AI VISUAL</p><h2>AI 场景图</h2></div><span className="count-tag">实验功能 · 逐图复核</span></div>
    <p className="help">尝试改变背景与光线；模型仍可能增减部件或改变商品结构，必须对照原图复核。不是图片识别，也不是 Amazon 主图生成器。资料或案例切换后需重新选择参考图。</p>
    {!eligible && <p className="stale-warning">先确认商品名称与核心功能的内容和来源，再生成场景图。</p>}
    <fieldset disabled={busy || disabled} className="facts-fieldset">
      <label className="field-label" htmlFor="scene-reference">商品参考图 · JPG / PNG / WebP，最大 1.2 MB</label>
      <input type="file" id="scene-reference" accept="image/jpeg,image/png,image/webp" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { await loadReference(file); } catch (error) { setNotice(error instanceof Error ? error.message : "文件读取失败。"); setError(true); } e.target.value = ""; }} />
      {demo === "organizer" && <button type="button" className="wb-secondary" onClick={useDemoPhoto}>载入收纳盒案例参考图</button>}
      <label className="field-label" htmlFor="scene-kind">素材类型</label><select id="scene-kind" value={kind} onChange={e => { setKind(e.target.value as SceneKind); invalidate(); }}>{Object.entries(SCENE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <label className="field-label" htmlFor="scene-brief">创意背景 · 不作为商品用途证据</label><textarea id="scene-brief" maxLength={240} rows={2} value={scene} onChange={e => { setScene(e.target.value); invalidate(); }} />
      <div className="scene-suggestions">{sceneSuggestions(product.category).map(s => <button type="button" className="wb-secondary" key={s} onClick={() => { setScene(s); invalidate(); }}>{s}</button>)}</div>
      <label className="review-checkbox"><input type="checkbox" checked={confirmed} disabled={!reference} onChange={e => { setConfirmed(e.target.checked); setReviewed(false); onAttachment(null); }} /><span>我有权使用这张参考图，确认主体对应当前商品，同意将图片与已确认外观资料发送至比赛阿里云接口。请勿上传含个人隐私的图片。</span></label>
      <button type="button" className="wb-primary" disabled={!eligible || !reference || !confirmed || !scene.trim()} onClick={generate}>{busy ? "图片生成中…" : result ? "重新生成 AI 营销素材" : "生成 AI 营销素材"}</button>
    </fieldset>
    <p role={error ? "alert" : "status"} className={error ? "wb-notice notice-error" : "help"}>{notice}</p>
    {(reference || result) && <div className="scene-comparison">{reference && <figure><img src={reference} alt="当前商品参考图" /><figcaption>参考图 · 用于人工对照</figcaption></figure>}{result && <figure><img key={result.image.id} src={result.image.url} alt="AI 生成的商品营销素材，待人工核对外观" referrerPolicy="no-referrer" onLoad={e => { if (e.currentTarget.naturalWidth > 0) setLoadedImageId(result.image.id); }} onError={() => { setLoadedImageId(null); setError(true); setReviewed(false); onAttachment(null); setNotice("图片无法加载或临时链接已过期。请使用已保存的备份，不要把未看到的图片标记为已复核。"); }} /><figcaption>AI 生成营销素材{stale ? " · 旧结果，不随当前文案导出" : " · 待外观复核"}</figcaption></figure>}</div>}
    {result && <><p className="help">{result.image.model} · {(result.image.durationMs / 1000).toFixed(1)} 秒 · {result.image.promptSummary}</p><p className="help">{result.image.notice}</p>
      {!stale && <>{loadedImageId !== result.image.id && !error && <p className="help">图片尚未完成加载，暂不能确认外观复核。请等待图片显示后再与原图比较。</p>}<label className="review-checkbox"><input type="checkbox" checked={reviewed} disabled={!reviewEnabled} onChange={e => { if (!reviewEnabled) return; setReviewed(e.target.checked); onAttachment({ ...result.image, humanReviewed: e.target.checked }); }} /><span>我已与参考图比较，确认主体外观和部件无失真，背景道具不会被误认为销售配件。</span></label><a className="wb-secondary image-link" href={result.image.url} target="_blank" rel="noreferrer">打开图片并另存 ↗</a></>}
    </>}
  </section>;
}
