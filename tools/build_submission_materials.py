from __future__ import annotations

import json
import os
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image as RLImage, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "submission"
SLIDES = OUT / "video_slides"
OUT.mkdir(parents=True, exist_ok=True)
SLIDES.mkdir(parents=True, exist_ok=True)

FONT = Path(r"C:\Windows\Fonts\msyh.ttc")
BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")
pdfmetrics.registerFont(TTFont("YaHei", str(FONT), subfontIndex=0))
pdfmetrics.registerFont(TTFont("YaHeiBold", str(BOLD), subfontIndex=0))

PDF_PATH = OUT / "小宋1021队_ListingReady_复赛作品.pdf"
PHOTO = ROOT / "public" / "product" / "scene-horizontal.jpg"
SITE = "https://listingready-demo.coral-rose-4718.chatgpt.site/"
GITHUB = "https://github.com/xiaosongxiaosong1111/listingready"
AMAZON_RULE = "https://sellercentral.amazon.com/seller-forums/discussions/t/145b6d0f-999c-4555-896c-c694bda2e470"
IKEA_SOURCE = "https://www.ikea.com/us/en/p/rinnig-dish-towel-white-dark-gray-patterned-20476346/"
SUBMISSION_PHONE = os.getenv("LISTINGREADY_SUBMISSION_PHONE", "【填写联系电话】")
SUBMISSION_EMAIL = os.getenv("LISTINGREADY_SUBMISSION_EMAIL", "【填写联系邮箱】")

TEAM = {
    "团队名称": "小宋1021队",
    "队长姓名": "宋翔宇",
    "联系电话": SUBMISSION_PHONE,
    "联系邮箱": SUBMISSION_EMAIL,
    "全体成员": "宋翔宇 / 产品设计、全栈开发、AI 工作流与测试",
}

GREEN = colors.HexColor("#195B50")
GREEN_2 = colors.HexColor("#2F7D6E")
MINT = colors.HexColor("#EAF4F0")
PALE = colors.HexColor("#F6F8F7")
NAVY = colors.HexColor("#19324A")
GRAY = colors.HexColor("#5B666F")
LIGHT_GRAY = colors.HexColor("#D9D9D9")


class SubmissionDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(filename, pagesize=A4, leftMargin=17*mm, rightMargin=17*mm,
                         topMargin=18*mm, bottomMargin=17*mm, title="ListingReady 复赛作品")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=self._page))

    def _page(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("YaHei", 8)
        canvas.setFillColor(GRAY)
        if doc.page > 1:
            canvas.drawString(17*mm, 9*mm, "小宋1021队  ListingReady  复赛作品")
            canvas.drawRightString(A4[0] - 17*mm, 9*mm, f"第 {doc.page} 页")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CNTitle", fontName="YaHeiBold", fontSize=27, leading=36,
                          textColor=colors.black, alignment=TA_LEFT, spaceAfter=12))
styles.add(ParagraphStyle(name="CNSubtitle", fontName="YaHei", fontSize=12, leading=20,
                          textColor=GRAY, spaceAfter=16))
styles.add(ParagraphStyle(name="CNH1", fontName="YaHeiBold", fontSize=18, leading=26,
                          textColor=colors.black, spaceBefore=12, spaceAfter=9, keepWithNext=True))
styles.add(ParagraphStyle(name="CNH2", fontName="YaHeiBold", fontSize=13, leading=20,
                          textColor=colors.black, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="CNBody", fontName="YaHei", fontSize=10.5, leading=18,
                          textColor=colors.HexColor("#20282D"), spaceAfter=7))
styles.add(ParagraphStyle(name="CNSmall", fontName="YaHei", fontSize=8.5, leading=14,
                          textColor=GRAY, spaceAfter=5))
styles.add(ParagraphStyle(name="CNCenter", fontName="YaHei", fontSize=10, leading=16,
                          alignment=TA_CENTER, textColor=GRAY))
styles.add(ParagraphStyle(name="CNCell", fontName="YaHei", fontSize=9, leading=14,
                          textColor=colors.HexColor("#20282D")))
styles.add(ParagraphStyle(name="CNCellHead", fontName="YaHeiBold", fontSize=9, leading=14,
                          textColor=colors.white, alignment=TA_CENTER))


