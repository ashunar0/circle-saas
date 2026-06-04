# Roadmap

サークル会計 SaaS の開発フェーズ計画。MVP までのマイルストーン + v1.1 / v2+ の方向性。

## 1. 全体像

```
Phase 0  ─ 環境構築 (scaffold)              ─ 1-2 days
Phase 1  ─ Auth                              ─ 1-2 days
Phase 2  ─ Multi-tenant                      ─ 2-3 days
Phase 3  ─ Tenant DB schema                  ─ 1 day
Phase 4  ─ 立替申請ワークフロー (core)        ─ 3-5 days  ★ MVP 核心
Phase 5  ─ 一覧 / 集計                       ─ 2-3 days
Phase 6  ─ メンバー管理                      ─ 2 days
Phase 7  ─ Polish                            ─ 2 days
Phase 8  ─ Deploy                            ─ 1-2 days
──────────────────────────────────────────────────────
MVP 合計目安: ~15-20 day-equivalent (週末 + 平日夜で 1.5-2 ヶ月)

v1.1 ─ Billing (Stripe)                     ─ MVP 直後

v2+  ─ OCR / 年度引継ぎ / 決算PDF / 通知 / role 拡張 / カテゴリ / 活動別 grouping
```

## 2. Phase 別 detail

### Phase 0: 環境構築 (scaffold)

| Step | 内容 | DOD |
|---|---|---|
| 0.1 ✅ | Bun workspaces monorepo init | `apps/{api,web} + packages/shared`、`bun install` 通る |
| 0.2 | Hono BE 立ち上げ | curl で GET /api/ping が 200 返る |
| 0.3 | Vite + React 19 FE 立ち上げ | localhost:5173 でブランクページ表示 |
| 0.4 | TanStack Router file-based 設定 | / route が表示 |
| 0.5 | Tailwind v4 + HeroUI v3 | HeroUI Button が描画 |
| 0.6 | React Compiler | Compiler が動いてる証跡 |
| 0.7 | Hono RPC 型貫通 | `hc<AppType>` から /api/ping を型付き call |
| 0.8 | Drizzle + Turso central DB + first migration | `drizzle-kit push` 通る、DB 接続確認 |

### Phase 1: Auth

- better-auth セットアップ (email / password、session、cookie)
- Central DB に `users` / `sessions` table
- BE: `/api/auth/*` エンドポイント
- FE: `/login` / `/signup` / ProtectedRoute

**DOD**: ログイン後 session が確立し、保護ルートにアクセスできる

### Phase 2: Multi-tenant

- better-auth organizations plugin (or 自作 tenant table)
- Central DB: `tenants` / `memberships` / `invites`
- BE: `POST /api/tenants` (新規作成時に Turso API で tenant DB 作成 + schema apply)
- middleware: tenant 識別 → DB 接続 attach
- FE: `/tenants` (所属一覧 + 新規作成)、サークル切替 UI

**DOD**: ユーザーが複数サークル所属できる、切替できる、各 tenant DB が物理的に独立

### Phase 3: Tenant DB schema

- Tenant DB schema: `expenses` / `expense_events` / `categories`
- migration を全 tenant DB に loop apply するスクリプト
- seed (dev で 1-2 tenant に sample data)

**DOD**: 全 tenant DB に schema 適用、seed 投入確認

### Phase 4: 立替申請ワークフロー ★ MVP 核心

- BE: `POST /api/t/:tenantId/expenses` (申請)
- BE: `PATCH /api/t/:tenantId/expenses/:id/approve | reject | paid` (status 遷移)
- BE: `GET /api/t/:tenantId/expenses` (一覧)
- BE: Presigned URL endpoints (R2 upload / access)
- FE: `/t/:tenantId` (一覧) / `/t/:tenantId/expenses/new` / `/t/:tenantId/expenses/:id`
- 領収書画像 upload (Presigned PUT)
- status 遷移: 申請中 → 承認 → 振込済 / 差戻し

**DOD**: end-to-end で 1 申請が完走 (投稿 → 承認 → 振込済み)

### Phase 5: 一覧 / 集計

- HeroUI Table で `expenses` 一覧 (sort / filter / paginate)
- カテゴリ別 + 月別の簡易集計 dashboard
- 自分の申請履歴 (メンバー向け)

**DOD**: 一覧 + 集計が機能、UX 違和感なし

### Phase 6: メンバー管理

- BE: invitation API (作成 / 検証 / 受理)
- BE: 役割変更 API
- FE: `/t/:tenantId/members` (メンバー一覧、招待リンク発行、role 変更)
- onboarding flow (招待リンク → サインアップ → 自動 tenant 参加)

**DOD**: 招待 URL から新規メンバーが参加できる

### Phase 7: Polish

- HeroUI Toast で flash 相当 (成功 / エラー / info)
- React Hook Form + Zod で form validation
- Empty states (申請ない / サークルない / メンバーひとり 等)
- Loading states (Suspense + Skeleton)
- Error boundary

