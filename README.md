# ListingReady

> 最新状态（2026-09-10）：68 项测试、类型检查和生产构建通过。新增用途泛化与颜色选择承诺检查。私有站点已更新并完成真实文本调用，但人工发现的语义遗漏仍需修正；最新发布/复检状态以 [定时续做与发布记录](docs/2026-09-10_定时续做与发布记录.md) 为准。图片保真、复制与下载落盘仍未完整验收。

> 小宋1021队 · AI+跨境黑客松 · AI 智能上新

ListingReady 是面向中小跨境卖家的可信 AI 上新工作台。输入有来源的商品事实，生成带事实引用的 Amazon 美国站英文草稿，检查风险，再由卖家复核导出。支持多品类资料；桌面收纳盒只是其中一个案例。

## 当前本地已实现

- 13 项通用事实，支持已确认 / 待确认 / 已否定 / 不适用及来源说明；仅 AI 推断的内容不可成为证据。
- 仅发送可用的已确认事实到比赛 Token Plan。
- 生成标题、Item Highlights、卖点、描述和搜索词，每段带可查看和修改的事实引用。
- 独立程序检查数字、单位、部分材质和功能词、引用、宣传用语及长度。
- 首次生成有阻断问题时，最多自动修订一次；仍有风险会展示并拦截复核导出。
- 手工修改与免费重检、风险定位、完整的新旧文案及引用对照，资料修改后旧结果失效。
- 两个案例：照片人工整理的收纳盒；品牌官网资料的厨房擦拭巾。
- 分段复制、准备含事实和风险报告的 JSON、完整内容预览及保存链接；服务端再次检查复核导出条件。文件准备成功不代表实际落盘。
- 上传已授权参考图，经比赛图像接口尝试生成营销场景素材；与原图并排复核，只有当前图片加载成功后才可勾选外观复核。

未接入 AI 图片识别或 Amazon 自动发布。场景图接口已打通，但 v1–v3 实测仍出现部件、视角或标签变化，不承诺商品保真，不可作为实拍或 Amazon 主图。事实引用来自模型，规则检查覆盖有限，需人工复核。官网示例不代表用户实际货品或品牌授权。

## 验收与发布边界

- 历史提示词 v3 的连续 10 次结构化文本请求为 10/10 成功，共 13 次物理调用，不能解释为事实准确率 100%，也不是新提示词 v4 的连续测试。
- 当前文本提示词：facts-only.v5.2026-09-10；风险规则：amazon-us-non-media-2026-09-10.v5；图片提示词：reference-preserving.v3.2026-09-09。
- 自动化测试通过不等于全部用户流程已验收。复制的实际粘贴、下载文件落盘、新图片复核门槛的浏览器事件仍待补验。
- [线上体验](https://listingready-demo.coral-rose-4718.chatgpt.site/) 仍为本人私有，未向评委开放；浏览器需登录。线上版本和源码对应关系见最新发布记录，原 GitHub 推送目前受连接权限阻挡。
- 当前无数据库；刷新会丢失未保存的会话，图片链接可能过期。模型元数据和人工复核声明未经服务端签名。

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
TOKEN_PLAN_IMAGE_MODEL=qwen-image-2.0
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
- `POST /api/generate-scene`：已授权参考图与已确认外观资料 → 实验性场景图片；不自动重试。

详细数据结构、错误码、边界、测试与下一步请看 [9 月 7 日开发交接](docs/2026-09-07_核心闭环开发记录.md) 和 [复赛任务日志](docs/ListingReady_复赛开发任务日志.md)。

## 规则与来源

当前非媒体类标题上限为 75 字符，Item Highlights 为 125 字符；引用 [Amazon 官方 2026 年通知](https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470)。规则是版本化的通用检查，不保证满足所有类目政策。

厨房案例来自 [IKEA RINNIG 官网](https://www.ikea.com/us/en/p/rinnig-dish-towel-white-dark-gray-patterned-20476346/)，核对日期 2026-09-07；保留原始参数和出处，不使用评论来证明性能。

## English

ListingReady helps cross-border sellers turn confirmed product facts into a reviewable Amazon US listing. It supports multiple categories, fact sources, AI copy with citations, deterministic checks, editing, comparisons and export gates. Scene generation is experimental: product fidelity has not passed acceptance. Citations and images require human review. Image recognition and automatic marketplace publishing are not implemented. The hosted demo remains owner-private; see the latest deployment log for its exact source version and remaining acceptance gaps.
