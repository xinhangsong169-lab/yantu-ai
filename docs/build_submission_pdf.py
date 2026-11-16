#!/usr/bin/env python3
"""省赛技术文档。"""

from pathlib import Path

from reportlab.lib.colors import Color, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, ListFlowable, ListItem, HRFlowable, Image,
)

pdfmetrics.registerFont(TTFont("Hei", "/System/Library/Fonts/STHeiti Medium.ttc", subfontIndex=1))
pdfmetrics.registerFont(TTFont("Song", "/System/Library/Fonts/STHeiti Light.ttc", subfontIndex=1))

INK = Color(0.12, 0.16, 0.15)
GREEN = Color(0.19, 0.36, 0.29)
PALE = Color(0.91, 0.95, 0.92)
LINE = Color(0.76, 0.82, 0.78)
MUTED = Color(0.33, 0.38, 0.36)

DOCS = Path(__file__).resolve().parent
OUT = DOCS / "研途AI-省赛技术文档.pdf"


def styles():
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", fontName="Song", fontSize=11, leading=16, textColor=GREEN, alignment=TA_CENTER),
        "cover_title": ParagraphStyle("cover_title", fontName="Hei", fontSize=28, leading=36, textColor=INK, alignment=TA_CENTER, spaceAfter=6),
        "cover_sub": ParagraphStyle("cover_sub", fontName="Song", fontSize=13, leading=20, textColor=INK, alignment=TA_CENTER),
        "h1": ParagraphStyle("h1", fontName="Hei", fontSize=15, leading=22, textColor=GREEN, spaceBefore=12, spaceAfter=6),
        "h2": ParagraphStyle("h2", fontName="Hei", fontSize=12.5, leading=18, textColor=INK, spaceBefore=9, spaceAfter=4),
        "body": ParagraphStyle("body", fontName="Song", fontSize=10.5, leading=17, textColor=INK, alignment=TA_LEFT, spaceAfter=6),
        "note": ParagraphStyle("note", fontName="Song", fontSize=9.5, leading=15, textColor=MUTED, alignment=TA_CENTER, spaceAfter=4),
        "cell": ParagraphStyle("cell", fontName="Song", fontSize=9, leading=13, textColor=INK),
        "cell_h": ParagraphStyle("cell_h", fontName="Hei", fontSize=9, leading=13, textColor=INK),
        "toc": ParagraphStyle("toc", fontName="Song", fontSize=11, leading=18, textColor=INK),
        "cap": ParagraphStyle("cap", fontName="Song", fontSize=9, leading=13, textColor=MUTED, alignment=TA_CENTER, spaceAfter=8),
    }


S = styles()


def P(text, style="body"):
    return Paragraph(text, S[style])


def bullet(items):
    flow = []
    for item in items:
        flow.append(ListItem(Paragraph(item, S["body"]), leftIndent=12, value="•"))
    return ListFlowable(flow, bulletType="bullet", start="•", leftIndent=16, bulletFontName="Song", bulletFontSize=10)


def shot(name, caption):
    path = str(DOCS / "figures" / name)
    img = Image(path, width=168 * mm, height=168 * mm * 900 / 1440)
    img.hAlign = "CENTER"
    return KeepTogether([img, Spacer(1, 1.5 * mm), Paragraph(caption, S["cap"])])


def table(headers, rows, col_widths):
    head = [Paragraph(h, S["cell_h"]) for h in headers]
    data = [head] + [[Paragraph(c, S["cell"]) for c in row] for row in rows]
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTNAME", (0, 0), (-1, 0), "Hei"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("BACKGROUND", (0, 1), (-1, -1), white),
    ]))
    return tbl


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
    canvas.setFont("Song", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 7 * mm, "研途 AI  ·  省赛技术文档")
    canvas.drawRightString(A4[0] - 18 * mm, 7 * mm, str(doc.page))
    canvas.restoreState()


