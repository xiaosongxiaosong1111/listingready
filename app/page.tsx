"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import "./organizer.css";

const listing = {
  title:
    "Stackable Desk Organizer with 2 Drawers, Desktop Storage Box for Office Supplies and Small Items",
  bullets: [
    "Two pull-out drawers: separates stationery, cables, cosmetics, and other small items.",
    "Stackable design: place multiple organizer units vertically to use desk space efficiently.",
    "Compact footprint: keeps everyday small items organized without taking over the work surface.",
    "Simple drawer storage: keeps frequently used supplies separated and within reach.",
    "Flexible organization: suitable for office supplies, craft tools, makeup, and accessories.",
  ],
  description:
    "A compact two-drawer organizer designed to keep everyday small items visible and separated. Its stackable shape helps use vertical space on an office desk, shelf, or vanity while keeping frequently used supplies within reach.",
  searchTerms:
    "stackable desk organizer drawer storage box office supplies desktop organization plastic drawers",
  checks: [
    { label: "标题长度", detail: "不超过 200 字符，符合演示规则", tone: "pass" },
    { label: "事实一致性", detail: "抽屉数量、材质和尺寸为未验证 Mock，禁止直接发布", tone: "warn" },
    { label: "夸张宣传", detail: "未使用 best、No.1、100% 等无依据词语", tone: "pass" },
    { label: "待人工确认", detail: "抽屉内部尺寸和最大承重尚未提供，文案中未生成相关承诺", tone: "warn" },
  ],
};

const copyText = [
  "[UNVERIFIED MOCK — DO NOT PUBLISH]",
  "",
  listing.title,
  "",
  ...listing.bullets.map((bullet, index) => `${index + 1}. ${bullet}`),
  "",
  listing.description,
  "",
  `Search Terms: ${listing.searchTerms}`,
].join("\n");

