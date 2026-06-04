# Architecture

サークル会計 SaaS の technical architecture。

## 1. システム全体像

```
                        ┌───────────────────────┐
                        │   User's Browser      │
                        │  React 19 + TanStack  │
                        │   + HeroUI v3         │
                        └──────────┬────────────┘
                                   │ HTTPS
                                   │ Hono RPC (typed)
                                   ▼
                        ┌───────────────────────┐
                        │   Hono BE (Bun)       │
                        │   on Fly.io           │
                        └───┬───────────┬───────┘
                            │           │
                ┌───────────┘           └────────────┐
                │                                    │
                ▼                                    ▼
       ┌────────────────┐                  ┌────────────────┐
       │  Turso         │                  │  Cloudflare R2 │
       │  (libSQL)      │                  │  (Object       │
       │                │                  │   Storage)     │
       │ central_db     │                  │                │
       │ tenant_a_db    │                  │  領収書画像    │
       │ tenant_b_db    │                  │                │
       │ tenant_n_db    │                  │                │
       └────────────────┘                  └────────────────┘
```

主要要素:

- **FE** (React 19 + TanStack Router): Vite ベースの SPA、Vercel or Cloudflare Pages
- **BE** (Hono on Bun): REST / RPC API、Fly.io
- **DB** (Turso libSQL): Central DB 1 個 + Tenant DB N 個 (DB per tenant)
- **Storage** (Cloudflare R2): 領収書画像、S3 互換、Presigned URL
- **Auth** (better-auth): Session + cookie

## 2. Stack 一覧と選定理由

| Layer | 技術 | 選定理由 |
|---|---|---|
| Runtime | **Bun** | Hono ecosystem 純度、TS native、高速 |
| BE FW | **Hono** | Lightweight、type-safe、Bun と相性 ◎ |
| ORM | **Drizzle** | TS first、libSQL/SQLite 完全対応、migration SQL ファイル |
| Auth | **better-auth** | Hono 公式 adapter、organizations plugin、active dev |
| DB | **Turso (libSQL)** | DB per tenant 実現、Free 100 DB、unlimited $4.99/月 |
| FE FW | **React 19** | ecosystem 巨大、HeroUI / TanStack 対応 |
| Router | **TanStack Router** | File-based + type-safe、TanStack Query 統合 |
| UI | **HeroUI v3** | React Aria 基盤、Tailwind v4、React Compiler compatible |
| Styling | **Tailwind v4** | Zero runtime CSS、OKLCH tokens |
| State | **TanStack Query** | Server state 管理、cache、revalidate |
| Bridge | **Hono RPC (`hc<AppType>`)** | End-to-end 型貫通、codegen 不要 |
| Forms | **React Hook Form + Zod** | 軽量、型安全 schema |
| Storage | **Cloudflare R2** | S3 互換、egress 無料、Free 10GB |
| Compiler | **React Compiler** | Auto-memoization、開発体験向上 |
| Deploy (BE) | **Fly.io** | Bun runtime ネイティブ、scaling |
| Deploy (FE) | **Vercel** or **Cloudflare Pages** | Static SPA、CDN |

## 3. ディレクトリ構成 (monorepo + feature based)

**Feature folders + layered architecture**。各 feature (auth / tenants / members / expenses) は自己完結。Cross-cutting concerns (DB client / middleware / auth config / API client) は `lib/` に集約。

### 3.1 全体構成

```
circle-saas/
├── apps/
│   ├── api/                 # Hono BE
│   └── web/                 # Vite + React FE
├── packages/
│   └── shared/              # 真の共通 (Zod schemas、BE/FE 共有 types)
├── docs/                    # メモ (ignored by git)
├── package.json             # root (workspaces)
├── bun.lock
├── tsconfig.json            # base
└── README.md
```

### 3.2 BE (apps/api)

**3-layer architecture per feature**: `index.ts` (HTTP layer) → `service.ts` (business logic) → `repository.ts` (DB access)。補助: `schema.ts` (Zod validation) / `db.ts` (Drizzle table 定義)。

