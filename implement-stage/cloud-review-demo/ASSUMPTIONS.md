# 评审演示版假设
<!-- ASK mode: never -->
| ID | 未指定事项 | 选择 | 类别 | 来源 |
|---|---|---|---|---|
| A-001 | 评审访问方式 | 共享账号密码，HTTPS 反向代理后使用 HTTP Basic 认证 | interface | default |
| A-002 | 数据隔离范围 | 评审共用一份演示档案、任务与记忆，不隔离不同评审 | semantic | default |
| A-003 | 部署形态和数据 | 单个 Node 22 实例、独立 SQLite 持久卷；不迁移本机用户数据 | interface | user |
| A-004 | 平台和公网地址 | 用户未选平台；通过环境变量配置公开 HTTPS 地址，当前不实际部署 | interface | user |
| A-005 | 私有密钥 | 云端通过环境变量注入；不用本地 .env 作为镜像内容 | interface | default |
| A-006 | 原视觉模型返回 model_not_found | 视觉模型更换为已用当前账号验证可访问的 qwen3-vl-plus；保留环境变量覆盖 | interface | default |
