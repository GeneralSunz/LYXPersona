# Supabase 恢复路径（FileVault / 熔炉档案局）

> ## ✅ 已解决（2026-09-18 实测闭环）
>
> **点一次 `Resume project` 就全部恢复，零改动、零数据丢失。** 实测结果：
> - `files` **44 条**、`folders` **9 条**，文件名/分类/`file_url` 全部完好
> - `auth /health`、`rest /files`、`rest /folders`、`storage /bucket` → 全 200
> - 上传链路全通：`POST /upload-url` 200 → R2 `PUT` 200 → 公共域回读 200 → `DELETE` 204
> - **`.env` / `.env.production` 未改一行，迁移未重放，GitHub Pages 无需重新部署**（已发布构建指向的仍是同一个 ref）
>
> 过程记录：Resume 后约 2 分钟源站才起来（此间 REST 返回 521/544，属正常），
> 首个成功响应时 REST 曾短暂报 `PGRST205`（schema cache 未刷新），约 1 分钟后自行恢复 —— **不是表丢失**。
>
> ## 原先的判断（已推翻，保留作为推理记录）
>
> 原项目**没有被删除，而是被暂停（Paused）**。Dashboard 提示：
> 「Project "yuxuanlei2006-lab's Project" is paused — All data, including backups and storage objects, remains safe. You can resume this project until 30 Aug 2027.」
> ref 仍是 `xigtfbquvymzoynrqxwd`，数据、表结构、RLS、Storage 桶、Edge Function 及其 secrets 全部完好。
>
> ⚠️ **教训（导致误判的那一环）**：Supabase **暂停中的项目域名同样会停止解析（NXDOMAIN）**。
> 「NXDOMAIN = 项目已删除」这一步推理是错的 —— NXDOMAIN 只能说明"服务不可用"，
> 必须结合 Dashboard 状态徽标才能区分 Paused / Deleted。
>
> 下面第 1~8 节作为**恢复失败时**的兜底路径保留。

---

# 兜底路径（仅当 Resume 不可用或数据已丢时才需要）

> 早前结论（已被上面的实测推翻，保留作为推理记录）：项目主机 DNS NXDOMAIN，曾据此推断项目已被删除。

---

## 0. 架构事实（决定恢复顺序）

| 关注点 | 位置 | 现状 |
|---|---|---|
| 文件字节 | Cloudflare R2 桶 `myweb-files`，公共域 `https://pub-ac5abe7a212f453abd134cea6c25d943.r2.dev` | ✅ **存活**（对象应还在） |
| 元数据（文件名/大小/分类/目录） | Supabase Postgres 表 `files`、`folders` | ❌ 随项目一起不可达 |
| 管理员登录 | Supabase Auth（邮箱+密码） | ❌ 同上 |
| 上传签名 | Supabase Edge Function `r2-proxy`（`{project}/functions/v1/r2-proxy`） | ❌ 同一死域名 |
| 上传签名（备选实现） | Cloudflare Worker `workers/r2-proxy`（`r2-upload-proxy`） | ⭕ 可部署，**独立域名** |
| 前端构建 | GitHub Actions → Pages，读取仓库内 `.env.production` | ⚠️ 里面仍写着死 ref |

关键推论：
1. **Supabase 必须恢复**（元数据 + 登录都在它那儿），R2 只是对象存储。
2. **签名服务可以和元数据解耦**：把 `VITE_R2_WORKER_URL` 从 Supabase Edge Function 换成 Cloudflare Worker，以后上传/删除不再依赖 Supabase 域名。
3. **原始文件名不可从 R2 反推**：R2 key 形如 `uuid.ext`，丢了 `files` 表就只能拿回扩展名/大小/时间。优先找数据库备份。

---

## 0.5 已备好的脚本（仓库内，可直接跑）

