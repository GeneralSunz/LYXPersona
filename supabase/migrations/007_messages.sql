-- 007_messages.sql
-- 目的：为「想对我说」留言功能建表。
--
-- ── 权限模型（与 006 的「匿名可读、登录可写」**刻意不同**）──
--   messages 表**不对 anon / authenticated 开放任何权限**。
--   写入一律经由 Edge Function `send-message`，它拿 service_role 落库。
--
--   为什么不像 files 那样给 anon INSERT：
--     前端打包里的 anon key 是公开的。只要给 anon 开了 INSERT，
--     任何人拿这个 key 直接打 PostgREST 就能写库，**完全绕过**
--     Edge Function 里的蜜罐与 IP 限频，这个留言板会被瞬间刷爆。
--     所以直接写入这条路必须堵死，只留函数这一个入口。
--
--   读取：不建任何 SELECT 策略 = 默认拒绝。
--     站长在 Supabase 控制台用 service_role 查看（service_role 绕过 RLS），
--     前端即使拿到 anon key 也读不到任何一条留言。

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 留言正文
  content TEXT NOT NULL,

  -- 署名。匿名为 NULL
  signature TEXT,

  -- 是否匿名。默认匿名（前端显式传 false 才视为署名）
  is_anonymous BOOLEAN NOT NULL DEFAULT true,

  -- 可选联系方式，仅站长可见
  contact TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 反垃圾用：只存 IP 的加盐哈希，不留原始 IP
  ip_hash TEXT,
  user_agent TEXT,

  -- 长度兜底。Edge Function 已校验一遍，这里再兜一层防止绕过函数直写
  CONSTRAINT messages_content_len CHECK (char_length(content) BETWEEN 1 AND 500),
  CONSTRAINT messages_signature_len CHECK (signature IS NULL OR char_length(signature) <= 40),
  CONSTRAINT messages_contact_len CHECK (contact IS NULL OR char_length(contact) <= 120)
);

-- 限频查询要走 (ip_hash, created_at)
CREATE INDEX IF NOT EXISTS messages_ip_created_idx ON messages (ip_hash, created_at DESC);
-- 站长按时间倒序翻留言
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 刻意不建任何 policy。同时显式回收权限，防止项目开了
-- 「Automatically expose new tables」后自动 GRANT 出去。
REVOKE ALL ON messages FROM anon, authenticated;

-- 说明：service_role 不需要在这里 GRANT —— 它天然绕过 RLS 且默认具备
-- 全部表权限；若某天发现函数落库报 42501，再补
--   GRANT ALL ON messages TO service_role;
