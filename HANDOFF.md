# ListingReady 工作交接

最后更新：2026-09-07

仓库：https://github.com/xiaosongxiaosong1111/listingready
分支：main

## 当前入口

**最新暂停点：先读 [工作状态与明日续接](docs/工作状态_明日续接.md)。2026-09-07 用户要求暂停；私有线上版已部署，线上真实生成 HTTP 200 已验证，明天再继续，不自动调用模型。**

先读 [本次开发记录](docs/2026-09-07_核心闭环开发记录.md)，再看 [详细复赛计划](docs/ListingReady_复赛开发任务日志.md)。早期任务日志保留讨论历史，不能把其中旧的未开始状态或旧规则当成当前事实。

## 当前已实现

通用商品事实表单 → 已确认事实过滤 → Token Plan 真实生成 → 独立规则检查 → 一次自动修订 → 人工编辑 / 重检 → 草稿和人工复核包导出。收纳盒和厨房毛巾均已完成本地真实 HTTP 测试。

架构仍为 Vinext / React / Cloudflare Worker，无数据库。使用 Node.js 24 运行测试。主业务集中于 lib/，3 个 API route 只负责 HTTP 适配；前端在 app/page.tsx，样式在 app/workbench.css。

## 接手时先做

1. 查看 git status，保留未提交的用户改动。
2. 确认本地 .env.local 存在且被忽略，不要输出密钥。
3. 运行 npm run typecheck、npm run test:unit、npm test。
4. 启动 npm run dev。真实模型测试需要显式 RUN_LIVE_TESTS=1，会消耗额度。
5. 先走厨房毛巾案例，再走资料不完整的收纳盒案例。
6. 不要把 AI 图片识别、场景图、自动上架或完整合规审核写成已完成。

## 下一步

优先完成 AI 场景图最小链路、工作台交互打磨、评委访问方式、复赛 PDF 和演示视频。正文规则不可只依赖模型自评。公网开放前需要访问与额度控制；目前只准备本人私有测试方式。实际托管结果和验收详情见开发记录。

## 密钥

Key 只在已忽略的本地 .env.local、GitHub 加密 Secret 及对应托管 Secret 中使用。不要上传明文。默认 TOKEN_PLAN_MODEL=qwen3.6-flash，专属地址见 .env.example。GitHub Secret 不等于 Sites runtime Secret。

## 已知边界

规则词典覆盖有限；事实来源是用户声明，链接不会自动读取。原始照片是人工整理，未做 AI 识别。内存状态刷新丢失，导出可用于本地保留。模型记录由浏览器保存，没有服务端签名。所有输出仍需卖家人工核对。