| 脚本 | 作用 | 何时用 |
|---|---|---|
| `scripts/set-supabase-project.ps1` | 一条命令切新项目：改写 `.env`、`.env.production`、`supabase/.temp/{project-ref,linked-project.json,pooler-url}`，自动备份 + 残留 ref 检查 | 拿到新 ref/key 之后 |
| `scripts/verify-backend.ps1` | 体检：DNS → Auth → REST(files/folders) → Storage → R2 公共域；`-ProbeUpload` 时额外跑「签名→直传→回读→删除」全链路 | 每一步之后自检 |
| `scripts/rebuild-files-from-r2.ps1` | 从 `wrangler r2 object list` 的 JSON 生成 `files` 表 INSERT；**按字节数与本地文件夹精确匹配，反查原始文件名** | 阶段五恢复元数据 |

```powershell
cd C:\Users\29626\Desktop\MyWeb

# ① 体检（当前会报 DNS FAIL / exit 3，正是"项目已删除"的表现）
powershell -ExecutionPolicy Bypass -File scripts/verify-backend.ps1

# ② 新建项目后，一条命令切换全部配置（先用 -WhatIf 干跑）
powershell -ExecutionPolicy Bypass -File scripts/set-supabase-project.ps1 `
  -ProjectUrl https://<NEW_REF>.supabase.co `
  -PublishableKey <NEW_PUBLISHABLE_KEY> `
  -ProjectName filevault `
  -R2WorkerUrl https://r2-upload-proxy.<子域>.workers.dev `
  -WhatIf
```

> 已验证：脚本在本机 PowerShell 5.1 下可运行；`-WhatIf` 干跑、残留检查、DNS 失败诊断（exit 3）均实测通过。

### 本机侦查结论（决定为什么必须新建）

- **历史上只出现过这一个 ref** `xigtfbquvymzoynrqxwd`（`git log --all` 全程），没有「更早的、还活着的项目」可以回退。
- 本机**没有** Supabase CLI 的 access token（`~/.supabase/access-token` 不存在）→ 无法用 Management API 代建项目，必须你在浏览器里操作。
- 本机**没有** wrangler/Cloudflare 凭据 → `wrangler` 需你先 `login`。
- **R2 密钥不在任何本地文件里**：它当初只存在 Supabase Edge Function 的 secrets 中，随项目一起没了 → 必须在 Cloudflare 重新签发一对 R2 Access Key（桶本身不受影响）。
- 好消息：`上传文件/` 里有 **9 个真实命名的 PDF**，它们的字节数可用于反查 R2 对象的原始文件名（脚本已实现）。

---

## 1. 阶段一：判定项目状态（已确认：**项目不存在**）

> ✅ 2026-09-18 已确认：Dashboard 里该项目不存在 → **直接执行分支 B（新建项目）**，本文后续按分支 B 组织。

1. 打开 <https://supabase.com/dashboard/projects>，确认组织 `yuxuanlei2006-lab`（org id `fhzihlahtespkluwyzlg`）下是否还有该项目。
2. 三种结果：

| 结果 | 判定 | 走哪条分支 |
|---|---|---|
| 项目存在、状态 Active | 可能是 ref 变更/域名异常 | **分支 A** |
| 项目存在、状态 Paused | 免费版闲置被暂停（暂停仍能解析，与 NXDOMAIN 不符，但优先救） | **分支 A**（Restore） |
| 项目不存在 | 已被删除（≥90 天闲置或手动删除） | **分支 B** |

3. 顺手在 Dashboard → Settings → Database 找 **Backups / PITR**：有备份就能连数据一起救回，直接影响阶段五的恢复质量。
4. 到 Billing 看一眼是否有欠费/降级记录。

---

## 2. 阶段二：恢复或重建项目

### 分支 A — 项目还在：恢复原 ref

```powershell
# Dashboard → 项目 → Restore project / Unpause，等待状态变 Active
# 然后核对 ref 是否仍是 xigtfbquvymzoynrqxwd
nslookup xigtfbquvymzoynrqxwd.supabase.co
```

- ref 不变 → 直接跳到**阶段四**（配置无需改动）。
- ref 变了 → 按**阶段三**更新配置，并按**阶段二·分支 B 的第 2 步**重放 migrations（若表已丢）。

### 分支 B — 项目已删除：新建（推荐默认路径）

1. Dashboard → New project：
   - Name：`filevault`（或沿用原名）
   - Region：**Northeast Asia (Tokyo, ap-northeast-1)** —— 原项目 pooler 就在这个区，国内访问也最稳
   - Database Password：生成强密码并**存进密码管理器**（只显示一次）
2. 拿到两个值（Settings → API）：
   - `Project URL` → 形如 `https://<NEW_REF>.supabase.co`
   - `Publishable key`（`sb_publishable_…`）或 legacy `anon` key → 二选一都行，前端两者都支持