export default function Home() {
  const [generated, setGenerated] = useState(false);
  const [notice, setNotice] = useState("演示模式 · 暂未接入百炼 API");

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerated(true);
    setNotice("演示上新包已生成 · 数据来源：固定 Mock");
  }

  async function copyListing() {
    try {
      await navigator.clipboard.writeText(copyText);
      setNotice("Listing 文案已复制");
    } catch {
      setNotice("复制失败，请手动选择文案");
    }
  }

  function downloadListing() {
    const file = new Blob(
      [JSON.stringify({ source: "mock", verified: false, warning: "UNVERIFIED MOCK — DO NOT PUBLISH", marketplace: "Amazon US", listing }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "listingready-desk-organizer-amazon-us.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("JSON 上新包已下载");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ListingReady 首页">
          <span className="brand-mark">LR</span>
          <span>ListingReady</span>
        </a>
        <span className="team-pill">小宋1021队 · AI智能上新</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">为单人跨境卖家准备的上新工作台</p>
          <h1>一份中文商品资料，生成可检查的 Amazon 美国站 Listing</h1>
          <p className="hero-lead">
            AI 先理解商品事实，再完成英文表达与发布前质检。首版只做一个平台、一个市场，把上新闭环跑通。
          </p>
          <div className="hero-metrics" aria-label="演示目标">
            <div><strong>10 分钟</strong><span>目标处理时间</span></div>
            <div><strong>1 个 SKU</strong><span>首版演示范围</span></div>
            <div><strong>可追溯</strong><span>生成内容对照输入</span></div>
          </div>
        </div>

        <div className="product-stage" role="img" aria-label="可堆叠抽屉式桌面收纳盒演示图形">
          <span className="demo-label">DEMO SKU · 桌面收纳盒</span>
          <div className="organizer">
            <div className="organizer-unit organizer-top"><div className="organizer-drawer" /></div>
            <div className="organizer-unit"><div className="organizer-drawer" /></div>
          </div>
          <div className="stage-note">Stackable · 2 Drawers · PP Plastic</div>
        </div>
      </section>

      <section className="workspace" aria-label="ListingReady 演示工作台">
        <form className="panel input-panel" onSubmit={generate}>
          <div className="panel-heading">
            <div>
              <span className="step">01</span>
              <h2>商品信息</h2>
            </div>
            <span className="fixed-market">Amazon 美国站</span>
          </div>

          <div className="upload-card">
            <span className="upload-icon" aria-hidden="true">+</span>
            <span><strong>商品图片待补充</strong><small>当前使用右侧 Mock 图，拿到实拍图后替换</small></span>
          </div>

          <div className="field-grid">
            <label>商品名称<input name="productName" defaultValue="可堆叠抽屉式桌面收纳盒" required readOnly /></label>
            <label>材质<input name="material" defaultValue="PP 塑料（Mock，待实物确认）" required readOnly /></label>
            <label>尺寸<input name="dimensions" defaultValue="24 × 17 × 14 cm（Mock，待实物测量）" required readOnly /></label>
            <label>颜色<input name="color" defaultValue="白色" required readOnly /></label>
            <label className="wide">结构规格<input name="structure" defaultValue="2 个抽屉；支持垂直堆叠" required readOnly /></label>
            <label className="wide">核心卖点<textarea name="features" defaultValue="抽屉分类收纳；可堆叠节省桌面空间；表面易清洁；适合文具和小物" required readOnly /></label>
          </div>

          <button className="primary-button" type="submit">
            {generated ? "重新生成演示上新包" : "生成上新包"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">当前字段为未验证 Mock 且只读，仅用于流程演示，禁止直接发布。</p>
        </form>

        <section className="panel output-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <span className="step">02</span>
              <h2>生成结果</h2>
            </div>
            <span className={generated ? "status status-ready" : "status"}>
              {generated ? "已生成" : "等待生成"}
            </span>
          </div>

          <div className={generated ? "results" : "results results-locked"}>
            {!generated && <div className="result-lock">填写左侧信息并点击“生成上新包”</div>}
            <div className="result-content" aria-hidden={!generated}>
              <article className="result-block">
                <span className="result-label">Amazon Title · 未验证 Mock</span>
                <h3>{listing.title}</h3>
              </article>

              <article className="result-block">
                <span className="result-label">Key Product Features</span>
                <ol>{listing.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ol>
              </article>

              <article className="result-block">
                <span className="result-label">Description</span>
                <p>{listing.description}</p>
              </article>

              <article className="quality-block">
                <div className="quality-heading">
                  <span className="result-label">发布前质检</span>
                  <strong>2 项通过 · 2 项待确认</strong>
                </div>
                <ul>
                  {listing.checks.map((check) => (
                    <li key={check.label} className={check.tone === "warn" ? "check-warn" : ""}>
                      <span aria-hidden="true">{check.tone === "warn" ? "!" : "✓"}</span>
                      <div><strong>{check.label}</strong><small>{check.detail}</small></div>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className="output-actions">
            <button type="button" className="secondary-button" onClick={copyListing} disabled={!generated}>复制全部文案</button>
            <button type="button" className="secondary-button" onClick={downloadListing} disabled={!generated}>下载 JSON</button>
          </div>
          <p className="notice">{notice}</p>
        </section>
      </section>

      <section className="principles">
        <p className="eyebrow">为什么不是普通翻译器</p>
        <div>
          <article><span>01</span><h2>先理解事实</h2><p>把图片和参数整理成结构化商品档案，未知信息保持未知。</p></article>
          <article><span>02</span><h2>再本地化表达</h2><p>围绕美国消费者的使用场景重新组织卖点，而不是逐句翻译。</p></article>
          <article><span>03</span><h2>最后检查</h2><p>把生成内容与原始输入逐项对照，风险交给卖家确认。</p></article>
        </div>
      </section>

      <footer>
        <strong>ListingReady</strong>
        <span>AI+跨境黑客松巅峰赛 · 小宋1021队</span>
      </footer>
    </main>
  );
}