```
apps/api/
├── src/
│   ├── index.ts                # entrypoint、各 feature を mount
│   ├── lib/                    # cross-cutting concerns
│   │   ├── db/
│   │   │   ├── central.ts      # Central DB Drizzle client
│   │   │   └── tenant.ts       # Tenant DB factory (dynamic connect)
│   │   ├── auth/
│   │   │   └── config.ts       # better-auth config
│   │   └── middleware/
│   │       └── tenant.ts       # tenant resolution middleware
│   └── features/
│       ├── auth/               # better-auth wrapper
│       │   ├── index.ts        # Hono router (HTTP layer)
│       │   ├── service.ts      # business logic
│       │   ├── repository.ts   # central DB (users / sessions)
│       │   └── schema.ts       # Zod validation
│       ├── tenants/            # サークル作成 / 切替
│       │   ├── index.ts
│       │   ├── service.ts
│       │   ├── repository.ts   # central DB (tenants / memberships)
│       │   └── schema.ts
│       ├── members/            # 招待 / role
│       │   ├── index.ts
│       │   ├── service.ts
│       │   ├── repository.ts   # central DB (memberships / invites)
│       │   └── schema.ts
│       └── expenses/           # 立替申請 (core)
│           ├── index.ts
│           ├── service.ts
│           ├── repository.ts   # tenant DB (expenses / events)
│           ├── schema.ts
│           └── db.ts           # tenant DB の Drizzle table 定義
├── drizzle/                    # migration files (central + tenant)
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

### 3.3 FE (apps/web)

```
apps/web/
├── src/
│   ├── main.tsx
│   ├── routes/                 # TanStack Router file-based (URL routes)
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── tenants.tsx
│   │   └── t/
│   │       └── $tenantId/
│   │           ├── index.tsx
│   │           ├── expenses/
│   │           │   ├── index.tsx
│   │           │   ├── new.tsx
│   │           │   └── $id.tsx
│   │           └── members.tsx
│   ├── lib/                    # cross-cutting
│   │   ├── api.ts              # Hono RPC client
│   │   ├── query.ts            # TanStack Query setup
│   │   └── auth.ts
│   └── features/
│       ├── auth/
│       │   ├── components/
│       │   ├── hooks.ts
│       │   └── schema.ts
│       ├── tenants/
│       │   ├── components/
│       │   └── hooks.ts
│       ├── members/
│       │   ├── components/
│       │   └── hooks.ts
│       └── expenses/
│           ├── components/
│           │   ├── ExpenseList.tsx
│           │   ├── ExpenseForm.tsx
│           │   ├── ExpenseDetail.tsx
│           │   └── ApproveActions.tsx
│           ├── hooks.ts
│           └── schema.ts
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### 3.4 Feature folder の構成原則

各 feature 内のファイル役割:

| ファイル | 役割 | レイヤー | 場所 |
|---|---|---|---|
| `index.ts` | Hono router (入力 validation → service 呼び出し → response) | layer 1: HTTP | BE only |
| `service.ts` | business logic、複数 repository 組み合わせ、ステータス遷移ルール | layer 2: domain | BE only |
| `repository.ts` | DB アクセス (Drizzle queries、insert / select / update) | layer 3: data | BE only |
| `db.ts` | Drizzle table 定義 (schema) | ─ | BE only |
| `schema.ts` | Zod validation、types | ─ | BE / FE 共通形式 |
| `components/` | React component | ─ | FE only |
| `hooks.ts` | custom hooks (queries / mutations) | ─ | FE only |

**3-layer の依存方向**: `index.ts → service.ts → repository.ts` (上から下へ一方向)。逆向きは禁止 (repository が service を import しない、service が index.ts を import しない)。

### 3.5 組み立て (BE)

各 feature の `index.ts` は default export で Hono app を返す。Root の `src/index.ts` でそれらを mount。

