import { FACT_DEFINITIONS, SOURCE_LABELS } from "../lib/domain";
import type { GenerationResult, RiskReport } from "../lib/domain";
import { factChanges, listingComparison, STATUS_LABELS } from "../lib/workbench";

export function ListingComparison({ before, after, report, title }: { before: GenerationResult; after: GenerationResult; report: RiskReport | null; title: string }) {
  const rows = listingComparison(before.listing, after.listing);
  const facts = factChanges(before.profile, after.profile);
  return <section className="wb-panel comparison-panel">
    <div className="section-heading"><h2>{title}</h2><span className="count-tag">{rows.filter(r => r.changed).length} 段有变化</span></div>
    <p className="help">仅保留本页会话中的版本，刷新后清空；需要留档请先导出 JSON。下方是完整旧版与当前版，不是两次独立审核。</p>
    <div className="comparison">
      <div><strong>修改前</strong><p>{before.report.counts.block} 阻断 / {before.report.counts.warn} 待复核</p><small>{before.generation.model} · {before.generatedAt}</small></div>
      <div><strong>当前版本</strong><p>{report ? `${report.counts.block} 阻断 / ${report.counts.warn} 待复核` : "待重新检查"}</p><small>{after.generation.model} · {after.generatedAt}</small></div>
    </div>
    <details className="comparison-facts" open={facts.length > 0}>
      <summary>事实与来源变化 · {facts.length} 项</summary>
      {facts.length === 0 ? <p className="help">事实档案未变更；文案或引用的变化见下方。</p> : facts.map(f => <article key={f.key}><h3>{f.label}</h3><div className="comparison">{[f.before, f.after].map((value, i) => <div key={i}><small>{i === 0 ? "修改前" : "当前"} · {value ? STATUS_LABELS[value.status] : "未填写"}</small><p>{value?.value || "未填写"}</p>{value && <p className="help">{SOURCE_LABELS[value.source]} · {value.sourceNote || "无来源说明"}</p>}</div>)}</div></article>)}
    </details>
    <div className="comparison-rows">{rows.map(row => <details key={row.field} open={row.changed}>
      <summary>{row.label}<span>{row.changed ? row.textChanged ? "文案有变化" : "仅引用变化" : "未变化 · 展开查看"}</span></summary>
      <div className="comparison">{[row.before, row.after].map((part, i) => <div key={i}><small>{i === 0 ? "修改前" : "当前"}</small><p lang="en">{part?.text ?? "本版本无此段"}</p><p className="help">引用：{part?.factIds.map(id => FACT_DEFINITIONS.find(f => f.key === id)?.label).join("、") || "无"}</p></div>)}</div>
    </details>)}</div>
  </section>;
}
