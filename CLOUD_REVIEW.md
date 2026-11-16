# 评审演示版部署

这是单实例、共享账号的评审演示，不是多用户服务。所有通过认证的评审共用同一份演示档案、记忆和任务，操作包括重置会影响其他评审。使用全新的独立数据库，不导入个人数据。上线后按评审使用周期准备备份与访问管理。

## 启动前

- 准备具有 HTTPS 证书的域名，以及能运行 Docker 和访问百炼、Offer岛的服务器。将容器端口只绑定服务器本机，由 HTTPS 反向代理转发并保留原始 `Host` 请求头。**不要将容器 HTTP 端口直接暴露到公网**：Basic 认证依赖 HTTPS 加密。
- 在反向代理或云防火墙配置登录请求限速及访问控制，并在模型服务设置预算/用量告警。服务器只运行一个应用实例。
- 创建服务器私有环境变量文件（例如 `/etc/yantu/review.env`，权限仅运行服务的管理员可读），填写下列值；不要提交、录屏或分享文件。`PUBLIC_ORIGIN` 不带末尾斜杠或路径；密码使用不少于 16 位的随机值。密钥使用新的云端专用密钥。

```dotenv
REVIEW_MODE=true
PUBLIC_ORIGIN=https://你的评审域名
REVIEW_USER=reviewer
REVIEW_PASSWORD=填写随机密码
DATABASE_PATH=/data/yantu.sqlite
DASHSCOPE_API_KEY=填写云端百炼密钥
OFFERDAO_API_KEY=填写云端Offer岛密钥
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
AI_VISION_MODEL=qwen3-vl-plus
```

- Docker 镜像使用非 root 的 `node` 用户（UID 1000）；持久化目录需可由 UID 1000 读写。请先确认目录用于本项目，云平台挂载卷亦需保证相应权限。

## 构建与运行

在项目源码目录中执行：

```bash
docker build -t yantu-review .
sudo install -d -m 700 -o 1000 -g 1000 /var/lib/yantu-review
docker run -d --name yantu-review --restart unless-stopped \
  --env-file /etc/yantu/review.env \
  -p 127.0.0.1:4320:4320 \
  -v /var/lib/yantu-review:/data \
  yantu-review
```

将 HTTPS 反向代理的上游设置为 `http://127.0.0.1:4320`，传递 `Host` 为评审域名，支持长连接，并关闭对流式响应的缓冲。根据负载和模型耗时设置代理超时。容器中的 `PORT` 可由平台覆盖。无需登录的 `GET /healthz` 只返回 `ok`，可用于健康检查；应用的页面及 API 都要求认证。公开域名通过反向代理使用有效 HTTPS 证书，不应直接暴露容器端口。

也可用支持 Node 22.13+、持久卷和自定义启动命令的平台：执行 `npm ci && npm run build` 构建，启动 `node server/local.mjs`，设置上述环境变量，挂载持久卷，配置 HTTPS 和来源域名。生产环境若只安装生产依赖，先在构建阶段安装开发依赖以运行 TypeScript/Vite。

## 上线后验收

1. 未登录访问首页和 `/api/state` 应返回 401；使用评审账号可进入。异站来源的写请求应被拒绝。
2. 确认显示的是独立演示档案，不含本机个人记录；创建测试任务，重启实例后确认仍在，然后删除测试任务。SQLite 使用 WAL，备份应采用 SQLite 一致性备份，或在停止应用后备份整个数据库目录（包括可能存在的 WAL 文件）。
3. 验证工作台对话、组会周报、图片课表和实习岗位检索。确认是云端模型输出，并检查 Offer岛返回的来源和链接。记录实际结果；上云前的本机测试不能代替云端验证。
4. 只通过赛事要求的受控渠道提供评审网址和账号，不把密钥或评审密码放进仓库、README、视频或公开材料。

本地回归：`node --test tests/cloud-server.test.mjs tests/workbench-api.test.mjs`。公网部署、域名、HTTPS、持久卷和容器镜像的实际验证以所选平台为准。