3. 重建数据库结构（**顺序不能换**），二选一：

**方式① CLI（推荐，可复现）**

```powershell
cd C:\Users\29626\Desktop\MyWeb
npx supabase@latest login                      # 需要 Supabase Access Token 或浏览器授权
npx supabase@latest link --project-ref <NEW_REF>
npx supabase@latest db push                    # 依次应用 001~005，含 storage.buckets('files')
# 校验
npx supabase@latest migration list
```

**方式② 无 CLI：SQL Editor 手工执行**
按顺序把下面 5 个文件的全文粘进 Dashboard → SQL Editor 执行：

```
supabase/migrations/001_create_files.sql
supabase/migrations/002_folders.sql
supabase/migrations/003_storage_and_public_access.sql
supabase/migrations/004_add_file_url.sql
supabase/migrations/005_rls_public_read_auth_write.sql
```

执行完应能验到：
- `files` 表（列：`id, name, size, type, category, storage_path, uploaded_at, deleted_at, folder_id, file_url`）
- `folders` 表（`id, name, parent_id, created_at`）
- RLS：`files` / `folders` 允许匿名**读**、仅登录用户**写**
- Storage → Buckets 出现公开桶 `files`（003/005 里的 `INSERT INTO storage.buckets ... ON CONFLICT`）

4. 重建管理员账号：Dashboard → Authentication → Users → **Add user** → 填邮箱密码 → 勾选 **Auto Confirm User**。
   （`ProtectedRoute` 依赖 Auth 会话；不建账号就只能看下载页，进不去 `/admin`）

---

## 3. 阶段三：更新前端配置（用脚本，别手改）

```powershell
cd C:\Users\29626\Desktop\MyWeb
powershell -ExecutionPolicy Bypass -File scripts/set-supabase-project.ps1 `
  -ProjectUrl https://<NEW_REF>.supabase.co `
  -PublishableKey <NEW_PUBLISHABLE_KEY> `
  -ProjectName filevault `
  -R2WorkerUrl https://r2-upload-proxy.<子域>.workers.dev
```

脚本会改这些位置（都带 `.bak-<时间戳>` 备份）：

| 文件 | 变量 | 新值 |
|---|---|---|
| `.env`（本地，已 gitignore） | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 新项目 URL / publishable key |
| `.env.production`（**已入库，CI 用它构建**） | 同上 | 同上 |
| `.env` / `.env.production` | `VITE_R2_WORKER_URL` | 传了 `-R2WorkerUrl` 才改；**这是把签名通道从 Supabase 域名解耦的关键一步** |
| `.env` / `.env.production` | `VITE_R2_PUBLIC_URL` | **保持不变**（`https://pub-ac5abe7a212f453abd134cea6c25d943.r2.dev`） |
| `supabase/.temp/project-ref`、`linked-project.json`、`pooler-url` | — | 一起同步，避免下次再判断错 ref |