**DOD**: UX が production grade

### Phase 8: Deploy

- BE: Fly.io (Dockerfile 作成、secrets 設定、deploy)
- FE: Vercel or Cloudflare Pages (build setting、env var)
- DB: Turso production
- R2: Production bucket
- ドメイン (TBD)

**DOD**: 本番 URL で MVP が動作

## 3. v1.1: Billing (MVP 直後)

SaaS 練習目的の core 要素なので必須。

- Stripe Checkout + subscription
- Plan: Free / Paid (機能差別化、具体 plan は要設計)
- BE: Stripe webhook → `billing_*` table 更新
- FE: `/t/:tenantId/billing` で plan 確認 / アップグレード
- gated features (例: Free は X 件まで / Paid は無制限)

## 4. v2+: 機能拡張

優先度の目安:

| 機能 | 内容 | 価値 |
|---|---|---|
| **年度引継ぎ wizard** | 前会計の data を新会計に引き渡し | サークル年度替わりで必須、Saifban 参考 |
| **OCR 自動抽出** | 領収書から日付 / 店名 / 金額 | UX 大幅改善、API コスト要検討 |
| **年次決算 PDF** | 大学公認サークル向け収支報告書 | institutional 契約の決め手 |
| **メール / push 通知** | 申請 / 承認時 | engagement 向上 |
| **活動別 grouping** | 新歓 / 夏合宿 / 追いコン 単位 | Saifban 参考、サークル特有 |
| 細かい role | 副会計 / 部長 / 監査 | 大型サークル向け |
| カスタムカテゴリ | tenant 単位でカテゴリ定義 | 柔軟性 |
| 振込銀行 API | 実際の振込実行 | 究極の自動化 |
| i18n | 日本語以外 | 海外展開 |

## 5. マイルストーン (目標日)

仮置き。実装ペースで調整。

| マイルストーン | 内容 | 目標 |
|---|---|---|
| M1 | Phase 0 完了 | 2026-06-08 |
| M2 | Phase 4 (立替フロー) 完了 | 2026-07-05 |
| M3 | Phase 8 (deploy) 完了 = MVP リリース | 2026-07-31 |
| M4 | v1.1 (billing) 完了 | 2026-08-31 |

## 6. 落とし穴と対策

### 6.1 ~~better-auth organizations を DB per tenant 化~~ (✅ ADR 005 で解消)

- **当初の懸念**: better-auth organizations plugin は "全 tenant data が同一 DB" 想定
- **解消**: `additionalFields` で `organization` table に `dbName / dbUrl / dbToken` を持たせて、organization 作成 hook (`afterCreate`) で Turso platform API を叩いて Tenant DB を programmatic に作成する方針に確定 ([ADR 005](./decisions/005-multi-tenant-strategy.md))
- **残課題**: Tenant DB 作成失敗時の rollback (orphan organization が残らないように compensating action 必要)

### 6.2 Turso DB programmatic 作成の rate limit

- **問題**: Turso API には rate limit、大量 tenant 一気作成すると hit
- **対策**: dev では 1-2 tenant で確認、本番は throttle + retry queue
- **Phase**: 2

### 6.3 Migration を全 tenant DB に流す pattern (⚠️ 再オープン)

- **問題**: schema 変更時に全 tenant DB に適用が必要、失敗 / 中断時の handle
- **経緯**: ADR 005 で Turso schema database pattern を採用して解消したつもりだったが、Phase 2.2 で当機能が Turso 公式で deprecated と判明し、[ADR 006](./decisions/006-tenant-db-migration-loop.md) で **loop apply 方式に方針修正**
- **対策**: idempotent な migration、進捗を `organization` table の `schemaVersion` / `lastMigratedAt` で記録、retry script (ADR 006 §Mitigation)
- **Phase**: 3 で具体化 (migration runner と進捗テーブルの実装)

### 6.4 TanStack Router file-based + Hono RPC の型推論負荷

- **問題**: 両方の型推論が大きいと IDE が重くなる
- **対策**: tsconfig paths + isolatedModules、IDE 適度に reload
- **Phase**: 0.7 で確認

### 6.5 領収書 R2 の Presigned URL 期限切れ

- **問題**: 期限切れで upload / view が失敗
- **対策**: Upload 5 分、view 5-10 分、FE で期限切れたら再 fetch
- **Phase**: 4

### 6.6 React Compiler と HeroUI の互換性

- **問題**: HeroUI v3 は React Aria 1.17 基盤で Compiler 互換設計だが、edge case で破綻する可能性
- **対策**: 動作確認、問題出たら個別 component に `'use no memo'`
- **Phase**: 0.6

### 6.7 Bun runtime と一部 npm package の互換性

- **問題**: 一部の npm package が Node.js 前提で Bun で動かない
- **対策**: 主要 stack (Hono / Drizzle / better-auth / Vite) は Bun 対応済み、その他は都度確認
- **Phase**: 随時

## 7. 関連ドキュメント

- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture
