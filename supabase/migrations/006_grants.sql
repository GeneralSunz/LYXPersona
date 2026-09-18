-- 006_grants.sql
-- 目的：让 Data API 角色（anon / authenticated）真正有权限访问 files / folders。
--
-- 背景（重要）：
--   Supabase 新建项目里的「Automatically expose new tables」选项，决定用 SQL 建的新表
--   是否自动 GRANT 给 anon / authenticated。
--     · 勾选   → 建表时自动授权 → 本文件是幂等的冗余保险
--     · 不勾选 → 不自动授权 → 只有 RLS policy 是不够的，PostgREST 会返回
--                "permission denied for table files"（401/403），而不是空数组
--   本文件两种情况都安全（GRANT 天然幂等），建议无条件执行。
--
-- 权限模型（与设计文档一致）：
--   files/folders：匿名可读（下载门户），仅登录用户可增删改（后台管理）
--   RLS policy 仍负责行级过滤，GRANT 只决定"角色能否碰这张表"。

begin;

-- 模式使用权限（新项目通常是预置的，写上是保险）
grant usage on schema public to anon, authenticated;

-- ── files ──
grant select on table public.files to anon, authenticated;
grant insert, update, delete on table public.files to authenticated;

-- ── folders ──
grant select on table public.folders to anon, authenticated;
grant insert, update, delete on table public.folders to authenticated;

-- 兜底：确保 RLS 处于开启状态（与 001/005 重复也无害）
alter table public.files enable row level security;
alter table public.folders enable row level security;

commit;

-- 校验（应各返回 1 行权限记录）：
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='files' order by grantee, privilege_type;