```typescript
// apps/api/src/features/expenses/index.ts  (layer 1: HTTP)
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import * as service from "./service";
import { createExpenseInput } from "./schema";

const app = new Hono().post(
  "/",
  zValidator("json", createExpenseInput),
  async (c) => {
    const input = c.req.valid("json");
    const expense = await service.createExpense(c, input);
    return c.json(expense);
  },
);

export default app;
```

```typescript
// apps/api/src/features/expenses/service.ts  (layer 2: domain)
import type { Context } from "hono";
import * as repository from "./repository";
import type { CreateExpenseInput } from "./schema";

export async function createExpense(c: Context, input: CreateExpenseInput) {
  const tenantDb = c.get("tenantDb");
  const userId = c.get("session").userId;
  return await repository.insert(tenantDb, {
    ...input,
    userId,
    status: "submitted",
  });
}
```

```typescript
// apps/api/src/features/expenses/repository.ts  (layer 3: data)
import { eq } from "drizzle-orm";
import type { TenantDb } from "@/lib/db/tenant";
import { expenses } from "./db";

export async function insert(db: TenantDb, data: typeof expenses.$inferInsert) {
  const [created] = await db.insert(expenses).values(data).returning();
  return created;
}
```

```typescript
// apps/api/src/index.ts  (entrypoint)
import { Hono } from "hono";
import authApp from "./features/auth";
import tenantsApp from "./features/tenants";
import membersApp from "./features/members";
import expensesApp from "./features/expenses";

const app = new Hono()
  .route("/api/auth", authApp)
  .route("/api/tenants", tenantsApp)
  .route("/api/t/:tenantId/members", membersApp)
  .route("/api/t/:tenantId/expenses", expensesApp);

export type AppType = typeof app;
export default app;
```

### 3.6 packages/shared との関係

`packages/shared` には **BE と FE 両方で使う型 / schema** のみ:

- 共通 Zod schema (e.g. expense input shape)
- enum / 定数 (e.g. `EXPENSE_STATUS`)
- 共通 type alias

Feature 内の schema は **app 内 only** なら `apps/{api,web}/src/features/*/schema.ts` で OK。両方で使う場合のみ `packages/shared` に昇格する。

### 3.7 利点 (なぜ feature based か)

- 各 feature が **自己完結** ─ 削除 / 移動 / 名前変更が楽
- **読みやすい** ─ "expenses 関連" を 1 ディレクトリで把握できる
- 新規 feature 追加が直感的
- `project_beat_lab` で確立した pattern (feature folders + layered architecture)

## 4. Multi-tenant 設計 (DB per tenant)

### 4.1 設計概要

各テナント (サークル) ごとに独立した libSQL DB を持つ **"DB per tenant" pattern**。Turso が安価に大量 DB を提供できることで実現。

利点:

- **完全 data isolation** ─ tenant 間の data leak リスクなし
- **tenant 単位の backup / restore / delete** が trivial
- **noisy neighbor 問題なし**

### 4.2 Central DB / Tenant DB の分離

**Central DB** (1 個、全テナント共通):

```
users          (id, email, name, password_hash, created_at)
tenants        (id, name, db_url, db_token, plan, created_at)
memberships    (id, user_id, tenant_id, role, created_at)
invites        (id, tenant_id, token, expires_at, created_by)
billing_*      (v1.1+)
```

**Tenant DB** (各サークル 1 個):

```
expenses       (id, user_id, amount, date, category,
                memo, receipt_url, status, created_at)
expense_events (id, expense_id, event_type, by_user_id, at)
categories     (id, name)    # MVP は固定 default
```

### 4.3 Middleware による tenant 解決

各 request の流れ:

```
1. Cookie から session を取得 (better-auth)
2. session から user_id を解決
3. URL の path (/api/t/:tenantId/*) から tenant_id を取得
4. Central DB の memberships で (user_id, tenant_id) を validate
5. tenants から該当 tenant の db_url + db_token を取得
6. Tenant DB の Drizzle client を生成して c.set('tenantDb', ...)
7. 後続 handler は c.get('tenantDb') を使って data 操作
```

擬似コード:

