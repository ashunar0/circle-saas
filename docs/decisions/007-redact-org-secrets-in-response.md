# 007: organization API response から機密 additionalFields を Hono middleware で redact

**Date**: 2026-06-04
**Status**: Accepted

## Context

[ADR 005](./005-multi-tenant-strategy.md) の Decision A で、Tenant DB 接続情報 (`dbName`, `dbUrl`, `dbToken`) を `better-auth` の `additionalFields` 経由で `organization` テーブルのカラムに相乗りさせる方針を採用した。これにより organization 作成と Tenant DB 物理作成を `beforeCreateOrganization` hook で atomic に紐付ける構造になっている。

しかし Phase 2.2 の動作確認で、`POST /api/auth/organization/create` の response に **`dbName / dbUrl / dbToken` がそのまま JSON として返ってくる** ことが判明した。`better-auth` の organization plugin は created organization の **全カラム** を response に含める仕様で、`additionalFields` で追加したカラムも区別なく含まれる。

これは重大な機密情報漏洩リスク:

- `dbToken` は **Tenant DB の full-access 認証 token**。漏洩した攻撃者は当該 tenant の全データを読み書き / 削除できる
- ブラウザ devtools や CSRF 系の攻撃で取得されると、Central DB を経由せず直接 libSQL に接続して破壊行為が可能
- ADR 005 の Mitigation で「`dbToken` は機密情報、漏洩した場合の影響範囲が大きい」と書きながら、API output ベクトルを見落としていた設計ミス

## Decision

`/api/auth/organization/*` 配下の全 endpoint に Hono middleware (`redactOrgSecrets`) を被せ、**response が JSON の場合は body を再帰的に走査して `dbName` / `dbUrl` / `dbToken` フィールドを除去**する:

```ts
// apps/api/src/lib/middleware/redact-org-secrets.ts
const SECRET_FIELDS = new Set(["dbName", "dbUrl", "dbToken"]);

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (SECRET_FIELDS.has(key)) continue;
      result[key] = redactSecrets(v);
    }
    return result;
  }
  return value;
}

export const redactOrgSecrets: MiddlewareHandler = async (c, next) => {
  await next();
  const contentType = c.res.headers.get("content-type");
  if (!contentType?.includes("application/json")) return;
  // body を clone → JSON parse → redact → 新 Response で上書き
  // ...
};
```

`apps/api/src/index.ts` で `/api/auth/organization/*` に `.use()` で適用する。

BE 内部で `dbUrl` / `dbToken` が必要になる箇所 (Step 2.3 の tenant resolution middleware など) は、Central DB から **直接 SELECT** して取り出す ─ middleware の redact は **API response のみ** に効くので、BE 内部の data flow には影響しない。

## Alternatives Considered

| 案 | 概要 | 不採用理由 |
|---|---|---|
| **better-auth の `additionalFields` に response 除外オプションを使う** | 公式 schema option で `output: false` 的な指定 | `better-auth` 1.6 系には該当オプションが存在しないことを context7 で確認 |
| **`additionalFields` をやめて別 table (`tenant_connection`) に分離** | `organization_id` を FK にした `tenant_connection (dbName, dbUrl, dbToken)` を別途用意し、`organization` は public field のみ | (1) `beforeCreateOrganization` hook では organization レコードが DB に書かれる前なので、FK 制約付き挿入が不可 → `afterCreateOrganization` (副作用のみ) に逃がす必要があり、atomic 性が崩れる。(2) JOIN コストが毎 request で発生 |
| **endpoint を別途生やして自前 wrap する** | `POST /api/auth/organization/create` を hide して、自前の `/api/tenants` を生やす中で redacted な response を返す | better-auth の API を二重定義することになり、組織管理 endpoint (invite, set-active, list 等) も全部 wrap が必要 → middleware 1 枚の方が単純 |

## Consequences

### Good

- **organization 関連の全 endpoint が自動 sanitize** ─ create / get / list / set-active 等すべての response から漏洩を防げる
- **auth schema を汚さない** ─ `additionalFields` の構成を維持できるので、ADR 005 Decision A の atomic 性 (`beforeCreateOrganization` hook で organization + Tenant DB 作成を 1 トランザクション的に扱う) を維持
- **将来の secret 追加に柔軟** ─ `SECRET_FIELDS` に追記するだけで防御範囲を広げられる

### Bad / Risk

- **redact 対象を間違えると漏洩する** ─ 新しい機密フィールドを `additionalFields` に追加した時に `SECRET_FIELDS` への登録を忘れると漏れる。命名規則 (`db*`, `secret*`) ベースの fallback も検討余地あり
- **organization 以外の endpoint で漏れる可能性** ─ `/api/auth/session` などが `activeOrganization` を含むケースが今後出てきた時、redact が効かない (該当 endpoint は `/api/auth/organization/*` 配下ではないため)。Step 2.3 / Step 2.4 で session response の構造を再評価する
- **小さな performance overhead** ─ 各 organization response で `clone() → json() → redactSecrets() → new Response()` が走る。response サイズが小さいので体感差はない想定だが、将来 list 系で大量データになる場合は別途検討
- **`redact` ロジックが副作用なし関数として独立しているか CI で守る仕組みがない** ─ ユニットテスト追加の余地 (Phase 7 で test 入れる時に対応)

### Neutral

- 本 ADR は ADR 005 の **Decision A を否定しない、Mitigation を補強する位置付け** 。ADR 005 の Status を `Accepted` → `Partially superseded by ADR-006 / ADR-007` に更新する
- ARCHITECTURE.md / ROADMAP.md には特に追記不要 (middleware は実装詳細レベル) ─ ただし「機密フィールドの相乗りは middleware redact で扱う」というメモは ARCHITECTURE.md §4.2 に短く追記する

## Mitigation (Phase 3 以降で検討)

- **session response の sanitize** ─ Step 2.3 で session に `activeOrganization` が乗ることが分かったら、redact 範囲を広げる (e.g. `/api/auth/get-session` 等)
- **命名規則ベースの defensive redact** ─ `db*` / `*Token` / `*Secret` で始まる/終わるフィールドを自動的に redact 対象に含める fallback。誤検知リスクとのトレードオフ
- **ユニットテスト** ─ `redactSecrets` を pure function として export し、ネスト object / 配列 / null / 非 JSON response でのケースをテスト (Phase 7 で test 文化を入れる時)
