# 浅草物语 dev 集成与回滚

本次采用 upstream/dev e187fbc（含评论多级回复、邮件通知与审核优化 #154），基于生产 stable 集成提交 6e8c7c3 合并；不是覆盖 checkout。生产源码目录 RN /opt/Blog/Monolith-dev，分支 upgrade/dev-20261102。

保留：About 动画、content-first 首页、移动封面、品牌缓存/PWA/favicon、访客主题开关、fluid 默认、草稿鉴权读取及失败禁存、/page/link 原生友链机读兼容、本站 CF 绑定。server/src/index.ts 与 upstream/dev 完全一致。原 /opt/Blog/Monolith 的两项未提交改动保持原位。

验证：client/server 类型检查与 ESLint、Vitest 4 文件 29 测试、移动封面脚本、Vite/PWA build、Worker dry-run 通过。D1 已有 0013/0014 字段与索引，无数据库写入。完整 SQL 导出经 SQLite integrity_check=ok。生产文章列表/公开设置/18 条友链部署前后相同；JSON API、RSS 域名、sitemap 单数路径、favicon、manifest、友链机读头通过。真实 Chromium 390px 首页/About/文章无横向溢出，dark/fluid 与主题面板正常，已有嵌套评论与回复表单正常。未提交测试评论或触发真实邮件；邮件链路由自动测试覆盖，未宣称真实收件测试。

新 Worker version: 65433ae5-5d23-4303-ab7e-2a74b3b27532
新 Pages deployment: fcc2eac2-8ef3-44ec-8bcb-5a2f53284511
旧 Worker version: 951300e6-1549-418c-ba3a-99a58544b231
旧 Pages deployment: 40cdf050-deff-4ac0-abd2-a7163d2b1478
回退：wrangler rollback 上述旧 Worker version；Pages API 对上述旧 deployment POST rollback。数据库未改，不要导回 SQL 覆盖新内容。
备份：RN /opt/Blog/backups/monolith-dev；运维侧 /opt/data/backups/monolith-dev（含 SQL、SQLite 验证副本、部署前后 CF 状态与日志，受限私密，严禁上传 GitHub）。

注意 upstream/main 当前含 dev 之外的依赖更新，本次严格采用请求的 dev，不合 main。dev 是开发快照，不保证稳定版级兼容；后续升级仍需审查差异。