def P(text: str, style: str = "CNBody"):
    return Paragraph(text, styles[style])


def table(data, widths, header=True, aligns=None):
    rows = []
    for r, row in enumerate(data):
        rows.append([P(str(v), "CNCellHead" if header and r == 0 else "CNCell") for v in row])
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0,0), (-1,-1), 0.55, LIGHT_GRAY),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]
    if header:
        commands += [("BACKGROUND", (0,0), (-1,0), NAVY)]
        for r in range(1, len(rows)):
            if r % 2 == 0:
                commands.append(("BACKGROUND", (0,r), (-1,r), colors.HexColor("#F1F5F7")))
    if aligns:
        for i, a in enumerate(aligns): commands.append(("ALIGN", (i,0), (i,-1), a))
    t.setStyle(TableStyle(commands))
    return t


def info_table(items):
    data = [[P(k, "CNCell"), P(v, "CNCell")] for k, v in items]
    t = Table(data, colWidths=[35*mm, 123*mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.55, LIGHT_GRAY), ("BACKGROUND", (0,0), (0,-1), MINT),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("FONTNAME", (0,0), (0,-1), "YaHeiBold"),
        ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    return t


def bullet(text):
    return Paragraph("• " + text, ParagraphStyle(name="bullet"+str(abs(hash(text))), parent=styles["CNBody"],
        leftIndent=12, firstLineIndent=-10, spaceAfter=5))


def process_flow(labels):
    cells = []
    for i, label in enumerate(labels):
        cells.append(P(label, "CNCenter"))
        if i < len(labels)-1: cells.append(P("→", "CNCenter"))
    widths = []
    for i in range(len(cells)): widths.append(25*mm if i % 2 == 0 else 7*mm)
    t = Table([cells], colWidths=widths, hAlign="CENTER")
    cmds = [("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]
    for i in range(0, len(cells), 2):
        cmds += [("BACKGROUND", (i,0), (i,0), MINT), ("BOX", (i,0), (i,0), 0.8, GREEN)]
    t.setStyle(TableStyle(cmds))
    return t


story = []
story += [Spacer(1, 18*mm), P("AI+跨境黑客松巅峰赛", "CNSubtitle"),
          P("ListingReady 复赛作品", "CNTitle"),
          P("可信 AI 跨境上新工作台", "CNSubtitle"), Spacer(1, 7*mm)]
story.append(info_table(list(TEAM.items())))
story += [Spacer(1, 7*mm), info_table([
    ("参赛场景", "AI 智能上新"),
    ("方案名称", "ListingReady 可信 AI 跨境上新工作台"),
    ("一句话定义", "把有来源的商品事实转成可追溯、可修改、可人工复核的 Amazon 美国站英文 Listing 草稿。"),
])]
story += [Spacer(1, 10*mm), P("核心结论", "CNH2"),
          P("ListingReady 已完成可演示的文本主流程：事实确认、比赛模型生成、独立风险检查、人工改稿、新旧对照和受控导出。项目不自动补造未知参数，不把模型自评当作审核，也不自动发布到 Amazon。图片能力已接通，但仍作为需要逐图人工复核的实验功能。"),
          P("提交说明：演示站目前保持本人私有访问。评委访问方式与演示视频最终链接需在提交前补齐。", "CNSmall"),
          PageBreak()]

story += [P("一 业务价值与市场分析", "CNH1"), P("1.1 目标用户与业务痛点", "CNH2"),
          P("目标用户是准备 Amazon 美国站上新资料的中小跨境卖家和运营人员。原始资料常分散在供应商说明、商品包装、实物照片和官网页面中。直接使用通用对话工具时，运营仍需判断哪些句子来自原始事实，哪些只是模型根据品类习惯补出的假设。"),
          bullet("未知材质、尺寸、包装数量等参数容易被写成确定卖点。"),
          bullet("文案修改后，原事实、引用关系和风险结果容易脱节。"),
          bullet("生成结果缺少可追溯来源，团队复核成本高。"),
          bullet("图片模型可能改变商品结构、标签和视角，却容易被误当作真实商品素材。"),
          P("这些痛点是本项目的业务假设。当前尚未完成真实卖家访谈、客户签约或付费验证，因此不使用未经验证的市场规模、节省比例或收入数字。", "CNSmall"),
          P("1.2 应用场景与使用流程", "CNH2"),
          process_flow(["整理商品事实", "确认来源状态", "AI 生成英文文案", "独立规则检查", "人工修订复核"]),
          Spacer(1, 4*mm),
          P("运营先填写 13 项通用事实，并为每项选择来源与确认状态。系统只把有来源且已确认的事实发送给比赛模型，待确认、已否定和仅由 AI 推断的内容会被隔离。模型返回英文标题、Item Highlights、卖点、描述和搜索词后，程序独立检查数字、单位、部分材质与功能声明、引用、宣传词和长度。用户可以修改并免费重检，最后下载带事实、来源、引用和风险报告的资料包。"),
          P("1.3 商业价值与预期效果", "CNH2"),
          table([["预期价值", "如何实现", "验证指标"],
                 ["减少重复整理", "事实档案统一承载内容、状态和来源", "完成一份资料包的总时长"],
                 ["降低无依据声明风险", "模型约束与确定性规则分离", "无依据声明数量、人工修订次数"],
                 ["提高交接与复核效率", "文案、引用、风险和版本一起导出", "复核完成率、来源缺失数"],
                 ["保留人工决策", "复核声明必须由用户主动确认", "人工复核包导出完成率"]],
                [35*mm, 70*mm, 53*mm], aligns=["LEFT","LEFT","LEFT"]),
          Spacer(1, 3*mm),
          P("建议复赛后邀请 3-5 名目标用户，每人使用 3 个已授权商品，记录资料整理时间、修订次数、无依据声明数和导出完成率。没有对照数据前，不宣称“节省 50%”等结果。"),
          P("1.4 落地可行性", "CNH2"),
          P("项目从单一市场的上架前资料制作切入，不涉及选品预测、广告投放或平台账号操作。商业模式可先验证按商品资料包用量或团队订阅计费。规模化前需要补充账户权限、配额与成本控制、数据保存策略、多类目规则和真实用户研究。"),
          PageBreak()]

story += [P("二 产品功能与使用说明", "CNH1"), P("2.1 产品简介", "CNH2"),
          P("ListingReady 是一个多品类英文商品资料工作台。收纳盒只是资料缺失案例，厨房毛巾是官网资料完整案例；商品品类还支持办公文具、旅行用品、宠物用品及其他非媒体类商品。系统不做 AI 图片识别确认参数，不自动上架，也不保证覆盖所有平台政策。"),
          P("2.2 核心功能", "CNH2"),
          table([["功能", "当前实现", "用户得到什么"],
                 ["事实档案", "13 项通用事实、来源、确认状态", "未知信息显式暴露，不默认为事实"],
                 ["AI 文案", "比赛 Token Plan 生成五类英文内容", "每段带事实引用，便于核对"],
                 ["风险检查", "服务端独立规则与导出时复检", "定位风险并阻止不满足条件的复核包"],
                 ["修改对照", "编辑、免费重检、新旧版本对比", "看到文案和引用如何变化"],
                 ["资料导出", "JSON 完整包和 Markdown 审阅报告", "机器可读与人工阅读两种交付"],
                 ["场景图", "已授权参考图调用比赛图像模型", "实验性素材，必须逐图复核"]],
                [30*mm, 68*mm, 60*mm]),
          P("2.3 使用步骤", "CNH2"),
          bullet("打开工作台，选择案例或填写自己的商品。"),
          bullet("逐项核对事实内容、来源和确认状态；未知内容保持待确认。"),
          bullet("生成英文 Listing，展开每段事实引用并与原资料对照。"),
          bullet("查看风险面板；补事实或直接修改文案，再执行免费重检。"),
          bullet("确认当前文案与风险报告后，下载草稿 JSON 或 Markdown 报告。"),
          bullet("只有规则允许且用户本人完成复核，才准备人工复核包；这仍不代表 Amazon 审核通过。"),
          P("演示地址", "CNH2"),
          P(f'<link href="{SITE}" color="#195B50">{SITE}</link>'),
          P("当前访问状态：本人私有。提交前必须按组委会要求提供评委可访问方式，或改用模板允许的本地打包材料。", "CNSmall")]

if PHOTO.exists():
    story += [Spacer(1, 4*mm), KeepTogether([
        RLImage(str(PHOTO), width=85*mm, height=42*mm, kind="proportional"),
        P("资料不完整的收纳盒案例：照片只能支持可见结构和颜色，不能证明材质、尺寸、承重或销售包装数量。", "CNCenter"),
    ])]

story += [P("三 技术架构及调用模型说明", "CNH1"), P("3.1 系统架构", "CNH2"),
          process_flow(["React 工作台", "Vinext API", "Token Plan 模型", "独立规则引擎", "人工复核与导出"]),
          Spacer(1, 5*mm),
          P("浏览器只请求本站后端。服务端校验并归一化商品事实后，把允许使用的已确认事实发送到比赛专属接口。模型结果先经过结构解析，再由独立规则引擎检查；导出接口会重新计算风险，不相信浏览器传来的“已通过”标记。当前无数据库，刷新会丢失未下载的会话内容。"),
          P("3.2 调用的阿里云模型", "CNH2"),
          table([["模型标识", "用途", "调用方式与控制"],
                 ["qwen3.6-flash", "英文 Listing 文案生成与最多一次风险修订", "Token Plan OpenAI 兼容 chat/completions；密钥仅在服务端"],
                 ["qwen-image-2.0", "已授权参考图的实验性营销场景编辑", "专属多模态接口；失败不自动重试"],
                 ["qwen-image-2.0-pro", "图像保真对比实验", "仅做过有限验证，不作为保真通过证明"]],
                [38*mm, 58*mm, 62*mm]),
          P("3.3 技术组件", "CNH2"),
          table([["模块", "技术", "边界"],
                 ["前端", "React、TypeScript、Vinext", "表单、文案编辑、风险定位、对照和导出预览"],
                 ["后端", "Vinext API、Cloudflare Worker", "四个 POST 路由；无多租户账户系统"],
                 ["校验", "确定性 TypeScript 规则", "不是完整语义审核或平台审批"],
                 ["数据", "请求内处理、浏览器会话、用户下载", "无数据库、无向量库、无长期商品库"],
                 ["安全", "本地环境文件与托管 Secret", "API Key 不进入前端、导出包或 Git"]],
                [28*mm, 62*mm, 68*mm]),
          P("3.4 API 路由", "CNH2"),
          bullet("POST /api/generate-listing：事实资料生成英文 Listing 和风险报告。"),
          bullet("POST /api/check-listing：不消耗模型额度，对当前文案重新检查。"),
          bullet("POST /api/export-listing：服务端复检后生成草稿或人工复核包。"),
          bullet("POST /api/generate-scene：已授权参考图生成实验性场景素材。"),
          PageBreak()]

story += [P("四 项目开发及阶段成果", "CNH1"), P("4.1 已完成成果", "CNH2"),
          bullet("文本提示词 facts-only.v6.2026-09-14；风险规则 amazon-us-non-media-2026-09-14.v6。"),
          bullet("事实状态隔离、每段引用、人工编辑、免费重检、风险定位、新旧对照和受控导出已实现。"),
          bullet("新增 JSON 完整包与 Markdown 审阅报告；导出内容保留事实来源和风险。"),
          bullet("私有演示站已发布，与源码提交 efbc413f6f01b373bcb7081e8c3c960e0075bbef 对应。"),
          P("4.2 验收证据", "CNH2"),
          table([["证据", "结果", "正确解释"],
                 ["自动化测试", "68 项核心/工作台/图片测试 + 4 项生产 Worker 测试通过", "共 72 项，不等于零业务风险"],
                 ["生产构建", "类型检查和 Vinext 生产构建通过", "说明当前源码可构建"],
                 ["密钥扫描", "97 个当前文件、180 个可达 Git 对象无密钥命中", "不等于第三方平台安全认证"],
                 ["旧版稳定性", "v3 连续 10 次逻辑请求结构化成功，13 次物理调用", "不是 v6 准确率或事实正确率"],
                 ["收纳盒真实生成", "v5：28.574 秒、6923 tokens；发现 3 项新阻断", "反例推动取物效果规则修复"],
                 ["毛巾真实生成", "v6：24.266 秒、6549 tokens；人工改稿后规则 0 阻断 0 待复核", "仍需人工核对语义和品牌使用"]],
                [36*mm, 67*mm, 55*mm]),
          P("4.3 关键挑战与解决", "CNH2"),
          bullet("模型曾把“抽拉取物”扩写成“快速取物、不影响周围物品”。v6 增加专门提示和确定性拦截。"),
          bullet("颜色列表被扩写为 variations、available finishes。规则现区分描述颜色与商业可选款式。"),
          bullet("图片编辑会改变抽屉标签、视角或部件。系统把图片与文本解耦，并要求生成后逐图人工复核。"),
          bullet("浏览器显示“已准备”不能证明文件落盘。页面同时提供完整内容预览，并在说明中保留该验收边界。"),
          P("4.4 后续迭代", "CNH2"),
          P("优先开展真实卖家小样本试用；补充用户账户、持久化、配额与成本控制；扩展类目规则与语义评测集；图片优先采用保留原商品主体的可控营销排版，再把生成式重绘保留为实验路径。"),
          PageBreak()]

story += [P("五 提交物清单", "CNH1"),
          table([["状态", "提交物", "地址或说明"],
                 ["已完成", "项目开发及阶段成果说明", "本 PDF 第四部分"],
                 ["已完成", "技术架构及模型说明", "本 PDF 第三部分"],
                 ["已完成", "产品功能与使用说明", "本 PDF 第二部分"],
                 ["已准备", "可运行产品 Demo", SITE + "（当前本人私有，需补评委访问）"],
                 ["已准备", "本地源码包", "ListingReady_源码包.zip；不含 API Key 和 node_modules"],
                 ["提交前补齐", "3-5 分钟产品演示视频", "真实录屏操作文档与逐字稿已生成；视频需由队长按工作台真实流程录制并上传"],
                 ["可选", "GitCode 代码仓库", "未创建；原 GitHub 地址目前未完成最新推送"],
                 ["提交前确认", "截止时间", "模板写 9 月 15 日，原活动公告写 9 月 13 日，请向组委会确认"]],
                [25*mm, 51*mm, 82*mm]),
          Spacer(1, 5*mm),
          P("代码参考地址", "CNH2"), P(f'<link href="{GITHUB}" color="#195B50">{GITHUB}</link>'),
          P("注意：本地最新版尚未成功推回原 GitHub。提交前应恢复仓库凭据并核对远端提交，或根据模板使用 Demo/本地源码包验证。"),
          P("参考依据", "CNH2"),
          bullet(f'Amazon 非媒体类标题规则来源：<link href="{AMAZON_RULE}" color="#195B50">Amazon Seller Forums 官方通知</link>。'),
          bullet(f'厨房毛巾演示资料：<link href="{IKEA_SOURCE}" color="#195B50">IKEA RINNIG 官方商品页面</link>，核对日期 2026-09-07。'),
          P("提交前最终检查", "CNH2"),
          bullet("向组委会确认截止时间和材料入口。"),
          bullet("为评委提供实际可访问的 Demo 或按要求提交本地包。"),
          bullet("上传最终视频并把链接填入本 PDF。"),
          bullet("逐页检查 PDF，无密钥、无私人窗口截图、无未说明的模拟数据。"),
          bullet("保存提交表单回执；没有回执时不标记为提交成功。")]

doc = SubmissionDocTemplate(str(PDF_PATH))
doc.build(story)


SLIDE_DATA = [
    ("ListingReady", "可信 AI 跨境上新工作台", ["小宋1021队", "AI 智能上新", "复赛产品流程演示"],
     "大家好，我们是小宋1021队。我们的项目叫 ListingReady，是一个面向中小跨境卖家的可信 AI 上新工作台。它把有来源的商品事实，转成可以追溯、修改和人工复核的 Amazon 美国站英文 Listing 草稿。"),
    ("为什么要做", "通用生成工具缺少上架前的事实约束", ["资料分散：包装、供应商、照片、官网", "未知参数容易被写成确定卖点", "修改后事实、引用和风险容易脱节"],
     "跨境运营的原始资料常分散在包装、供应商说明、实物照片和品牌官网中。直接让通用模型写文案时，未知材质、尺寸和包装数量可能被写成确定卖点。运营还要自己追查每句话来自哪里。"),
    ("产品定位", "解决从商品事实到待发布资料包这一段", ["不做销量预测", "不代替平台审核", "不自动向 Amazon 上架", "重点是事实、风险和人工决策"],
     "ListingReady 聚焦从商品事实到待发布资料包这一段流程。它不做销量预测，不代替平台审核，也不自动发布。我们的核心价值，是把事实来源、AI 文案、风险检查和人工决策放进同一个工作台。"),
    ("核心工作流", "事实确认 → AI 生成 → 独立检查 → 人工复核", ["13 项通用事实", "只发送已确认且有来源的内容", "导出时服务端再次检查"],
     "用户先填写十三项通用商品事实，并为每项选择来源和确认状态。只有已经确认并且有来源说明的内容会进入比赛模型。模型生成之后，独立规则检查风险；导出时服务端还会再次检查。"),
    ("案例一：资料不完整", "收纳盒不是唯一品类，而是风险演示案例", ["照片可见：白色、抽屉结构、使用位置", "照片不能证明：材质、尺寸、承重、销售包装", "未知内容保留为待确认"],
     "第一个案例是桌面收纳盒。它只是资料不完整的演示，不代表系统只能处理收纳盒。照片能够支持颜色和可见结构，却不能证明材质、尺寸、承重和销售包装数量，所以这些项目会保持待确认。"),
    ("案例二：官网资料", "厨房毛巾完整走通文本主流程", ["100% cotton", "18 x 24 inches", "4 pack", "来源：IKEA 官方页面"],
     "第二个案例是厨房毛巾，资料来自公开官网。已确认内容包括百分之百棉、十八乘二十四英寸和四件装。系统生成标题、商品亮点、卖点、描述和搜索词，并为每一段附上事实引用。"),
    ("真实反例推动改进", "规则不能只测理想样本", ["快速取物：原事实没有速度证明", "不影响周围物品：属于额外效果", "颜色 variations：不等于买家可选款式"],
     "真实生成中，我们发现模型把抽拉取物扩写成快速取物和不影响周围物品，还把颜色列表写成可选变化。原资料并不能证明这些效果。我们把真实反例加入规则和测试，而不是只展示漂亮的成功样本。"),
    ("修改与重新检查", "人工改稿后免费重检，旧结果自动失效", ["风险定位到具体文案和事实", "显示新旧文案与引用变化", "不满足条件时禁止复核包"],
     "风险面板会定位到具体文案和相关事实。运营可以补充资料，或者直接修改文案，再执行不消耗模型额度的重新检查。事实或文案改变后，旧导出链接会失效；不满足条件时，人工复核包按钮保持禁用。"),
    ("两种导出", "机器可读 JSON + 人工可读 Markdown", ["保留当前文案", "保留全部事实、来源和状态", "保留风险报告和生成记录", "人工复核必须由用户本人确认"],
     "最终可以导出机器可读的 JSON 完整包，也可以生成适合团队审阅的 Markdown 报告。资料包保留当前文案、全部事实与来源、风险报告和生成记录。人工复核声明必须由用户本人确认。"),
    ("图片能力的边界", "接口已接通，但不把生成成功等同于商品保真", ["模型可能改变部件、标签和视角", "图片失败不清空文本结果", "当前定位：实验功能，逐图人工复核"],
     "图片接口已经接通，但我们没有把接口成功包装成商品保真。现有生成图仍可能改变部件、标签和视角。图片失败不会影响已经生成的文本，而且每张图片都必须与原图逐项人工核对。"),
    ("当前验证结果", "72 项自动测试通过，真实模型调用覆盖两类商品", ["68 项核心、工作台和图像测试", "4 项生产 Worker 路由测试", "类型检查与生产构建通过", "密钥未进入前端、导出或 Git"],
     "当前共有七十二项自动测试通过，包括六十八项核心、工作台和图像测试，以及四项生产 Worker 路由测试。类型检查和生产构建通过，密钥扫描没有发现源码或 Git 历史泄漏。测试通过不等于所有语义都准确，所以仍保留人工复核。"),
    ("下一步", "从可演示原型走向真实卖家验证", ["3-5 名卖家 × 每人 3 个商品", "记录总时长、修订次数和遗漏问题", "补账户、持久化、配额与类目规则", "ListingReady · 让每句卖点回到事实"],
     "下一步，我们计划邀请三到五名目标卖家，每人使用三个已授权商品，记录完整资料准备时间、修订次数和遗漏问题。同时补充账户、数据保存、配额控制和更多类目规则。ListingReady 的目标很简单：让每一句卖点，都能回到事实。谢谢。"),
]


def font(size, bold=False):
    return ImageFont.truetype(str(BOLD if bold else FONT), size=size, index=0)


def wrap(draw, text, ft, width):
    lines, cur = [], ""
    for ch in text:
        test = cur + ch
        if draw.textbbox((0,0), test, font=ft)[2] > width and cur:
            lines.append(cur); cur = ch
        else: cur = test
    if cur: lines.append(cur)
    return lines


GENERATE_STORYBOARD = False  # User requires a real UI recording, not a simulated slide video.
for idx, (title, subtitle, points, narration) in (enumerate(SLIDE_DATA, 1) if GENERATE_STORYBOARD else []):
    im = Image.new("RGB", (1920,1080), "#F5F8F7")
    draw = ImageDraw.Draw(im)
    draw.rounded_rectangle((85,70,1835,1010), radius=42, fill="#FFFFFF", outline="#DCE7E3", width=3)
    draw.rounded_rectangle((85,70,320,155), radius=22, fill="#195B50")
    draw.text((125,91), f"{idx:02d} / {len(SLIDE_DATA):02d}", font=font(30,True), fill="white")
    draw.text((150,220), title, font=font(78,True), fill="#152C2A")
    for line_no, line in enumerate(wrap(draw, subtitle, font(37), 1550)):
        draw.text((155,330 + line_no*58), line, font=font(37), fill="#4A625D")
    start_y = 475
    for p_i, point in enumerate(points):
        y = start_y + p_i*115
        draw.ellipse((155,y+8,177,y+30), fill="#2F7D6E")
        for l_i, line in enumerate(wrap(draw, point, font(34), 1380)):
            draw.text((205,y + l_i*50), line, font=font(34), fill="#263633")
    draw.text((150,930), "ListingReady  ·  小宋1021队  ·  AI 智能上新", font=font(25), fill="#6A7774")
    if idx == 5 and PHOTO.exists():
        pic = Image.open(PHOTO).convert("RGB")
        pic = ImageOps.fit(pic, (480,300), method=Image.Resampling.LANCZOS)
        im.paste(pic, (1290,580))
        draw.rounded_rectangle((1288,578,1772,882), radius=18, outline="#195B50", width=4)
    im.save(SLIDES / f"slide-{idx:02d}.png", quality=95)

(OUT / "narration.json").write_text(json.dumps([
    {"slide": i+1, "title": x[0], "narration": x[3]} for i,x in enumerate(SLIDE_DATA)
], ensure_ascii=False, indent=2), encoding="utf-8")

data = {
    "team": {"name":"小宋1021队","leader":"宋翔宇","phone":SUBMISSION_PHONE,"email":SUBMISSION_EMAIL,"members":[{"name":"宋翔宇","roles":["产品设计","全栈开发","AI 工作流","测试"]}]},
    "submission": {"scenario":"AI 智能上新","solution":"ListingReady 可信 AI 跨境上新工作台","pdf":PDF_PATH.name,"video":"待队长按真实工作台流程录制并上传","durationTarget":"3-5 分钟","demoUrl":SITE,"demoAccess":"owner-private; 提交前需提供评委访问方式"},
    "versions": {"textPrompt":"facts-only.v6.2026-09-14","riskRules":"amazon-us-non-media-2026-09-14.v6","imagePrompt":"reference-preserving.v3.2026-09-09","sourceCommit":"efbc413f6f01b373bcb7081e8c3c960e0075bbef"},
    "evidence": {"automatedTests":72,"unitWorkflowImageTests":68,"productionWorkerTests":4,"realOrganizer":{"promptVersion":"v5","durationMs":28574,"totalTokens":6923,"newBlocksFound":3},"realTowel":{"promptVersion":"v6","durationMs":24266,"totalTokens":6549,"afterHumanEdit":{"block":0,"warn":0,"pass":5}}},
    "pendingBeforeSubmission": ["确认最终截止时间","提供评委可访问方式","上传最终视频并填写链接","队长本人完成人工复核声明","保存提交回执"],
    "imageBoundary":"图像接口已接通但商品保真未通过；只作为逐图人工复核的实验功能。",
}
(OUT / "ListingReady_提交基础数据.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

lines = ["# ListingReady 复赛演示视频逐字稿", "", "建议时长 3-5 分钟。以下文字用于配合真实工作台录屏讲解，不用于生成模拟界面视频。"]
for i,(title,_,_,narration) in enumerate(SLIDE_DATA,1):
    lines += ["", f"## {i:02d} {title}", "", narration]
(OUT / "ListingReady_演示视频逐字稿.md").write_text("\n".join(lines)+"\n", encoding="utf-8")

ops = """# ListingReady 最终录屏操作文档

本项目不生成模拟界面或幻灯片式演示视频。正式提交视频应全程以真实工作台操作为主，控制在 3-5 分钟。

## 录制前

1. 打开工作台，关闭邮件、聊天通知和含隐私的窗口。不要打开 `.env.local`、终端环境变量或任何密钥页面。
2. 浏览器缩放建议 90%-100%，确保事实表、文案和风险面板清晰。
3. 先做一次接口预检；如现场额度异常，使用已生成结果回放，并在画面标注“此前真实验收结果”。
4. 准备空白文本编辑器和下载目录，用于证明复制和文件落盘。

## 4 分钟操作顺序

- 00:00-00:25：介绍团队、目标用户和一句话价值。
- 00:25-00:55：载入厨房毛巾案例，展开材质、尺寸和来源。
- 00:55-01:25：点击生成，展示标题、卖点、描述、搜索词与事实引用。等待过程可以剪辑，但要标注。
- 01:25-02:00：在描述中手工加入 `waterproof`，明确说这是演示注入，不是模型原始输出；点击重新检查并展示风险定位。
- 02:00-02:30：删除错误词，重新检查；展示新旧文案与引用对照。
- 02:30-03:05：下载草稿 JSON 和 Markdown 报告；真正打开文件，核对草稿状态、事实来源和风险报告。
- 03:05-03:30：切换到收纳盒，说明照片不能证明材质、尺寸、承重和包装数量。
- 03:30-03:50：展示图片实验区，说明保真未通过，不把生成图当实拍证据。
- 03:50-04:00：总结事实约束、独立检查、人工复核和受控导出。

## 必须由队长完成

检查最终英文文案和引用后，队长本人决定是否勾选“我已对照原始商品资料，人工检查全部文案与引用”。不要为了录制强行勾选。评委访问授权、视频上传和比赛表单提交也应由队长确认。

## 导出与上传

建议使用 1080p、30fps、H.264 视频，声音峰值约 -3 dB，字幕保持在画面底部安全区。上传 B 站或 CSDN 后，用无痕窗口检查链接可访问，再把链接填入 PDF 和提交表单。保存原始 MP4、字幕、PDF 和源码包。
"""
(OUT / "ListingReady_最终录屏操作文档.md").write_text(ops, encoding="utf-8")

readme = f"""# ListingReady 复赛提交包

已生成：

- `{PDF_PATH.name}`：按官方模板结构整理的 PDF。
- `ListingReady_演示视频逐字稿.md`：真实工作台录屏的逐段讲解文字。
- `ListingReady_最终录屏操作文档.md`：录制真实工作台操作的方法。
- `ListingReady_提交基础数据.json`：团队、版本、测试和待办的结构化基础数据。
- `ListingReady_源码包.zip`：当前 Git 提交的源码快照，不含密钥、依赖和构建产物。

提交前仍需：确认最终截止时间；处理评委访问；上传视频并填写链接；队长本人复核文案；保存提交回执。
"""
(OUT / "README.md").write_text(readme, encoding="utf-8")

print(json.dumps({"pdf":str(PDF_PATH),"pagesContent":"complete","storyboardSlides":0,"output":str(OUT)},ensure_ascii=False))
