# ListingReady

> 小宋1021队 · AI+跨境黑客松 · AI 智能上新

ListingReady 是面向中小跨境卖家的可信 AI 上新工作台。输入有来源的商品事实，生成带事实引用的 Amazon 美国站英文草稿，检查风险，再由卖家复核导出。支持多品类资料；桌面收纳盒只是其中一个案例。

## 当前可用

- 13 项通用事实，支持已确认 / 待确认 / 不适用及来源说明。
- 仅发送可用的已确认事实到比赛 Token Plan。
- 生成标题、Item Highlights、卖点、描述和搜索词，每段带可查看和修改的事实引用。
- 独立程序检查数字、单位、部分材质和功能词、引用、宣传用语及长度。
- 首次生成有阻断问题时，最多自动修订一次；仍有风险会展示并拦截复核导出。
- 手工修改与免费重检，资料修改后旧结果失效。
- 两个案例：照片人工整理的收纳盒；品牌官网资料的厨房擦拭巾。
- 复制草稿、下载含事实和风险报告的 JSON；服务端再次检查复核导出条件。

当前未接入 AI 图片识别、场景图生成或 Amazon 自动发布。事实引用来自模型，规则检查覆盖有限，需人工复核。官网示例不代表用户实际货品或品牌授权。

## 运行

推荐 Node.js 24。保留现有 Vinext / React / Cloudflare 架构和 package-lock.json。

```bash
npm install
npm run dev
```

将 `.env.example` 复制为本地 `.env.local`，仅在本地文件或托管 Secret 中填写密钥：

```text
TOKEN_PLAN_API_KEY=replace-with-your-token-plan-key
TOKEN_PLAN_BASE_URL=https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
TOKEN_PLAN_MODEL=qwen3.6-flash
```

浏览器只请求本站后端。严禁把 Key 写入前端、README 或 Git。GitHub Secret 不会自动注入本机和托管平台。

```bash
npm run typecheck
npm run test:unit
npm test
npm run lint
```

默认测试不消耗 API 额度。启动开发服务后，可显式运行真实验证（会消耗额度）：

```powershell
$env:RUN_LIVE_TESTS='1'
npm run test:live
```

## API

- `POST /api/generate-listing`：ProductInput → GenerationResult。
- `POST /api/check-listing`：商品资料 + Listing → 独立 RiskReport。
- `POST /api/export-listing`：重新检查后导出草稿或人工复核包。

详细数据结构、错误码、边界、测试与下一步请看 [9 月 7 日开发交接](docs/2026-09-07_核心闭环开发记录.md) 和 [复赛任务日志](docs/ListingReady_复赛开发任务日志.md)。

## 规则与来源

当前非媒体类标题上限为 75 字符，Item Highlights 为 125 字符；引用 [Amazon 官方 2026 年通知](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)。规则是版本化的通用检查，不保证满足所有类目政策。

厨房案例来自 [IKEA RINNIG 官网](https://www.ikea.com/us/en/p/rinnig-dish-towel-white-dark-gray-patterned-20476346/)，核对日期 2026-09-07；保留原始参数和出处，不使用评论来证明性能。

## English

ListingReady helps cross-border sellers turn confirmed product facts into a reviewable Amazon US listing. It supports multiple product categories, explicit fact sources, AI-generated copy with citations, deterministic checks, manual editing, and export gates. Citations are proposed by the model and require human verification. Scene-image generation and automatic marketplace publishing are not implemented in this release.
