# 006: Tenant DB migration を loop apply で運用する (ADR 005 Decision B を取り下げ)

**Date**: 2026-06-04
**Status**: Accepted

## Context

[ADR 005](./005-multi-tenant-strategy.md) の Decision B で、Tenant DB schema の運用を **Turso schema database pattern** (parent DB を `is_schema: true` で作成、child DB は `schema: "<parent>"` で作成 → schema が自動継承) で行うと決定した。これにより migration を parent DB に流すだけで全 child DB に伝播し、ROADMAP §6.3 の「loop apply の落とし穴」が解消される、という構想だった。

Phase 2.2 で実装してみたところ、以下の問題が判明した:

- **Turso 公式ドキュメントで "Multi-DB Schemas" が "Deprecated" と明記**されている (`docs.turso.tech/features/multi-db-schemas`)。MVP の核心機能を deprecated 機能に依存させるのは長期リスクが大きい
- 動作確認時に「`tenant-schema-parent-dev` is not a shared schema」エラーで弾かれた。schema parent として使うには Platform API で `is_schema: true` 指定が必須 (ダッシュボードからは作成不可)。UX も含めて Turso 側で投資が縮小されている印象

この時点で方針転換を確定する。

## Decision

ADR 005 の **Decision B (Turso schema database pattern) を取り下げ** 、**loop apply 方式** に切り替える:

- Tenant DB は `schema:` を指定せず、普通の child DB として `turso.databases.create(dbName, { group: "default" })` で作成
- schema 変更時は、Central DB の `organization` テーブルから全 tenant 接続情報を引いて、各 Tenant DB に migration SQL を順次適用する script を書く
- script は idempotent に作る (`CREATE TABLE IF NOT EXISTS`, drizzle-kit が生成する SQL に追従) + 進捗を `organization.last_migrated_at` 等で記録する想定 (Phase 3 で具体化)

擬似コード (Phase 3 で書く migration runner):

```ts
import { createClient } from "@libsql/client";

async function applyMigrationToAllTenants(migrationSql: string) {
  const orgs = await centralDb.query.organization.findMany({
    where: isNotNull(organization.dbUrl),
  });
  for (const org of orgs) {
    const client = createClient({ url: org.dbUrl, authToken: org.dbToken });
    try {
      await client.execute(migrationSql);
      await centralDb
        .update(organization)
        .set({ lastMigratedAt: new Date() })
        .where(eq(organization.id, org.id));
    } catch (err) {
      // 進捗を残しつつ次へ、後で retry
      console.error(`✗ failed ${org.slug}:`, err);
    }
  }
}
```

ADR 005 の Decision A (better-auth organizations plugin + `additionalFields` で接続情報を相乗り) は **据え置き** 。Decision B のみ取り下げる。

## Alternatives Considered

| 案 | 概要 | 不採用理由 |
|---|---|---|
| **schema database pattern を deprecated 承知で続行** | Turso が機能を消すまで使う | 将来書き直し必須、MVP 後の負債。`is_schema: true` の Platform API 経由作成も UX 不安 |
| **libSQL embedded replicas / 他 SQL ホスティングに移行** | Turso 依存自体を下げる | Phase 2 のスコープを大きく逸脱、MVP リリースが遠のく |
| **Tenant DB ごとに drizzle-kit を spawn** | 各 tenant DB に対して `drizzle-kit push` を CLI で実行 | tenant 数が増えるとプロセスフォーク数が爆発、運用に不向き |

## Consequences

### Good

- **deprecated 機能依存ゼロ** ─ Turso の機能変更リスクを抱えない
- **将来の self-host / 他 libSQL ホスティングへの移行余地** ─ Turso 固有機能に縛られない設計
- **schema parent DB という追加リソースが不要** ─ `tenant-schema-parent-dev` 等のメンテ対象を持たない

### Bad / Risk

- **ROADMAP §6.3 の落とし穴が再オープン** ─ migration の進捗管理、失敗時の retry、部分適用時の整合性を自前で書く必要 (Phase 3 のスコープ)
- **schema drift のリスク** ─ migration を失敗した tenant がそのまま放置されると、schema が他 tenant とズレる。進捗を `organization` table に記録して可視化する必要

### Neutral

- 本 ADR で ADR 005 の Status を `Accepted` → `Partially superseded by ADR-006` に変更する (Decision B のみ取り下げ、Decision A は据え置き)
- ARCHITECTURE.md §4.4 (Migration 戦略) と ROADMAP.md §6.3 (落とし穴) を整合更新する

## Mitigation (Phase 3 で対応)

- **idempotent migration** ─ drizzle-kit が生成する SQL を idempotent に保つ (`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN` の重複適用ガード)
- **進捗テーブル** ─ `organization` に `schemaVersion` カラム (or `last_migrated_at`) を追加し、各 tenant の migration 進捗を記録
- **retry script** ─ schemaVersion がズレてる tenant だけ拾って再適用するコマンドを用意
- **失敗時の alert** ─ MVP は console.error で十分、Phase 7 (Polish) で構造化ログ / Sentry を入れたら接続
