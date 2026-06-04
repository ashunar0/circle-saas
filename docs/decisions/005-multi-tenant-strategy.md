# 005: Multi-tenant 戦略 (better-auth organizations + Turso schema parent DB)

**Date**: 2026-06-04
**Status**: Accepted

## Context

Phase 2 で multi-tenant 構造に着手する。circle-saas は **DB per tenant** 戦略 (ADR 001 / ARCHITECTURE.md §4) を採用しており、各サークルに独立した libSQL DB を持たせる。これを実現するために以下を決める必要がある:

1. **サークル ↔ ユーザの紐付け (memberships) をどう持つか** ─ Central DB に置くのは確定だが、自前 schema にするか better-auth の plugin に乗せるか
2. **招待リンクフロー (invitations) を自作するか plugin で済ますか** ─ Phase 6 のメンバー管理に直結
3. **Tenant DB の物理的な作成 / 削除をどう programmatic にやるか** ─ Turso platform API の使い方
4. **Tenant DB の schema 変更 (migration) をどう全 DB に流すか** ─ ROADMAP §6.3 の落とし穴

ROADMAP 初版 (`docs/ROADMAP.md` §6.1 / §6.3) では「better-auth organizations plugin は同一 DB 前提なので DB per tenant と組み合わせるのが大変」「migration を全 tenant DB に loop apply するのが大変」と懸念していた。Phase 2 着手にあたり改めて better-auth organizations plugin と Turso platform API の現状を調査した結果、**両方とも組み合わせ可能で、当初想定より大幅に楽になる**ことが分かった。本 ADR で方針を確定する。

## Decision

以下 2 つを採用する:

### Decision A: tenants / memberships / invitations は **better-auth organizations plugin** に乗せる

- `organization` / `member` / `invitation` table は plugin が Central DB に自動生成
- `additionalFields` で `organization` table に Tenant DB の接続情報を持たせる:
  - `dbName` (Turso 上の DB 名)
  - `dbUrl` (libSQL connection URL)
  - `dbToken` (DB 専用 auth token)
- サークル作成・招待・受理・現在の active org 切替の API も plugin 提供のものを使う
- role / permission の基盤も plugin に乗る

擬似コード:

```ts
// apps/api/src/lib/auth/config.ts
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  // ... 既存の email/password + Google OAuth 設定
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            dbName:  { type: "string", required: true, input: false },
            dbUrl:   { type: "string", required: true, input: false },
            dbToken: { type: "string", required: true, input: false },
          },
        },
      },
      // organization 作成直後に Turso DB を programmatic に作成する hook
      organizationCreation: {
        afterCreate: async ({ organization, user }) => {
          const tenant = await provisionTenantDb(organization.slug);
          return {
            data: {
              dbName: tenant.name,
              dbUrl: tenant.url,
              dbToken: tenant.token,
            },
          };
        },
      },
    }),
  ],
});
```

### Decision B: Tenant DB は **Turso schema database pattern** で集中管理する

Turso platform API には、DB 作成時に `schema: "<parent-db>"` を指定することで「親 DB の schema を物理的に共有する子 DB」を作る機能がある。これを採用:

- `tenant-schema-parent` という **schema 専用の parent DB** を 1 個用意 (本番 / dev で各 1)
- 各サークル作成時、`schema: "tenant-schema-parent"` を指定して child DB を作成
- schema 変更時は **parent DB に対してだけ** drizzle-kit migration を流せば、全 child DB に物理的に伝播
- 個別の child DB に対する migration loop / 進捗管理 / retry は不要

擬似コード:

