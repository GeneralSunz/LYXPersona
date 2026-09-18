---
name: project-goals
description: 熔炉档案库 (FileVault) — 文件管理与分享系统
metadata:
  type: project
---

**熔炉档案库 (FileVault)** — 基于 React + Supabase + Cloudflare R2 的文件管理与分享系统。

核心功能：
- 公开文件浏览与下载（无需登录）
- 管理员登录后上传/删除/移动文件
- 文件夹分类与搜索
- GitHub Pages 自动部署

权限模型（Supabase RLS）：
- files/folders 表：公开 SELECT，仅认证用户 INSERT/UPDATE/DELETE
- Storage：公开读取，仅认证用户上传/删除

部署：GitHub Actions → GitHub Pages，base 路径通过 VITE_BASE_PATH 环境变量设置。
