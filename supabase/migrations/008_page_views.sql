-- 008_page_views.sql
-- 目的：为「访问统计」建表。
--
-- ── 权限模型 ──
--   写入：**只经 Edge Function `track-visit`**（service_role）。
--         不给 anon 任何写权限 —— 前端打包里的 anon key 是公开的，
--         给了写权限就能被直接刷数据。
--   读取：**只对 authenticated 开放**，对应「统计挂在管理员权限下」的要求。
--         anon 读不到任何一条访问记录。
--
-- ── 隐私 ──
--   不存原始 IP，只存「IP + User-Agent + 盐」的哈希，用于区分独立访客。
--   不用 cookie、不做跨站追踪；前端还会尊重 Do Not Track。
--   User-Agent 单独留一列，是为了把爬虫和真人区分开（is_bot）。

CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 访问路径，如 / 或 /archive
  path TEXT NOT NULL,

  -- 来源链接与来源域名（来源域名单独留一列，便于直接 group by）
  referrer TEXT,
  referrer_host TEXT,

  user_agent TEXT,

  -- 仅哈希，不留原始地址
  ip_hash TEXT,

  -- 同一次会话共用，用于把「一次访问的多个页面」串起来
  session_id TEXT,

  -- 爬虫标记。curl / 监控 / 搜索引擎会污染统计，界面上默认剔除
  is_bot BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT page_views_path_len CHECK (char_length(path) BETWEEN 1 AND 300)
);

-- 近期查询走时间，热门页面走向 path，独立访客走向 ip_hash
CREATE INDEX IF NOT EXISTS page_views_created_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_idx    ON public.page_views (path);
CREATE INDEX IF NOT EXISTS page_views_ip_idx      ON public.page_views (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_session_idx ON public.page_views (session_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- 先把 anon / authenticated 的权限清空，再单独把 SELECT 授给 authenticated。
-- 顺序不能反：REVOKE 在 GRANT 之后会把刚授的权限也收走。
REVOKE ALL ON public.page_views FROM anon, authenticated;

-- 仅管理员可读
DROP POLICY IF EXISTS "Admin can read page views" ON public.page_views;
CREATE POLICY "Admin can read page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.page_views TO authenticated;

-- anon 既无 GRANT 也无 policy → 读写皆不可
-- service_role 天然绕过 RLS，函数落库不需要额外授权