```ts
// apps/api/src/lib/db/tenant-provisioning.ts
import { createClient as createTursoClient } from "@tursodatabase/api";

const turso = createTursoClient({
  org: process.env.TURSO_ORG_SLUG!,
  token: process.env.TURSO_PLATFORM_API_TOKEN!,
});

export async function provisionTenantDb(slug: string) {
  const dbName = `tenant-${slug}-${shortId()}`;
  // schema parent から child DB を作成 (schema 自動継承)
  await turso.databases.create(dbName, {
    schema: process.env.TURSO_TENANT_SCHEMA_PARENT!,
    group: "default",
  });
  // DB ごとの専用 token を発行
  const { token } = await turso.databases.createToken(dbName, {
    expiration: "never",
    authorization: "full-access",
  });
  const url = `libsql://${dbName}-${process.env.TURSO_ORG_SLUG}.turso.io`;
  return { name: dbName, url, token };
}
```

migration 運用:

```sh
# Tenant DB schema 変更時
cd apps/api
DATABASE_URL=$TURSO_TENANT_SCHEMA_PARENT_URL bun run db:generate
DATABASE_URL=$TURSO_TENANT_SCHEMA_PARENT_URL bun run db:push
# → 全 child DB に自動伝播
```

## Alternatives Considered

### Decision A の代替

| 案 | 概要 | 不採用理由 |
|---|---|---|
| **自作 tenants / memberships / invites table** | Central DB に Drizzle で自前定義、better-auth は users / sessions のみ | invitation flow / role / active org 切替 を一から書く必要 (Phase 6 が重くなる)。plugin 側のメンテナンスを享受できない |
| **Hybrid (organizations plugin + 別 table で接続情報)** | organization は plugin、dbUrl / dbToken は `tenant_dbs` という別 table に分離 | auth schema をクリーンに保てる利点はあるが、JOIN が増えて middleware が重くなる。MVP では additionalFields で十分 |

### Decision B の代替

| 案 | 概要 | 不採用理由 |
|---|---|---|
| **手動 loop apply (元 ROADMAP §6.3)** | drizzle-kit で migration SQL 生成 → script で全 tenant DB を iterate して apply | 進捗管理 / 失敗時の retry / 部分適用の整合性を全部自前で書く必要。Turso 機能で解決するなら使うべき |
| **migration ごとに新 child を作り直す** | schema 変わったら新しい parent から child を作り直し data を移行 | data 移行が極めて重い。non-starter |

## Consequences

### Good

- **Phase 6 (メンバー管理) が劇的に軽くなる** ─ invitation flow / role / active org 切替を自作しなくて済む
- **落とし穴 6.1 / 6.3 が消える** ─ ROADMAP 初版の 2 大懸念が plugin + Turso の機能で解決
- **schema 変更の運用が単純** ─ parent DB に流すだけで全 tenant に伝播、進捗管理不要
- **`additionalFields` で柔軟性は確保** ─ 将来 region / plan / quota 等を organization に追加可能
- **active organization が session に乗る** ─ middleware で「現在のサークル」を素直に取得できる

### Bad / Risk

- **better-auth plugin への依存が強まる** ─ plugin の breaking change を被る可能性。v1.x 系は active dev で頻繁に更新されているのでウォッチが必要
- **Turso schema database 機能への依存** ─ 他の libSQL ホスティング (e.g. self-host) に移行する場合、migration loop pattern に逆戻りする必要がある。MVP では Turso 前提なので許容
- **`additionalFields` の dbToken は機密情報** ─ Central DB に書き込まれるので、漏洩した場合の影響範囲が大きい。Phase 2 では full-access token を持つが、将来 scope 制限を検討
- **schema parent DB の事故が全 tenant に波及する** ─ parent DB で間違った migration を流すと全 child DB に伝播。dev / prod 分離と migration の事前検証を徹底する
- **plugin の hook 仕様に縛られる** ─ `organizationCreation.afterCreate` が rollback できない場合、Turso DB 作成失敗時の整合性確保が課題 (Consequences の Mitigation 参照)

### Neutral

- ROADMAP §6.1 / §6.3 の落とし穴は本 ADR で解消されたため、ROADMAP を更新する (別 commit で対応)
- ARCHITECTURE.md §4 (Multi-tenant 設計) の table 命名 (`tenants` → `organization`, `memberships` → `member`) を本 ADR に合わせて更新する (別 commit)

## Mitigation (実装時に対応)

- **Tenant DB 作成失敗時の整合性**: `afterCreate` で Turso API が失敗した場合、organization レコードを残すと「dbUrl が null の壊れた org」が残る。Phase 2 実装時に try/catch で organization を削除する compensating action を入れる
- **schema parent DB の保護**: dev / prod で異なる parent を用意、prod parent への migration は手動 review + 必ず staging で先行検証
- **dbToken の rotation**: MVP では `expiration: "never"` で取るが、v1.1+ で rotation 戦略を検討
- **better-auth plugin version pin**: package.json で minor version 固定 (`^` を外す) を検討
