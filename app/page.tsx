"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FACT_DEFINITIONS, RULES, SOURCE_LABELS, listingParts } from "../lib/domain";
import type { FactKey, GenerationResult, ListingPart, ProductFact, ProductInput, RiskReport } from "../lib/domain";
import { blankProduct, organizerDemo, towelDemo, TOWEL_SOURCE } from "../lib/demos";
import { listingText } from "../lib/listing";
import { factExclusion } from "../lib/facts";
import { localizationPlan, localizationText } from "../lib/localization";
import { exportFilename, fieldLabel, riskTargets, STATUS_LABELS } from "../lib/workbench";
import { ListingComparison } from "./listing-comparison";
import { SceneWorkbench } from "./scene-workbench";
import type { SceneAttachment } from "./scene-workbench";
import "./workbench.css";

type Snapshot = { input: string; result: GenerationResult };
const categories = ["家居收纳", "厨房纺织品", "办公文具", "旅行用品", "宠物用品", "其他非媒体类商品"];

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: signal ?? AbortSignal.timeout(20000) });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("服务未返回可读取的结果，请稍后重试。已填写的内容仍然保留。");
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "请求失败，请稍后重试。");
  return payload as T;
}

export default function Home() {
  const [product, setProductState] = useState<ProductInput>(organizerDemo);
  const [demo, setDemo] = useState<"organizer" | "towel" | "custom">("organizer");
  const [bannedInput, setBannedInput] = useState("");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previous, setPrevious] = useState<GenerationResult | null>(null);
  const [editBaseline, setEditBaseline] = useState<GenerationResult | null>(null);
  const [sceneAttachment, setSceneAttachment] = useState<{ input: string; attachment: SceneAttachment } | null>(null);
  const [edited, setEdited] = useState(false);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [preparedExport, setPreparedExport] = useState<{ key: string; url: string; filename: string; content: string } | null>(null);
  const [busy, setBusy] = useState<"generate" | "check" | "export" | "image" | null>(null);
  const [notice, setNotice] = useState("选择案例，或直接填写自己的商品。名称和核心功能需有已确认的内容及来源。");
  const [error, setError] = useState(false);
  const inflight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const serialized = JSON.stringify(product);
  const stale = !!snapshot && snapshot.input !== serialized;
  const confirmed = product.facts.filter(f => factExclusion(f) === null).length;
  const strategy = snapshot ? localizationPlan(snapshot.result.profile) : null;
  const currentImage = sceneAttachment?.input === serialized ? sceneAttachment.attachment : null;
  const exportKey = JSON.stringify({ serialized, id: snapshot?.result.id, listing: snapshot?.result.listing, report, reviewed, currentImage });
  const currentExport = preparedExport?.key === exportKey ? preparedExport : null;
  useEffect(() => () => { if (preparedExport) URL.revokeObjectURL(preparedExport.url); }, [preparedExport]);
  function setProduct(next: ProductInput | ((previous: ProductInput) => ProductInput)) {
    setProductState(next); setSceneAttachment(null);
  }

  function message(text: string, isError = false) { setNotice(text); setError(isError); }
  function updateFact(key: FactKey, patch: Partial<ProductFact>) {
    if (key === "productName" && patch.value !== undefined) setDemo("custom");
    setProduct(p => ({ ...p, facts: p.facts.map(f => f.key !== key ? f : { ...f, ...patch, ...(patch.status === undefined ? { status: "pending" as const } : {}) }) }));
    setReviewed(false);
  }
  function loadDemo(kind: typeof demo) {
    setDemo(kind); setProduct(kind === "organizer" ? organizerDemo() : kind === "towel" ? towelDemo() : blankProduct());
    setSnapshot(null); setPrevious(null); setEditBaseline(null); setReport(null); setEdited(false); setReviewed(false);
    setBannedInput("");
    message(kind === "towel" ? "已加载品牌官网资料案例。仅用于流程演示，不代表你的实际货品或品牌经销授权。" : "已加载商品资料，请核对事实来源后生成。");
  }
  async function generate(event: FormEvent) {
    event.preventDefault();
    if (inflight.current) return;
    inflight.current = true; setBusy("generate"); setReviewed(false);
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 100000);
    message("正在生成英文文案并执行独立规则检查，通常需要几十秒。");
    try {
      const result = await post<GenerationResult>("/api/generate-listing", product, controller.current.signal);
      setPrevious(snapshot?.result ?? null); setEditBaseline(null); setSnapshot({ input: serialized, result }); setReport(result.report); setEdited(false);
      message(result.report.counts.block ? "生成完成，发现需要修订的风险内容。可在右侧修改文案并重新检查。" : "生成完成。请对照事实引用、待确认事项与原始资料复核。");
    } catch (e) {
      message(e instanceof Error && e.name !== "AbortError" ? e.message : "请求已停止等待；若已发出模型请求，可能仍会计费。可以稍后重试。", true);
    } finally { clearTimeout(timeout); inflight.current = false; controller.current = null; setBusy(null); }
  }
  function updatePart(field: string, patch: Partial<ListingPart>) {
    if (!snapshot) return;
    if (!editBaseline) setEditBaseline(structuredClone(snapshot.result));
    const result = structuredClone(snapshot.result);
    if (field.startsWith("bullets.")) Object.assign(result.listing.bullets[Number(field.split(".")[1])], patch);
    else Object.assign(result.listing[field as "title" | "itemHighlights" | "description" | "searchTerms"], patch);
    setSnapshot({ ...snapshot, result }); setEdited(true); setReport(null); setReviewed(false);
  }
  async function check() {
    if (!snapshot || stale || inflight.current) return;
    inflight.current = true; setBusy("check"); setReviewed(false);
    try {
      const payload = await post<{ report: RiskReport }>("/api/check-listing", { profile: product, listing: snapshot.result.listing });
      setReport(payload.report);
      setSnapshot(s => s ? { ...s, result: { ...s.result, report: payload.report } } : s);
      message("已按当前文案重新检查。来源引用仍需你人工核对。");
    } catch (e) { message(e instanceof Error ? e.message : "检查失败。", true); }
    finally { inflight.current = false; setBusy(null); }
  }
  async function copy() {
    if (!snapshot || stale) return;
    try { await navigator.clipboard.writeText("[AI DRAFT — REVIEW REQUIRED]\n\n" + listingText(snapshot.result.listing)); message("已复制带草稿标识的文案。"); }
    catch { message("浏览器未允许复制，请直接选中文案复制。", true); }
  }
  async function copySection(text: string, label: string) {
    if (!snapshot || stale || busy) return;
    try { await navigator.clipboard.writeText(text); message(`已复制${label}。复制不等于通过审核，请保留草稿状态并复核后使用。`); }
    catch { message("浏览器未允许复制，请直接选中文案复制。", true); }
  }
  function focusTarget(id: string) {
    const element = document.getElementById(id);
    if (!element) return;
    let parent = element.parentElement;
    while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
    element.scrollIntoView({ block: "center", behavior: "instant" });
    element.focus({ preventScroll: true });
  }
  async function download(mode: "draft" | "reviewed") {
    if (!snapshot || stale || inflight.current) return;
    inflight.current = true; setBusy("export");
    try {
      const bundle = await post<Record<string, unknown>>("/api/export-listing", { profile: product, listing: snapshot.result.listing, mode, humanReviewed: reviewed, marketingImage: currentImage });
      const payload = { ...bundle, generation: snapshot.result.generation, generationId: snapshot.result.id, generatedAt: snapshot.result.generatedAt, editedAfterGeneration: edited, provenanceNotice: "生成元数据来自本次浏览器会话，未进行服务端签名认证。" };
      const content = JSON.stringify(payload, null, 2);
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      setPreparedExport({ key: exportKey, url, content, filename: exportFilename(product.facts.find(f => f.key === "productName")?.value ?? "", mode) });
      message("文件已准备好，请点击“保存 JSON 文件”。如浏览器未下载，可展开内容自行保存；准备成功不代表文件已经落盘。");
    } catch (e) { message(e instanceof Error ? e.message : "导出失败。", true); }
    finally { inflight.current = false; setBusy(null); }
  }

  return (
    <main className="workbench">
      <header className="wb-header">
        <a className="wb-brand" href="#facts"><span className="wb-mark">LR</span><span>ListingReady<small>可信 AI 跨境上新工作台</small></span></a>
        <span className="market-tag">Amazon 美国站 · English</span>
      </header>
      <div className="wb-intro"><div><p className="overline">从商品事实到可复核的英文文案</p><h1>把每一句卖点，落到事实。</h1></div><p>确认资料 → AI 生成 → 风险检查 → 人工复核导出</p></div>
      <nav className="flow-nav" aria-label="工作流程"><a href="#facts"><b>01</b> 商品事实</a><a href="#listing"><b>02</b> AI Listing</a><a href="#risk"><b>03</b> 风险检查</a><a href="#scene"><b>04</b> AI 场景图</a><a href="#export"><b>05</b> 上新包</a></nav>
      <div role={error ? "alert" : "status"} aria-live="polite" className={"wb-notice " + (error ? "notice-error" : "")}>{notice}</div>
      <div className="wb-columns">
        <section className="wb-panel" id="facts">
          <div className="section-heading"><div><p className="overline">01 / PRODUCT FACTS</p><h2>商品事实档案</h2></div><span className="count-tag">{confirmed} / {product.facts.length} 已确认</span></div>
          <div className="demo-selector" role="group" aria-label="演示案例">
            <button type="button" disabled={!!busy} aria-pressed={demo === "organizer"} onClick={() => loadDemo("organizer")}>收纳盒 · 资料待补充</button>
            <button type="button" disabled={!!busy} aria-pressed={demo === "towel"} onClick={() => loadDemo("towel")}>厨房毛巾 · 官网资料</button>
            <button type="button" disabled={!!busy} aria-pressed={demo === "custom"} onClick={() => loadDemo("custom")}>填写我的商品</button>
          </div>
          {demo === "towel" && <p className="help">IKEA RINNIG 公开商品资料，核对于 2026-09-07。<a href={TOWEL_SOURCE} target="_blank" rel="noreferrer">查看原始资料 ↗</a> 此案例仅演示流程，请勿冒用品牌或参数。</p>}
          {demo === "organizer" && <details className="photo-evidence"><summary>查看 3 张实物照片 · 人工整理可见特征</summary><div className="evidence-photos"><img src="/product/scene-horizontal.jpg" alt="白色收纳抽屉横向摆放" /><img src="/product/scene-stacked.jpg" alt="抽屉单元垂直摆放" /><img src="/product/scene-drawers-open.jpg" alt="抽屉打开后收纳文具" /></div><p className="help">摆放照片不能证明材质、承重、包装数量或锁定式堆叠。尚未接入 AI 图片识别。</p></details>}
          <form onSubmit={generate}>
            <fieldset disabled={!!busy} className="facts-fieldset">
              <label className="field-label" htmlFor="category">商品品类</label>
              <input id="category" list="categories" maxLength={80} value={product.category} onChange={e => { setDemo("custom"); setProduct({ ...product, category: e.target.value }); setReviewed(false); }} required />
              <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
              <p className="help">修改内容或来源后会恢复“待确认”。确认表示你已核对原始资料，并非系统自动验证。</p>
              <div className="fact-list">
                {product.facts.map(fact => {
                  const def = FACT_DEFINITIONS.find(d => d.key === fact.key)!;
                  return <details className={"fact-card fact-" + fact.status} key={fact.key} open={["productName", "features"].includes(fact.key) ? true : undefined}>
                    <summary><span>{def.label}{def.required && <small>核心</small>}</span><span className={"fact-badge " + fact.status}>{STATUS_LABELS[fact.status]}</span><span className="fact-preview">{fact.value || "未填写"}</span></summary>
                    <div className="fact-body">
                      <label htmlFor={"value-" + fact.key} className="field-label">{def.label}内容</label>
                      <textarea id={"value-" + fact.key} value={fact.value} maxLength={1200} rows={2} onChange={e => updateFact(fact.key, { value: e.target.value })} placeholder={fact.key === "dimensions" ? "例如：18 x 24 inches，注明单位" : "填写已知内容；未知信息保持空白"} />
                      <div className="fact-controls"><label>资料来源<select value={fact.source} onChange={e => updateFact(fact.key, { source: e.target.value as ProductFact["source"] })}>{Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                      <label>确认状态<select value={fact.status} onChange={e => updateFact(fact.key, { status: e.target.value as ProductFact["status"] })}><option value="pending">待确认</option><option value="confirmed">已确认</option><option value="rejected">已否定</option>{!def.required && <option value="not_applicable">不适用</option>}</select></label></div>
                      <label className="field-label" htmlFor={"source-" + fact.key}>来源说明 / 链接</label>
                      <textarea id={"source-" + fact.key} rows={2} maxLength={600} value={fact.sourceNote} onChange={e => updateFact(fact.key, { sourceNote: e.target.value })} placeholder="例如：供应商规格书第 2 页；或官网链接与核对日期" />
                      {factExclusion(fact) && <p className="help fact-exclusion">不进入模型：{factExclusion(fact)}</p>}
                    </div>
                  </details>;
                })}
              </div>
              <label className="field-label" htmlFor="keywords">关键词备忘（本版不作为事实输入）</label>
              <input id="keywords" value={product.keywords} maxLength={500} onChange={e => { setProduct({ ...product, keywords: e.target.value }); setReviewed(false); }} placeholder="用于人工核对搜索方向" />
              <label className="field-label" htmlFor="banned">禁用词（用逗号分隔）</label>
              <input id="banned" value={bannedInput} maxLength={1000} onChange={e => { setBannedInput(e.target.value); setProduct({ ...product, bannedTerms: e.target.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) }); setReviewed(false); }} placeholder="例如：waterproof, unbreakable" />
              <button type="submit" className="wb-primary">{busy === "generate" ? "生成并检查中…" : snapshot ? "依据当前事实重新生成 →" : "生成英文 Listing →"}</button>
            </fieldset>
          </form>
          <p className="help">只有已确认且有来源说明的事实进入模型。生成不会自动发布到 Amazon。</p>
        </section>
        <div className="result-column">
          <section className="wb-panel" id="listing" aria-busy={busy === "generate"}>
            <div className="section-heading"><div><p className="overline">02 / AI LISTING</p><h2>英文 Listing</h2></div><span className="count-tag">{snapshot ? edited ? "已人工编辑" : "AI 生成草稿" : "等待生成"}</span></div>
            {!snapshot ? <div className="empty-result"><span className="empty-symbol">Aa</span><h3>从一份可信资料开始</h3><p>生成标题、商品亮点、卖点、描述和搜索词。每段文案附带事实引用，可逐项查看。</p><div className="empty-fields"><span>Title ≤ 75 字符</span><span>Item Highlights ≤ 125 字符</span><span>事实引用 + 独立风险报告</span></div></div> : <>
              {stale && <p role="alert" className="stale-warning">商品资料已修改，下方是旧版本结果。重新生成后才能复核、复制或导出。</p>}
              <p className="help">可直接修改文案；修改后请重新检查。事实引用由模型提出，不代表语义已被独立验证。</p>
              <fieldset disabled={!!busy || stale} className="facts-fieldset listing-fields">
                {listingParts(snapshot.result.listing).map(([field, part]) => <article className="listing-part" key={field}>
                  <div className="part-heading"><label className="result-label" htmlFor={"listing-" + field}>{fieldLabel(field)}<small>{field === "searchTerms" ? `${new TextEncoder().encode(part.text).length} / ${RULES.searchTermsMaxBytes} 字节` : `${[...part.text].length} 字符`}</small></label><button type="button" className="wb-secondary copy-part" onClick={() => copySection(part.text, fieldLabel(field))} aria-label={"复制" + fieldLabel(field)}>复制</button></div>
                  <textarea id={"listing-" + field} aria-label={fieldLabel(field)} lang="en" value={part.text} maxLength={6000} rows={field === "description" ? 5 : 3} onChange={e => updatePart(field, { text: e.target.value })} />
                  <details className="source-details"><summary>事实引用 · {part.factIds.length} 项</summary>
                    {snapshot.result.profile.facts.filter(f => f.allowedInListing).map(f => <label className="reference-item" key={f.key}><input type="checkbox" checked={part.factIds.includes(f.key)} onChange={e => updatePart(field, { factIds: e.target.checked ? [...part.factIds, f.key] : part.factIds.filter(id => id !== f.key) })} /><span><strong>{FACT_DEFINITIONS.find(d => d.key === f.key)!.label}</strong><span>{f.value}</span><small>{SOURCE_LABELS[f.source]} · {f.sourceNote}</small></span></label>)}
                  </details>
                </article>)}
              </fieldset>
              {strategy && <details className="localization-panel"><summary>本地化编辑说明 · 为什么这样写</summary>
                <p className="help">{strategy.notice}</p><p>{strategy.tone}</p>
                <h3>已确认事实的优先顺序</h3><ol>{strategy.priority.map(p => <li key={p.factId}><strong>{p.label}</strong>：{p.value}</li>)}</ol>
                <h3>表达规则</h3><ul>{strategy.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
                {strategy.omitted.length > 0 && <><h3>暂不采用的资料</h3><ul>{strategy.omitted.map(p => <li key={p.factId}>{p.label}：{p.reason}</li>)}</ul></>}
                <button type="button" className="wb-secondary" disabled={!!busy || stale} onClick={() => copySection(localizationText(strategy), "本地化编辑说明")}>复制编辑说明</button>
              </details>}
              <details className="generation-details"><summary>生成记录</summary><p>{snapshot.result.generation.model} · {(snapshot.result.generation.durationMs / 1000).toFixed(1)} 秒 · {snapshot.result.generation.attempts} 次请求 · {snapshot.result.generation.totalTokens ?? "未知"} tokens</p><p>生成编号：{snapshot.result.id}</p><p>提示词版本：{snapshot.result.generation.promptVersion}</p></details>
            </>}
          </section>
          <section className="wb-panel" id="risk">
            <div className="section-heading"><div><p className="overline">03 / FACT CHECK</p><h2>发布前风险检查</h2></div>{snapshot && <button type="button" className="wb-secondary" disabled={!!busy || stale} onClick={check}>{busy === "check" ? "检查中…" : "重新检查"}</button>}</div>
            {report && !stale ? <>
              <div className="risk-counts"><span className="count-block"><b>{report.counts.block}</b>阻断项</span><span className="count-warn"><b>{report.counts.warn}</b>待复核</span><span className="count-pass"><b>{report.counts.pass}</b>规则通过</span></div>
              <p className="review-status">{report.status === "blocked" ? "存在风险内容，已阻止复核包导出。" : report.status === "needs_review" ? "资料或文案仍有待复核项，可导出草稿。" : "已覆盖规则未发现风险，等待人工复核。"}</p>
              <ul className="risk-list">{[...report.checks].sort((a, b) => ({ block: 0, warn: 1, pass: 2 })[a.severity] - ({ block: 0, warn: 1, pass: 2 })[b.severity]).map(c => <li key={c.id} className={"risk-" + c.severity}><span aria-hidden="true">{c.severity === "pass" ? "✓" : "!"}</span><div><strong>{c.label}</strong><p>{c.detail}</p>{c.field && <small>位置：{fieldLabel(c.field)}</small>}{c.excerpt && <blockquote>{c.excerpt}</blockquote>}{c.severity !== "pass" && <div className="risk-actions">{riskTargets(c).map(target => <button type="button" className="wb-secondary" key={target.id} disabled={!!busy} onClick={() => focusTarget(target.id)}>{target.label} ↗</button>)}</div>}</div></li>)}</ul>
            </> : <p className="help">{stale ? "资料已变更，旧风险结果不能用于当前商品。请重新生成。" : snapshot ? "文案已修改，请重新检查后再复核。" : "生成后显示独立规则检查结果。未知参数不会被自动补齐。"}</p>}
            <p className="help">当前覆盖通用风险，不等同于平台合规审核。<a href={RULES.titleSource} target="_blank" rel="noreferrer">标题规则来源 ↗</a></p>
          </section>
          {snapshot && !stale && editBaseline && <ListingComparison before={editBaseline} after={snapshot.result} report={report} title="本次人工改稿对照" />}
          {snapshot && !stale && previous && <ListingComparison before={previous} after={snapshot.result} report={report} title="与上次生成完整对照" />}
          <SceneWorkbench key={serialized} product={product} demo={demo} disabled={!!busy && busy !== "image"} onBusy={value => setBusy(value ? "image" : null)} onAttachment={attachment => { setSceneAttachment(attachment ? { input: serialized, attachment } : null); setReviewed(false); }} />
          <section className="wb-panel" id="export"><div className="section-heading"><div><p className="overline">05 / EXPORT</p><h2>上新资料包</h2></div></div>
            <p className="help">包含英文文案、原始事实、引用关系、编辑说明、模型记录和风险报告。有当前场景图时附带图片链接及人工复核状态，图片文件需另存；不包含参考图原文件。</p>
            {currentImage && !currentImage.humanReviewed && <p className="stale-warning">当前场景图尚未通过人工外观复核；仍可下载草稿。</p>}
            <label className="review-checkbox"><input type="checkbox" checked={reviewed} disabled={!!busy || stale || !report?.canExportReviewed} onChange={e => setReviewed(e.target.checked)} /><span>我已对照原始商品资料，人工检查全部文案与引用。</span></label>
            <div className="export-actions"><button className="wb-secondary" disabled={!snapshot || stale || !!busy} onClick={copy}>复制草稿</button><button className="wb-secondary" disabled={!snapshot || stale || !!busy} onClick={() => download("draft")}>下载草稿 JSON</button><button className="wb-primary" disabled={!snapshot || stale || !!busy || !report?.canExportReviewed || !reviewed || (!!currentImage && !currentImage.humanReviewed)} onClick={() => download("reviewed")}>导出人工复核包</button></div>
            {currentExport && !stale && !busy && <div className="prepared-export">
              <p className="help">已准备：{currentExport.filename}。修改事实、文案、复核状态或图片后需重新准备文件。</p>
              <a className="wb-secondary image-link" href={currentExport.url} download={currentExport.filename}>保存 JSON 文件</a>
              <details><summary>预览完整导出内容</summary><label className="field-label" htmlFor="export-content">导出 JSON 内容</label><textarea id="export-content" readOnly rows={12} value={currentExport.content} spellCheck={false} /><p className="help">此处与保存文件使用完全相同的内容。不含 API Key；请保留事实来源、风险报告和草稿标识。</p></details>
            </div>}
          </section>
        </div>
      </div>
      <footer className="wb-footer"><span>ListingReady · 小宋1021队 · AI智能上新</span><span>AI 文案与参考图编辑 · 发布前须人工复核</span></footer>
    </main>
  );
}
