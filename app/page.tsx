"use client";

import type { FormEvent } from "react";
import { useState } from "react";

const listing = {
  title:
    "Adjustable Aluminum Phone Stand, Foldable Desktop Holder for 4-12.9 Inch Devices, Silver",
  bullets: [
    "Wide compatibility: supports phones and tablets from 4 to 12.9 inches.",
    "Adjustable viewing angle: position the screen for calls, recipes, or focused work.",
    "Foldable for travel: collapses into a compact shape that fits easily in a bag.",
    "Stable aluminum body: a weighted base and silicone pads help keep devices steady.",
    "Cable-friendly design: charge your device while it remains on the stand.",
  ],
  description:
    "A compact aluminum stand designed for clearer video calls, comfortable viewing, and a tidier desk. The foldable frame moves easily between a home office, kitchen counter, and travel bag.",
  searchTerms:
    "foldable phone stand adjustable tablet holder aluminum desktop stand travel phone holder",
  checks: [
    { label: "标题长度", detail: "91/200 字符，符合演示规则", tone: "pass" },
    { label: "事实一致性", detail: "材质、尺寸与兼容范围均来自输入", tone: "pass" },
    { label: "夸张宣传", detail: "未使用 best、No.1、100% 等无依据词语", tone: "pass" },
    { label: "待人工确认", detail: "承重数据尚未提供，文案中未生成相关承诺", tone: "warn" },
  ],
};

const copyText = [
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
      [JSON.stringify({ source: "mock", marketplace: "Amazon US", listing }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "listingready-amazon-us.json";
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

        <div className="product-stage" role="img" aria-label="折叠式铝合金手机支架演示图形">
          <span className="demo-label">DEMO SKU · 手机支架</span>
          <div className="phone"><span /></div>
          <div className="stand-neck" />
          <div className="stand-base" />
          <div className="stage-note">Aluminum · Foldable · Adjustable</div>
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

          <label className="upload-card">
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" />
            <span className="upload-icon">+</span>
            <span><strong>添加商品图片</strong><small>首版可直接使用右侧演示 SKU</small></span>
          </label>

          <div className="field-grid">
            <label>商品名称<input name="productName" defaultValue="折叠式铝合金手机支架" required /></label>
            <label>材质<input name="material" defaultValue="铝合金 + 硅胶防滑垫" required /></label>
            <label>尺寸<input name="dimensions" defaultValue="折叠后 14 × 7.5 × 2.5 cm" required /></label>
            <label>颜色<input name="color" defaultValue="银色" required /></label>
            <label className="wide">兼容范围<input name="compatibility" defaultValue="4-12.9 英寸手机和平板" required /></label>
            <label className="wide">核心卖点<textarea name="features" defaultValue="角度可调；可折叠便携；底座稳定；充电不挡线" required /></label>
          </div>

          <button className="primary-button" type="submit">
            {generated ? "重新生成演示上新包" : "生成上新包"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">不会生成输入中没有的认证、销量、排名或功效信息。</p>
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
            <div className="result-content">
              <article className="result-block">
                <span className="result-label">Amazon Title</span>
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
                  <strong>3 项通过 · 1 项待确认</strong>
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
