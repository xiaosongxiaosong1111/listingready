"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import "./organizer.css";

const listing = {
  title:
    "Slim Desk Drawer Organizer, Pull-Out Storage Box for Pens, Cards and Small Office Supplies",
  bullets: [
    "Flexible placement: real photos show individual drawer units placed side by side and arranged vertically.",
    "Pull-out access: the semicircle front cutout provides a simple grip for opening each drawer.",
    "Small-item organization: photographed holding pens, markers, cards, wallets, and other desk essentials.",
    "Slim white profile: photographed beneath a desk shelf and in a vertical arrangement.",
    "Verify before publishing: material, dimensions, pack quantity, weight, and load capacity still require confirmation.",
  ],
  description:
    "A slim drawer organizer shown in real use with stationery, cards, wallets, and small desk items. The real photos show individual white drawer units placed side by side beneath a shelf and arranged vertically. This draft intentionally omits material, dimensions, pack quantity, weight, load, and locking-stack claims until the seller confirms them.",
  searchTerms:
    "slim desk drawer organizer pull out storage box stationery cards office supplies",
  checks: [
    { label: "标题长度", detail: "不超过 200 字符，符合演示规则", tone: "pass" },
    { label: "照片证据", detail: "白色、单格抽屉、横排与垂直叠放场景均来自真实照片", tone: "pass" },
    { label: "夸张宣传", detail: "未使用 best、No.1、100% 等无依据词语", tone: "pass" },
    { label: "参数待确认", detail: "材质、尺寸、套装数量、重量、承重与锁定式堆叠结构尚待确认", tone: "warn" },
  ],
};

const copyText = [
  "[DRAFT FROM REAL PHOTOS — VERIFY PARAMETERS BEFORE PUBLISH]",
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
  const [notice, setNotice] = useState("3 张实拍来源的 AI 净化图已接入 · 暂未接入百炼 API");

  function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerated(true);
    setNotice("照片证据草稿已生成 · 参数待确认");
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
      [JSON.stringify({ source: "ai_cleaned_user_photos", verified: false, warning: "DRAFT FROM REAL PHOTOS — VERIFY PARAMETERS BEFORE PUBLISH", marketplace: "Amazon US", photoEvidence: ["scene-horizontal.png", "scene-stacked.png", "scene-drawers-open.png"], listing }, null, 2)],
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

        <div className="product-stage" aria-label="真实商品照片">
          <span className="demo-label">AI CLEANED · 源自实物照片</span>
          <div className="product-photo-grid">
            <img className="product-photo product-photo-main" src="/product/scene-horizontal.png" alt="由实拍图净化生成的四个白色抽屉盒横向排列商品图" />
            <img className="product-photo product-photo-stacked" src="/product/scene-stacked.png" alt="由实拍图净化生成的三个白色抽屉盒垂直叠放商品图" />
            <div className="product-photo-frame"><img className="product-photo product-photo-open" src="/product/scene-drawers-open.png" alt="由实拍图净化生成的抽屉打开收纳文具场景图" /></div>
          </div>
          <div className="stage-note">REAL-PHOTO SOURCE · AI-CLEANED · 3 IMAGES</div>
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
            <span className="upload-icon" aria-hidden="true">✓</span>
            <span><strong>3 张 AI 净化商品图已接入</strong><small>均以真实商品照片为来源，已移除家庭环境、标签与第三方物品</small></span>
          </div>

          <div className="field-grid">
            <label>商品名称<input name="productName" defaultValue="窄型抽屉收纳盒（照片展示横排与叠放）" required readOnly /></label>
            <label>材质<input name="material" defaultValue="待确认（照片无法判断）" required readOnly /></label>
            <label>尺寸<input name="dimensions" defaultValue="待测量" required readOnly /></label>
            <label>颜色<input name="color" defaultValue="白色（照片可见）" required readOnly /></label>
            <label className="wide">结构规格<input name="structure" defaultValue="独立单格抽屉；照片展示横排与垂直叠放，锁定结构待确认" required readOnly /></label>
            <label className="wide">核心卖点<textarea name="features" defaultValue="半圆拉手；照片展示横排/叠放；适合文具、卡片、钱包和小物" required readOnly /></label>
          </div>

          <button className="primary-button" type="submit">
            {generated ? "重新生成演示上新包" : "生成上新包"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="form-note">图片由实拍素材 AI 净化；当前仍是参数待确认草稿，禁止直接发布。</p>
        </form>

        <section className="panel output-panel">
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
                <span className="result-label">Amazon Title · 实拍来源草稿</span>
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
          <p className="notice" aria-live="polite">{notice}</p>
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