```typescript
app.use("/api/t/:tenantId/*", async (c, next) => {
  const session = await getSession(c);
  const tenantId = c.req.param("tenantId");

  const membership = await centralDb.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, session.userId),
      eq(memberships.tenantId, tenantId),
    ),
  });
  if (!membership) throw new HTTPException(403);

  const tenant = await centralDb.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  c.set("tenantDb", createTenantDb(tenant.dbUrl, tenant.dbToken));
  c.set("role", membership.role);
  await next();
});
```

### 4.4 Migration 戦略

**新規 tenant DB 作成時** (サインアップ / サークル作成時):

1. Turso API で `turso db create tenant-<uuid>`
2. 最新 schema の SQL を loop apply
3. `tenants` に db_url + db_token を保存

**schema 変更時** (新 migration):

1. drizzle-kit で migration SQL 生成
2. script で全 tenant_db_url を iterate
3. 各 DB に migration を apply
4. 失敗時は進捗を残して retry 可能に

擬似コード:

```typescript
async function applyMigrationToAllTenants(migrationSql: string) {
  const allTenants = await centralDb.query.tenants.findMany();
  for (const tenant of allTenants) {
    const client = createClient({
      url: tenant.dbUrl,
      authToken: tenant.dbToken,
    });
    try {
      await client.execute(migrationSql);
      console.log(`✓ migrated ${tenant.name}`);
    } catch (e) {
      console.error(`✗ failed ${tenant.name}:`, e);
      // 進捗を残しつつ次へ、後で retry
    }
  }
}
```

## 5. 認証フロー

### 5.1 better-auth 構成

- メール + パスワードで session 発行
- Session は cookie (httpOnly / secure / sameSite=lax)
- `session` table は **Central DB** に保存

### 5.2 サインアップ / ログイン

```
[新規登録]
  POST /api/auth/signup { email, password, name }
    → user 作成 → session 発行 → cookie set

[ログイン]
  POST /api/auth/signin { email, password }
    → password 検証 → session 発行 → cookie set

[ログアウト]
  POST /api/auth/signout
    → session 削除 → cookie clear
```

### 5.3 招待リンクフロー

```
[招待リンク発行] (会計ロールが実行)
  POST /api/t/:tenantId/invites
    → token 生成 (有効期限付き、例: 30 日)
    → 招待 URL 返却 (例: https://app/invite/{token})

[招待リンク経由参加]
  GET /api/invites/:token/info
    → token validate、tenant 情報返却 (未ログインでもOK)
  POST /api/invites/:token/accept (要 session)
    → memberships に user + tenant 追加 (role: member)
```

未ログインでの URL アクセス時は `signup` → `accept` の二段フロー。

## 6. データフロー (立替申請のシーケンス)

```
[メンバー]                  [BE]                    [Tenant DB]    [R2]
   │                          │                         │           │
   │ 1. presign 要求          │                         │           │
   ├─────────────────────────►│                         │           │
   │                          │ 2. signed URL 生成      │           │
   │◄─────────────────────────┤                         │           │
   │ 3. 直接 upload (PUT)     │                         │           │
   ├──────────────────────────────────────────────────────────────►│
   │                          │                         │           │
   │ 4. 申請投稿              │                         │           │
   ├─────────────────────────►│ 5. INSERT expense       │           │
   │                          ├────────────────────────►│           │
   │                          │ 6. INSERT event         │           │
   │                          ├────────────────────────►│           │
   │ 7. status: 申請中        │                         │           │
   │◄─────────────────────────┤                         │           │
   │                          │                         │           │

[会計]                        │                         │           │
   │ 8. 一覧取得              │                         │           │
   ├─────────────────────────►│ 9. SELECT expenses      │           │
   │                          ├────────────────────────►│           │
   │ 10. 承認                 │                         │           │
   ├─────────────────────────►│ 11. UPDATE status       │           │
   │                          ├────────────────────────►│           │
   │ 12. 振込済みフラグ       │                         │           │
   ├─────────────────────────►│ 13. UPDATE status       │           │
   │                          ├────────────────────────►│           │
```