def build():
    story = []
    story.append(Spacer(1, 28 * mm))
    story.append(P("全国高校 AI Web 开发挑战赛", "cover_kicker"))
    story.append(Spacer(1, 4 * mm))
    story.append(P("AI WEB 网页开发挑战赛", "cover_sub"))
    story.append(Spacer(1, 10 * mm))
    story.append(P("研途 AI", "cover_title"))
    story.append(P("省赛技术文档", "cover_sub"))
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="40%", thickness=1, color=GREEN, spaceBefore=2, spaceAfter=8, hAlign="CENTER"))
    story.append(P("面向硕士、博士的个人学术工作台", "cover_sub"))
    story.append(Spacer(1, 16 * mm))
    story.append(P("赛道页：https://www.boxuegu.com/matchTrack/detail/?id=10037", "note"))
    story.append(P("文档日期：2026 年 11 月 16 日", "note"))
    story.append(P("西安交通大学 · 软件工程 · 硕士研究生", "note"))
    story.append(P("队员：宋欣航、王渡云、朱柏鸿", "note"))
    story.append(P("指导老师：王迪、刘帅", "note"))
    story.append(PageBreak())

    story.append(P("目录", "h1"))
    for line in [
        "1  项目概述",
        "2  需求分析",
        "3  系统架构设计",
        "4  AI 技术方案",
        "5  功能流程与界面",
        "6  核心功能实现",
        "7  测试与部署",
        "8  创新点",
        "9  总结与展望",
    ]:
        story.append(P(line, "toc"))
    story.append(Spacer(1, 4 * mm))
    story.append(P("本文按赛道页公示的技术文档目录撰写，并增加一节界面流程。第 4 节写选型理由、集成方式和优化策略。第 8 节单独列出技术创新点和应用创新点。第 5 节的截图来自本机演示，不是示意图。", "body"))
    story.append(P("赛道页同时要求代码仓库和 5 至 8 分钟演示视频。在线演示是加分项。提交入口在缴费后的赛事个人中心。赛道页公示的报名和作品提交截止为 2026 年 11 月 18 日，以个人中心显示的时间为准。", "body"))

    story.append(P("1  项目概述", "h1"))
    story.append(P("1.1  作品是什么", "h2"))
    story.append(P("研途 AI 是给硕士研究生和博士研究生自己用的学术工作台。一个人在这里看今天要做的事，记课程，整理组会，记录科研，并查看还能投的实习、校招和国企、央企通知。没有导师端，也没有团队协作端。", "body"))
    story.append(P("课程、组会、科研和就业共用一份个人记忆。记忆可以查看、修改、停用和删除。停用或删除之后，后面的回答不再使用它。模型给出的任务和记忆，要经过用户确认才写入。", "body"))
    story.append(P("1.2  要解决的问题", "h2"))
    story.append(P("研究生的日程散在课表、组会记录、实验笔记和招聘公告里。把这些材料交给通用对话模型，容易出现三类问题：把没做过的实验说成有结果，把搜索摘要说成正在招聘的岗位，以及在不同页面里重复介绍研究方向。研途把事实和模型建议分开。事实来自用户写下的记录、上传的材料和可打开的来源页面。建议必须标出来源，缺的字段保持空白。", "body"))
    story.append(P("1.3  参赛信息", "h2"))
    story.append(table(
        ["项目", "内容"],
        [
            ["大赛", "全国高校 AI Web 开发挑战赛（传智杯）"],
            ["赛道", "AI WEB 网页开发挑战赛"],
            ["主题", "智启未来：AI 驱动的 Web 应用创新挑战"],
            ["作品形态", "Web 应用。浏览器打开，前后端都在本机或一台服务器上运行"],
            ["目标用户", "需要自行管理课程、组会、实验和求职的硕士与博士研究生"],
            ["代码仓库", "https://github.com/xinhangsong169-lab/yantu-ai"],
        ],
        [32 * mm, 140 * mm],
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(P("仓库提供源码、运行说明、测试脚本和技术文档。第 6 节列出主要接口和实现文件，可按项目路径直接定位。", "body"))

    story.append(P("2  需求分析", "h1"))
    story.append(P("2.1  使用者", "h2"))
    story.append(P("使用者是一名在读硕士或博士。典型一天是：看今天的课和最近的未完成任务，把组会里导师的原话收成待办，把本周实验照实记下来，再按自己的城市和研究方向看还能投什么。同一个人会在几个页面之间切换，不应该每次重新介绍专业、方向和城市。", "body"))
    story.append(P("2.2  功能需求", "h2"))
    story.append(table(
        ["页面", "用户要完成的事"],
        [
            ["工作台", "看到今天的课，以及日期最近的未完成任务。可以就手头的记录提问。"],
            ["课程", "用手写、ICS、CSV 或文字导入课表。图片里看不清的字段留空，不猜成绩比例和考勤。"],
            ["组会", "整理一段记录。确认后才写入任务和记忆。汇报和周报带上本周实验表。"],
            ["科研", "记课题事实和实验。文献放在课题里，可以选段提问。实验数字只照抄记录。"],
            ["就业", "按城市和方向筛选。实习和校招看来源接口。国企和央企看官网通知。"],
            ["任务", "课程、组会和科研的待办在同一份列表里，可以改日期和完成状态。"],
            ["记忆", "查看来源，停用或删除。停用后的内容不再进入后续回答。"],
        ],
        [28 * mm, 144 * mm],
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(P("2.3  约束", "h2"))
    story.append(bullet([
        "不编造岗位、公司、薪资、截止日期、论文题名和实验结果。空着的指标保持空白。",
        "演示数据必须标明演示。演示实验里的原话「还没有跑对照，不能说有没有提升」保持原句。",
        "文献由用户上传或从已有记录整理，不联网编造一篇论文。",
        "实习和校招与国企、央企分开。后者只使用国家大学生就业服务平台上还在有效期内的通知。",
        "模型密钥只放在服务端环境变量里，不进仓库、文档、视频和页面。",
        "重要写入要人确认。对话可以建议，不能自行把建议写成已完成的事实。",
    ]))

    story.append(PageBreak())
    story.append(P("3  系统架构设计", "h1"))
    story.append(P("3.1  总体结构", "h2"))
    story.append(P("浏览器里是一个 React 单页应用。开发时 Vite 把页面放在 5173 端口，并把 /api 转到本机 4320。生产构建后，同一个 Node 进程同时提供静态页面和 API。数据放在一个 SQLite 文件里。模型调用从服务端发出，浏览器看不到密钥。", "body"))
    story.append(table(
        ["层", "实现", "职责"],
        [
            ["前端", "React 19、TypeScript、Vite 6", "页面交互、工作区共享状态和 API 客户端"],
            ["后端", "Node.js 22、原生 HTTP、JSON API、SSE", "静态文件、业务路由、输入校验、确认写入及对话事件"],
            ["数据", "SQLite、node:sqlite", "本地持久化。跨记录写入用事务，按工作区与集合读取"],
            ["AI", "百炼兼容接口<br/>qwen-plus、qwen3-vl-plus", "文本对话与整理、课表图片识别。无密钥时文本走本地规则"],
            ["招聘", "Offer岛 API<br/>国家大学生就业服务平台", "按招聘类型检索并保留来源链接"],
            ["部署", "腾讯云轻量服务器<br/>Caddy、Docker", "演示实例由 Caddy 提供 HTTPS。仓库同时提供容器部署方案"],
        ],
        [22 * mm, 52 * mm, 98 * mm],
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(P("3.2  数据怎么流动", "h2"))
    story.append(P("用户已保存的材料进入 SQLite。组会原文也可先提交给分析接口生成草稿，审核后才与任务和记忆一起保存。保存时写入来源类型和来源记录。助手按页面选择现有记录和有效记忆来组织输入。", "body"))
    story.append(P("就业接口独立查询数据源并返回原链接。国企和央企通知按有效期过滤，查询失败时可使用上次仍有效的通知。", "body"))
    story.append(P("3.3  部署形态", "h2"))
    story.append(P("本地开发由 npm run dev 启动前端和 API。生产使用同源访问，部署步骤见第 7 节。", "body"))
    story.append(P("公网评审实例运行在北京的腾讯云轻量服务器上。Windows 上的计划任务启动 Node 应用，Caddy 提供 HTTPS 并转发到本机端口。2026 年 11 月 16 日已部署新版并核对前端文件和状态接口。仓库另提供 Docker 部署方式。免登录评审实例的访问者共用一份演示库。", "body"))

    story.append(P("3.4  选型理由与代码入口", "h2"))
    story.append(P("React 与 TypeScript 把课程、组会和科研界面各自组织成组件，跨页面共用工作区状态。Vite 提供开发代理与生产构建。后端采用 Node 原生 HTTP，生产只启动一个应用进程。SQLite 将个人工作区保存在本地文件中，省去单独运行数据库服务，并支持把确认后的多条记录一次写入。", "body"))
    story.append(P("从 src/App.tsx 进入页面，经 src/store.tsx 管理工作区状态，通过 src/api.ts 发起请求。server/local.mjs 接收请求，由 server/api.mjs 执行业务逻辑，再通过 server/local-db.mjs 持久化，或调用模型与外部检索服务。", "body"))
    story.append(P("对话接口先读取当前页面范围内的材料，再请求模型。浏览器通过 SSE 接收来源、可选日程和回答事件。文本模型返回完整回答后，后端按行推送给浏览器。组会分析和确认分别使用两个接口，只有确认接口写入 SQLite。", "body"))

    story.append(PageBreak())
    story.append(P("4  AI 技术方案", "h1"))
    story.append(P("4.1  选型理由", "h2"))
    story.append(P("作品需要两类模型能力。第一类是中文长文：组会记录、周报、科研对话和就业方向讨论。第二类是课表图片：从照片里抽出能看清的课程名、时间和地点。阿里云百炼提供与 OpenAI 兼容的对话接口，文本模型使用 qwen-plus，视觉模型使用 qwen3-vl-plus。接口在服务端调用，便于统一超时、错误提示和密钥隔离。", "body"))
    story.append(P("没有配置 DASHSCOPE_API_KEY 时，组会整理、论文摘录和对话改用本地规则，并在界面标明「本地整理」。本地规则只重组用户已经写下的句子，不假装已经调用云端模型。这样没有密钥的评审机器仍然能走完确认写入，同时不会把规则输出说成大模型结论。", "body"))
    story.append(P("招聘没有交给大模型现编。实习和校招走 Offer岛的检索接口。国企和央企走国家大学生就业服务平台的公开通知。模型只在已经返回的条目和用户档案之内讨论怎么选，不新增公司、岗位和截止日期。", "body"))
    story.append(P("4.2  集成方式", "h2"))
    story.append(bullet([
        "文本对话：服务端把仍有效的记忆、当前页面范围和用户原话组成消息，请求 qwen-plus。支持整段返回和流式返回。",
        "组会：模型先产出草稿。草稿里的任务带有摘自原文的依据。用户确认后，服务端才写入任务和记忆。",
        "课表图片：只接受 data:image 开头、大小受限的图片，交给 qwen3-vl-plus。看不清的字段必须是空字符串。",
        "就业：Offer岛按城市、研究方向关键词和「实习」或「校招」检索。技能只用于给已返回岗位做匹配提示，不参与放宽筛选。",
        "文献：用户上传 PDF 或粘贴文字。选中不少于 8 个字后，对话只根据这段原文说明能支持什么、不能支持什么。",
    ]))
    story.append(P("4.3  优化策略", "h2"))
    story.append(bullet([
        "先草稿、后确认。模型不能绕过确认直接改任务和记忆。",
        "空值保持空白。实验没有指标就不补 0。岗位没有薪资就不估算。",
        "来源可回溯。记忆记下 sourceType 和 sourceId。回答使用的记录可以在记忆抽屉里停用。",
        "失败可分辨。模型超时、Offer岛额度用尽、官网页面没读到，各自有明确句子，不改用另一类数据顶上。",
        "上下文有边界。对话只使用当前档案、当前页面记录和仍然有效的记忆，不把训练记忆里的招聘信息写进结果。",
        "调用有上限。文本请求设置超时和 max_tokens。图片大小在接口层拒绝。密钥只出现在服务端。",
    ]))

    story.append(P("5  功能流程与界面", "h1"))
    story.append(P("下面的界面截于 2026 年 11 月 16 日本机的演示档案「林同学」。当天是周一，所以本周实验列表是空的；11 月 10 日至 12 日的三条记录在「全部实验」里，并标明演示。顺序按页面上的实际操作来。", "body"))
    story.append(P("5.1  工作台：先看今天", "h2"))
    story.append(P("打开应用后先到工作台。右侧是今天的课和往后七天的课，中间可以就今天的安排提问。未完成任务按日期出现。演示任务在这一天已经勾成完成，所以工作台写明已经清空，并提示可以去组会或科研继续。", "body"))
    story.append(shot("01-workbench.png", "图 1  工作台。今天的课、七天课表和对话在同一屏。"))
    story.append(P("5.2  课程：从周课表到一门课", "h2"))
    story.append(P("课程页先给出周课表。点开一节课，下面展开教师、教室、周次、考勤、成绩构成和这门课带出的任务。考核文字来自已确认记录。导入支持 ICS、CSV 和文字；图片只有配置了视觉模型、并且用户确认后才写入。", "body"))
    story.append(shot("02-courses.png", "图 2  周课表。周一、周三、周五各有一门演示课程。"))
    story.append(shot("03-course-detail.png", "图 3  点开「高级机器学习」后的课程详情和关联任务。"))
    story.append(P("5.3  组会：原话、待办，再写周报", "h2"))
    story.append(P("组会页用下拉框切换记录。当前记录把决议、待办和未决问题分开。待办表保留导师原话、截止日期、进度和交差说明。助手默认收起。打开之后可以选择整理待办、写汇报稿或写周报。这些按钮先生成文稿，不直接改任务。", "body"))
    story.append(shot("04-meetings.png", "图 4  一场组会的决议、待办和未决问题。"))
    story.append(P("写周报时，服务端把本周实验附加到材料里。2026 年 11 月 16 日这天，本周还没有新实验，周报因此没有编出一张本周结果表。上一周实验里的原话仍被保留，包括「还没有跑对照，不能说有没有提升」。", "body"))
    story.append(shot("05-meetings-weekly.png", "图 5  打开助手并生成周报。右侧是当次生成结果。"))
    story.append(P("5.4  科研：课题事实、实验和文献", "h2"))
    story.append(P("科研页先显示课题、指标、对照基线和两个问题。主按钮是「记一次实验」。整理课题脉络和排七天要确认后才写入记忆。本周结果与组会用同一周窗口。全部实验默认折叠，展开后一行一条。", "body"))
    story.append(shot("06-research.png", "图 6  课题事实。本周结果为空，因为截图当天是新的一周。"))
    story.append(shot("07-research-runs.png", "图 7  全部实验。空指标写「未填」，演示读数带「演示」，负面结果保留原句。"))
    story.append(P("文献从用户上传或粘贴的原文整理，不联网补写。一张文献分成笔记、可引用的观点、还缺的证据。选中一段原文后，才能问这段能支持什么。", "body"))
    story.append(shot("08-research-paper.png", "图 8  一篇文献拆成三张卡片，提问贴着原文。"))
    story.append(P("5.5  就业：两条来源", "h2"))
    story.append(P("就业页的筛选从档案带出，可以改。实习和校招走 Offer岛，卡片写来源、发布日期和原页面链接。技能只出现在匹配提示里。专业和学历不参与这次筛选。", "body"))
    story.append(shot("09-career-intern.png", "图 9  按上海和研究方向检索到的实习岗位，来源为 Offer岛。"))
    story.append(P("切到国企与央企后，页面改读官网通知，并说明只保留还在有效期内的条目。筛选对不上时，不把实习岗位挪过来充数。右侧助手可以谈方向怎么选，讨论范围停在已经列出的材料和档案里。", "body"))
    story.append(shot("10-career-state.png", "图 10  国企与央企。条目来自国家大学生就业服务平台的官网通知。"))
    story.append(P("5.6  任务和记忆", "h2"))
    story.append(P("任务页把课程、组会、科研和手写事项放在同一周历下。每条任务带着依据原文。完成状态可以改，但不能把勾选说成实验结果。个人记忆从侧栏打开。一条记忆有领域、来源、确认和停用。未确认或已停用的内容不会进入后续回答。", "body"))
    story.append(shot("11-tasks.png", "图 11  同一周里的任务。组会任务保留导师原话作为依据。"))
    story.append(shot("12-memory.png", "图 12  个人记忆。组会、科研、就业各看自己的条目，可以停用或删除。"))

    story.append(PageBreak())
    story.append(P("6  核心功能实现", "h1"))
    story.append(P("6.1  工作台与课程", "h2"))
    story.append(P("工作台汇总今天的课程和日期最近的未完成任务。日期用「今天」「昨天」「计划日期：后天」这种说法。有密钥时回答来自 qwen-plus；没有密钥时标明本地整理。课表接受手动添加，以及 ICS、CSV 和文字。图片识别只保留模型声明能看清的字段，确认后才写入。", "body"))
    story.append(P("6.2  组会与科研", "h2"))
    story.append(P("组会整理先产出草稿，确认后才写入任务和记忆。本周按上海时区从周一开始算。实验表与科研页同列：日期、改了什么、对照、指标、相对基线、没提升时的原话。空单元格保持空白。文献提问只使用选中的原文。课题脉络先给草稿，确认后写入记忆。", "body"))
    story.append(P("6.3  就业、任务与记忆", "h2"))
    story.append(P("实习和校招调用 Offer岛。薪资或截止时间没有返回时留空。国企和央企读取国家大学生就业服务平台的通知，丢掉已经过期的条目。任务和记忆使用同一套记录。停用或删除后，后续组上下文不再带上这条。", "body"))

    story.append(P("6.4  从输入到可追溯结果", "h2"))
    story.append(P("以林同学准备组会为例。导师要求先核对数据，再在固定预算下跑对照。研途保留输入原文，分别处理待办和实验结果。确认待办会形成任务，任务完成状态和科研指标仍属于不同记录。", "body"))
    story.append(table(
        ["环节", "实现与数据约束", "代码入口"],
        [
            ["组会草稿", "分析接口接收原文。云端模型返回摘要、明确要求、建议和未决问题。服务端校验输出结构、任务日期和逐字引用。无密钥时由本地规则提取。", "POST /api/meetings/analyze · server/api.mjs"],
            ["确认写入", "再次核对引用并校验关联课题。会议、任务和记忆采用 SQLite 批量事务保存，写入失败则回滚。任务用 sourceId 关联会议，同一草稿重复确认时返回已有记录。", "POST /api/meetings/confirm · server/local-db.mjs"],
            ["本周实验", "按上海时区从周一至当天取实验记录。周报和汇报稿沿用记录字段，未填项保留空白。演示中「还没有跑对照，不能说有没有提升」是用户原话。", "POST /api/meetings/write · server/research-week.mjs"],
            ["后续提问", "按页面域筛选已确认且启用的记忆。可定位到来源记录的条目还会检查原记录是否存在。回答连同本次参考材料的摘要返回。", "POST /api/ai/chat · server/api.mjs"],
        ],
        [25 * mm, 99 * mm, 48 * mm],
    ))
    story.append(P("6.5  第三方检索的字段处理", "h2"))
    story.append(P("Offer岛查询使用首选城市、研究方向关键词、实习或校招类型，单次请求最多取 30 条。服务端过滤缺失职位名或合法编号的条目，按档案技能与岗位材料的词面匹配排序，最多展示 6 条。薪资和截止日期留空，岗位原链接保留。限流与鉴权失败分别处理。国企、央企使用独立的官网通知查询路径。", "body"))
    story.append(P("代码入口为 /api/career/search、server/offerdao.mjs 和 server/official.mjs。岗位检索返回的是来源提供的数据。技能匹配分表示材料中找到的对应词数，可供用户阅读岗位时参考。", "body"))

    story.append(PageBreak())
    story.append(P("7  测试与部署", "h1"))
    story.append(P("7.1  本地运行", "h2"))
    story.append(P("环境要求 Node.js 22.13 或更高。复制 .env.example 为 .env 后填写密钥。不填写密钥也可以启动。命令是 npm install 与 npm run dev。页面地址是 http://127.0.0.1:5173 ，API 地址是 http://127.0.0.1:4320 。修改 server 目录下的文件后需要重启 API，Vite 不会热更新服务端。", "body"))
    story.append(P("7.2  已做检查", "h2"))
    story.append(bullet([
        "npm run build 会先做 TypeScript 检查，再做生产构建。2026 年 11 月 16 日的页面调整在本地生产构建中通过。",
        "tests/workbench-api.test.mjs 与 tests/cloud-server.test.mjs 使用隔离的临时 SQLite，不读写 .data/yantu.sqlite。",
        "组会助手收起和展开、科研页从正文打开助手、工作台日期措辞，已在桌面宽度的 Chrome 中看过。窄屏和完整业务路径还没有逐项再测。",
        "2026 年 11 月 16 日从公网核对 HTTPS 首页、前端文件 SHA-256、健康检查和工作台状态接口。云端模型和岗位来源的逐项检索留待单独回归。",
    ]))
    story.append(P("自动化验证结果", "h2"))
    story.append(table(
        ["验证场景", "检查内容", "结果"],
        [
            ["工作台与日程", "隔离库中验证工作台回答及日程解析可调用所需函数。", "通过"],
            ["受保护评审", "认证、来源限制和运行重启后的数据持久化。", "通过"],
            ["启动配置", "配置缺失时启动失败。", "通过"],
            ["公开评审", "允许匿名访问，同时拒绝来自其他站点的写入来源。", "通过"],
        ],
        [38 * mm, 113 * mm, 21 * mm],
    ))
    story.append(P("复现命令为 node --test tests/*.test.mjs。上述测试共 4 项，使用隔离的临时数据库。第三方平台响应和模型答案质量单独通过功能演示核对。", "body"))
    story.append(P("7.3  部署注意", "h2"))
    story.append(P("密钥、评审密码和 SQLite 文件不进入 Git。仓库提供 .env.example 和 .gitignore。.env、.data 和服务器上的私有环境文件只留在运行机器上。演示库可以恢复「林同学」示例，也可以清空。示例实验和示例课程都标了演示，不能当成真实研究结果。", "body"))
    story.append(P("更新应用前备份旧版，替换程序后重启应用计划任务，并检查新版首页和静态资源。部署机上的私有环境文件和演示数据库与应用程序分开存放。", "body"))

    story.append(PageBreak())
    story.append(P("8  创新点", "h1"))
    story.append(P("8.1  技术创新点", "h2"))
    story.append(bullet([
        "同一份带来源的记忆供课程、组会、科研和就业使用。停用立即生效，不依赖模型自觉忘记。",
        "写入分两步。模型只产草稿，确认接口才落库。本地规则和云端模型走同一套确认，避免无密钥时另写一套事实。",
        "招聘结果与模型解耦。实习校招和官网通知是两条代码路径，失败时不互相替代，也不把摘要拼成岗位。",
        "实验表从科研记录原样抄到组会周报。没有指标就保持空白，避免周报生成时补出对照结果。",
    ]))
    story.append(P("8.2  应用创新点", "h2"))
    story.append(bullet([
        "对象是研究生个人的一天，而不是通用聊天窗口。今天的课、最近的任务、本周实验和还能投的通知放在同一工作台。",
        "文献不单独做成库。一篇文献拆成笔记、可引用的观点和还缺的证据，提问必须贴着用户选中的原文。",
        "就业按去向分开。实习和校招看 Offer岛，国企和央企看仍在有效期内的官网通知，页面上写明各自的来源。",
        "演示数据可识别、可清空。评审看到的「林同学」和演示实验不会被说成使用者的真实研究结果。",
    ]))

    story.append(P("9  总结与展望", "h1"))
    story.append(P("研途 AI 把研究生已经写下的课表、组会、实验和档案收成一个 Web 工作台。大模型负责整理和问答，来源接口负责招聘事实，确认动作负责把建议变成记录。没有密钥时，系统退回本地整理并标明，不把规则输出伪装成模型结论。", "body"))
    story.append(P("代码已推到公开仓库，演示视频和技术文档已在本机备好。提交前到赛事个人中心核对截止时间，并上传仓库地址、PDF 和 MP4。可登录赛事个人中心另填公网演示地址。", "body"))
    story.append(P("后续可以做的事也限于已经露出的缺口：Offer岛目前不按专业和学历筛选；窄屏还没有完整走查；公网实例的开机恢复和第三方服务额度可另行走查。这些不改变本文已经实现的边界：事实与建议分开，空着的结果保持空白。", "body"))

    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=16 * mm,
        title="研途 AI 省赛技术文档",
        author="研途 AI",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUT)


if __name__ == "__main__":
    build()