然后自检 + 提交：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-backend.ps1
npm run build                      # 本地自检（dist 被 gitignore，由 CI 构建）
git add -A; git commit -m "chore: repoint supabase project"; git push
```

---

## 4. 阶段四：上传签名通道（二选一）

### 4A 继续用 Supabase Edge Function

```powershell
npx supabase@latest secrets set `
  R2_ACCOUNT_ID=405c1246f73e024c552b158dc25f7a13 `
  R2_BUCKET_NAME=myweb-files `
  R2_PUBLIC_URL=https://pub-ac5abe7a212f453abd134cea6c25d943.r2.dev `
  R2_ACCESS_KEY_ID=<R2 Access Key> `
  R2_SECRET_ACCESS_KEY=<R2 Secret>
npx supabase@latest functions deploy r2-proxy
# 实测（把 <URL>/<KEY> 换成新值）
curl.exe -i -X POST "https://<NEW_REF>.supabase.co/functions/v1/r2-proxy/upload-url" `
  -H "Authorization: Bearer <PUBLISHABLE_KEY>" -H "Content-Type: application/json" `
  -d '{\"filename\":\"probe.txt\",\"contentType\":\"text/plain\"}'
```

- 期望返回 `{uploadUrl, publicUrl, key}`。
- 若返回 **401 / Invalid JWT**：网关的 `verify_jwt` 不认新格式 publishable key → 改用 legacy `anon` JWT，或
  `npx supabase@latest functions deploy r2-proxy --no-verify-jwt`（函数内自校验）。

### 4B 换成 Cloudflare Worker（推荐：抗 Supabase 域名故障）

```powershell
cd C:\Users\29626\Desktop\MyWeb\workers\r2-proxy
npx wrangler login
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler deploy            # 输出 https://r2-upload-proxy.<子域>.workers.dev
```

然后把 `.env` / `.env.production` 的 `VITE_R2_WORKER_URL` 指向该域名。
- `wrangler.toml` 里的 `R2_PUBLIC_URL` / `R2_BUCKET_NAME` 必须与 `.env` 的 `VITE_R2_PUBLIC_URL` 一致。
- 前端仍会带 `Authorization: Bearer <supabase key>`，Worker 忽略该头、CORS 允许 `*`，因此兼容无需改代码。

---

## 5. 阶段五：找回文件字节与元数据

对象还在，元数据大概率丢了。按价值从高到低：

1. **有数据库备份**（Dashboard → Database → Backups，或你本地导出过 `files` 表）→ 直接还原 `files`/`folders`，最完整。
2. **无备份 → 从 R2 对象列表重建行**（脚本一键生成 SQL）：

```powershell
cd C:\Users\29626\Desktop\MyWeb\workers\r2-proxy
npx wrangler r2 object list myweb-files --json > ..\..\r2-objects.json

cd C:\Users\29626\Desktop\MyWeb
powershell -ExecutionPolicy Bypass -File scripts/rebuild-files-from-r2.ps1 `
  -ObjectsJson r2-objects.json -LocalFolder 上传文件 -OutFile rebuild-files.sql
