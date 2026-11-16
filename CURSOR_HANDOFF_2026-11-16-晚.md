# 研途 AI：交接

更新于 2026-11-16 晚。先读本文件。同日上午的 `CURSOR_HANDOFF_2026-11-16.md` 和更早的 `HANDOVER.md` 里，部署状态、BOSS 直聘方案、以及没有口播的演示片，都已过时。

## 本地目录

项目根目录：`/Users/songxinhang/chuanzhibei-cursor`

| 路径 | 是什么 |
| --- | --- |
| `/Users/songxinhang/chuanzhibei-cursor` | 源码。Vite + React 前端，Node 22 API，SQLite |
| `/Users/songxinhang/chuanzhibei-cursor/.env` | 本机密钥。不提交、不写进文档、不放进视频 |
| `/Users/songxinhang/chuanzhibei-cursor/.env.example` | 可提交的空模板 |
| `/Users/songxinhang/chuanzhibei-cursor/.data/yantu.sqlite` | 本机数据库。不要覆盖，不要提交 |
| `/Users/songxinhang/chuanzhibei-cursor/docs/研途AI-省赛技术文档.pdf` | 省赛技术文档，14 页，含 12 张界面截图 |
| `/Users/songxinhang/chuanzhibei-cursor/docs/figures/` | 技术文档用的截图 |
| `/Users/songxinhang/chuanzhibei-cursor/docs/build_submission_pdf.py` | 重新生成技术文档的脚本 |
| `/Users/songxinhang/chuanzhibei-cursor/CLOUD_REVIEW.md` | 云端评审部署说明 |
| `/Users/songxinhang/chuanzhibei-cursor/README.md` | 运行说明。还缺报名表上的团队姓名 |

本机 Node 在 `~/.local/bin`，需要 22.13 或更高。启动前先 `export PATH="$HOME/.local/bin:$PATH"`。

```bash
cd /Users/songxinhang/chuanzhibei-cursor
npm install
npm run dev
```

页面是 http://127.0.0.1:5173 ，API 是 http://127.0.0.1:4320 。改 `server/` 后要重启 API。

## 桌面上的提交材料

| 文件 | 说明 |
| --- | --- |
| `/Users/songxinhang/Desktop/研途AI-省赛技术文档.pdf` | 和技术文档目录里同一份，4.2MB |
| `/Users/songxinhang/Desktop/研途AI-演示-口播.mp4` | 当前演示片。5 分 13 秒，1920×1080，带百炼中文口播。工作台约第 9 秒会点「排出今天的顺序」 |
| `/Users/songxinhang/Desktop/研途AI-演示文案.txt` | 和口播片对齐的词和时间 |
| `/Users/songxinhang/Desktop/研途AI-演示.mp4` | 更早的无声片，没有工作台点击。不要把这一条当成交片 |

口播是按画面切换贴上去的。某段念完会留白，下一段从下一个画面开始。无密钥、空指标、演示读数、Offer岛和官网通知的界限，文案里保持原样。

## 比赛

- 大赛：全国高校 AI Web 开发挑战赛（传智杯）
- 赛道：AI WEB 网页开发挑战赛
- 赛道页：https://www.boxuegu.com/matchTrack/detail/?id=10037
- 赛道页公示的报名和作品提交截止：2026-11-18。以赛事个人中心显示为准
- 必交：公开代码仓库、5–8 分钟 MP4、不超过 30 页 PDF
- 在线演示是加分项
- 公开仓库：https://github.com/xinhangsong169-lab/yantu-ai ，分支 `main`，远端仍是 `eebe1f1`
- 本机有大量未提交改动，包括 Offer岛、评审模式、页面和文档。不要把本机代码当成已经推送

## 云端

腾讯云轻量服务器在北京，Windows Server，实例 `lhins-cy2ro0eg`，目录 `C:\yantu-review`。11 月 16 日的应用更新已部署到免登录演示地址 https://49.232.193.126 。服务器返回 `DEPLOY_OK`，公网首页加载的前端文件与部署包的 SHA-256 一致，`/api/health` 和 `/healthz` 均通过。旧版备份在 `C:\yantu-review\backup-508fe8da52d2459cb7ef1b722d27ae51`。演示片仍按桌面上的提交材料交付。没有用户明确要求，不要自行部署或推送。

## 产品边界

- 使用者是硕士、博士个人。页面有工作台、课程、组会、科研、就业、任务，外加一份可停用的个人记忆
- 实习和校招走 `server/offerdao.mjs`（Offer岛）。国企和央企走官网通知。`server/boss.mjs` 还在仓库里，不是当前招聘来源
- 模型是百炼 `qwen-plus`，视觉是 `qwen3-vl-plus`。没有密钥时标明本地整理
- 口播用的是百炼 CosyVoice（`cosyvoice-v2`，音色 `longxiaochun_v2`）
- 演示档案是「林同学」。空指标保持空白。演示实验必须带着「演示」和「还没有跑对照，不能说有没有提升」
- `.env`、服务器私有环境文件、`.data/` 不得提交。密钥曾出现在聊天里，是否已在平台上轮换未确认。不要在回复里输出密钥

## 接下来还没做

1. 队员宋欣航、王渡云、朱柏鸿，指导老师王迪、刘帅，已写入本地 README 和技术文档封面。参赛版 README 和技术文档封面列出团队姓名。电话和邮箱没有写进仓库。
2. 若要交仓库，先审查差异，确认密钥和数据库不在暂存区，再提交并推送。
3. 提交前到个人中心核对截止时间和上传入口。
4. 只有用户再次要求时，才把最新页面部署到 `C:\yantu-review`。
