# ListingReady

> 小宋1021队｜AI+跨境黑客松｜AI 智能上新

[中文](#中文) · [English](#english)

## 中文

ListingReady 是一个跨境商品本地化上新助手。它把中文商品资料转换成可检查的 Amazon 美国站 Listing，帮助卖家在发布前发现参数缺失、事实不一致和潜在合规风险。

当前演示商品为可堆叠抽屉式桌面收纳盒。

### 功能

- 输入中文商品图片和参数
- 生成英文标题、五点描述、详情描述和搜索词
- 检查事实一致性、夸张宣传及待确认字段
- 一键复制文案或下载 JSON 上新包
- 明确标注数据来源，避免把 AI 生成内容直接当作商品事实

### 当前状态

当前版本使用只读、未验证的固定 Mock 数据，不需要 API Key，仅适合初赛演示和方案验证，不能直接作为商品发布资料。获得赛事提供的阿里云百炼 API Key/Credits 后，再接入真实模型生成能力。

### 本地运行

要求：Node.js 22.13.0 或更高版本。

```bash
git clone https://github.com/xiaosongxiaosong1111/listingready.git
cd listingready
npm install
npm run dev
```

常用命令：

```bash
npm run build
npm test
npm run lint
```

### 参赛方案

ListingReady 聚焦“翻译之后、发布之前”的关键环节：先整理可信的商品事实，再生成本地化 Listing，最后提示卖家补充缺失参数并确认风险。首版只支持 Amazon 美国站和单个演示商品，以最小可用产品验证完整上新流程。

## English

ListingReady is an AI-assisted product localization tool for cross-border sellers. It turns Chinese product information into a reviewable Amazon US listing and flags missing specifications, factual inconsistencies, and potential compliance risks before publication.

The current demo uses a stackable desktop drawer organizer as the sample product.

### Features

- Accepts Chinese product images and specifications
- Generates an English title, five bullet points, product description, and search terms
- Checks factual consistency, exaggerated claims, and fields requiring confirmation
- Copies the listing text or downloads a JSON listing package
- Labels the data source so AI-generated copy is not mistaken for verified product facts

### Current Status

The current version uses read-only, unverified mock data and requires no API key. It must not be used as publish-ready product information. It is intended for the preliminary competition demo and concept validation. Alibaba Cloud Model Studio/Bailian integration will be added after the competition API key or credits are granted.

### Run Locally

Requirement: Node.js 22.13.0 or later.

```bash
git clone https://github.com/xiaosongxiaosong1111/listingready.git
cd listingready
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm test
npm run lint
```

### Competition Proposal

ListingReady focuses on the critical step between translation and publication. It structures trusted product facts, generates a localized listing, and asks the seller to confirm missing details and possible risks. The MVP supports one demo product for Amazon US to validate the complete listing workflow with the smallest practical scope.