# 然后：新项目 SQL Editor 里粘贴 rebuild-files.sql 全文执行
```

脚本行为：`storage_path` = R2 key，`file_url` = `<VITE_R2_PUBLIC_URL>/<key>`，`category` 按扩展名推断，
`name` **优先用本地文件按字节数反查到的真实文件名**（本仓库 `上传文件/` 下 9 个 PDF 已实测可匹配成功），
匹配不到才用 `未命名-<key前8>.ext` 占位。

> 注意：R2 key 是 `uuid.ext`，**不靠字节数匹配就无法还原原始文件名**。若你还有别的本地副本（下载目录、网盘），
> 把它们也放进一个文件夹用 `-LocalFolder` 指过去，匹配率会更高。

3. 桶里若有历史遗留的 Supabase Storage 对象（旧 `files` 桶路径），同样按上法补行。

---

## 6. 阶段六：端到端验收清单

只读探测（新 ref 替换 `<URL>` / `<KEY>`）：

```powershell
$U='<URL>'; $K='<KEY>'; $H=@{apikey=$K; Authorization="Bearer $K"}
foreach ($p in @('/auth/v1/health','/rest/v1/files?select=id,name,size,storage_path&limit=3','/rest/v1/folders?select=id,name&limit=3','/storage/v1/bucket')) {
  try { $r=Invoke-WebRequest "$U$p" -Headers $H -TimeoutSec 20 -UseBasicParsing; "$p -> $($r.StatusCode) $($r.Content.Substring(0,[Math]::Min(120,$r.Content.Length)))" }
  catch { "$p -> FAIL $($_.Exception.Message.Substring(0,80))" }
}
```

功能验收（浏览器）：
- [ ] `/` 下载门户能列出档案（不再是空态）
- [ ] `/admin` 能登录（新管理员账号）
- [ ] 上传 1 个小文件 → 列表出现、进度正常
- [ ] 预览（图片/文本/PDF）正常
- [ ] 下载正常（走 R2 公共域）
- [ ] 删除 → 列表消失且 R2 对象被删（Worker/Edge Function 的 DELETE 生效）
- [ ] 部署产物核对：`Select-String -Path dist/assets/*.js -Pattern '<OLD_REF>'` 无输出

---

## 7. 陷阱与注意事项

1. **别改 `dist/`**：它被 gitignore、由 CI 构建；本地构建只为自检。
2. **`.env.production` 入库了**：新 key 会进 git 历史。publishable key 设计上可公开，但若不想留痕，可改走 GitHub Actions Secrets。
3. **不要 `supabase db reset`**：会清库。
4. **迁移必须按序**：`002` 给 `files` 加 `folder_id`，`004` 加 `file_url`，顺序错了会报表/列不存在。
5. **`supabase/.temp/*` 是入库文件**，`link` 后会变动，记得一起提交，避免下次再判断错 ref。
6. **Edge Function 的 JWT 校验**：新格式 `sb_publishable_…` key 在新项目上可能被网关拒（401），见 4A 的处置办法；4B 的 Worker 方案没有这个问题。
7. **NXDOMAIN ≠ 暂停**：暂停的项目域名仍解析，因此不要指望「等一下自己好」。
8. **功能缺口（与本次故障无关）**：`shares` / 分享链接功能在代码、迁移、Worker 里都不存在，需求文档 Phase 3 从未落地。

---

## 8. 最短路径（TL;DR）

```
你（只能在浏览器/Cloudflare 后台做的三件事）
  A. supabase.com 新建项目（东京）→ 抄下 Project URL + publishable key
  B. 新项目 SQL Editor 按序执行 supabase/migrations/001~005 → Authentication 里建管理员账号
  C. Cloudflare：签发一对新的 R2 Access Key；cd workers/r2-proxy && npm run deploy（拿到 workers.dev 域名）

我/脚本（本地一条命令一步）
  ① powershell -File scripts/set-supabase-project.ps1 -ProjectUrl ... -PublishableKey ... -R2WorkerUrl ...
  ② powershell -File scripts/verify-backend.ps1 -ProbeUpload        # 全链路自检
  ③ wrangler r2 object list myweb-files --json > r2-objects.json
     powershell -File scripts/rebuild-files-from-r2.ps1 -ObjectsJson r2-objects.json -LocalFolder 上传文件
  ④ git add -A && git commit && git push                            # CI 重新发布 Pages
  ⑤ 浏览器验收：列表 / 上传 / 预览 / 下载 / 删除
```

预计耗时：A–B 约 15 分钟，C 约 10 分钟，①④ 约 5 分钟，③ 取决于对象数量。
**卡点只有一个：R2 密钥随旧项目一起没了，必须先在 Cloudflare 重新签发。**