## 7. 領収書 Storage (Cloudflare R2)

### 7.1 R2 採用理由

- S3 互換 (`@aws-sdk/client-s3` で叩ける、ロックインなし)
- Free tier **10GB storage、egress 完全無料**
- 画像以外 (PDF) も扱える

### 7.2 Object key 命名

```
tenants/{tenant_id}/expenses/{expense_id}/{uuid}.{ext}
```

prefix で tenant 区別、object 単位で uuid。

### 7.3 Upload (Presigned PUT)

```
1. FE: 画像選択
2. FE → BE: POST /api/t/:tenantId/expenses/:id/receipt/presign
3. BE: tenant 検証 → R2 用 Presigned PUT URL 発行 (5 分期限)
4. FE: PUT で直接 R2 (BE を通らない)
5. FE → BE: upload 完了通知
6. BE: expenses.receipt_url に object key 保存
```

利点: BE 負荷低い、image traffic が BE 経由しない。

### 7.4 Access (Presigned GET)

```
1. FE: 領収書画像を表示
2. FE → BE: GET /api/t/:tenantId/expenses/:id/receipt
3. BE: tenant 検証 + object key 取得 → Presigned GET URL 発行 (5-10 分期限)
4. FE: URL から直接画像取得
```

### 7.5 Bucket 設計

- **Private bucket** (Public access なし)
- Lifecycle policy (v2 検討): 3 年経過で auto-delete

## 8. Hono RPC による型貫通

### 8.1 仕組み

- `apps/api` で `AppType` を export (Hono の `typeof app`)
- `apps/web` で `import type { AppType } from '@circle/api'`
- `hc<AppType>('http://localhost:3000')` で型付き client
- BE の endpoint / response 型が **コードレベルで FE まで貫通**

### 8.2 サンプル

apps/api:

```typescript
const app = new Hono()
  .get("/api/ping", (c) => c.json({ ok: true }))
  .post(
    "/api/t/:tenantId/expenses",
    zValidator("json", expenseSchema),
    /* ... */
  );

export type AppType = typeof app;
```

apps/web:

```typescript
import { hc } from "hono/client";
import type { AppType } from "@circle/api";

const client = hc<AppType>("/");
const res = await client.api.ping.$get();
const json = await res.json(); // { ok: boolean } と型推論
```

### 8.3 codegen 不要の理由

Hono の `hc<AppType>` は TS の型推論だけで client を生成。OpenAPI / gRPC のような codegen step 不要、BE 変更が即 FE 型に反映される。

## 9. Deploy 構成

### 9.1 BE (Hono + Bun)

- **Fly.io** (Bun runtime ネイティブ)
- region: 東京 (nrt) primary
- secrets: `TURSO_TOKEN` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `AUTH_SECRET`
- Dockerfile: `oven/bun` ベース

### 9.2 FE (Vite SPA)

- **Vercel** or **Cloudflare Pages**
- `apps/web` を build → static deploy
- env: `VITE_API_URL=https://api.example.com`

### 9.3 DB (Turso)

- Central DB: `circle-saas-central` (Tokyo region)
- Tenant DB: 各サークル作成時に programmatic 作成
- Free tier 100 DB → MVP は無料、Developer plan ($4.99/月) で unlimited

### 9.4 Storage (R2)

- Cloudflare R2 bucket: `circle-saas-receipts`
- region: APAC
- Private bucket、Presigned URL 経由のみアクセス

### 9.5 環境

| 環境 | BE URL | FE URL | DB | R2 bucket |
|---|---|---|---|---|
| local | localhost:3000 | localhost:5173 | local libSQL or Turso dev | `*-receipts-dev` |
| staging | (TBD) | (TBD) | Turso staging | `*-receipts-staging` |
| production | api.example.com | app.example.com | Turso production | `*-receipts` |

## 10. 関連ドキュメント

- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義
- [ROADMAP.md](./ROADMAP.md) - Phase 構成 / マイルストーン
