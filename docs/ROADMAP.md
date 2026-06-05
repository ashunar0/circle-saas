# Roadmap

サークル会計 SaaS の開発フェーズ計画。MVP までのマイルストーン + v1.1 / v2+ の方向性。

## 1. 全体像

```
Phase 0    ─ 環境構築 (scaffold)                  ─ 1-2 days  ✅
Phase 1    ─ Auth                                  ─ 1-2 days  ✅
Phase 2    ─ Multi-tenant                          ─ 2-3 days  ✅
Phase 3    ─ Tenant DB schema (expense 単独)       ─ 1 day     ✅
Phase 3.5  ─ Tenant DB schema を Transaction 系へ  ─ 1 day     ✅
Phase 4    ─ Tenant Shell + 口座 + 設定            ─ 1.5-2 days
Phase 5    ─ Transaction 投稿系 (★ MVP 核心)        ─ 2.5-3.5 days
Phase 6    ─ 取引一覧 + 残高 + ホーム dashboard     ─ 2.5-3 days
Phase 7    ─ メンバー管理 + エクスポート            ─ 2.5-3 days
Phase 8    ─ Polish + in-app 通知                  ─ 2 days
Phase 9    ─ Deploy                                ─ 1-2 days
──────────────────────────────────────────────────────
MVP 合計目安: ~17-21 day-equivalent (週末 + 平日夜で 2-2.5 ヶ月)

v1.1 ─ Billing (Stripe)                     ─ MVP 直後

v2+  ─ OCR / 年度引継ぎ / 決算PDF / メール通知 / Activity entity / Budget / FiscalPeriod / role 拡張 / カテゴリ管理 UI
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

### Phase 3: Tenant DB schema (expense 単独) ✅ (完了 2026-06-04)

- Tenant DB schema: `expenses` / `expense_events` / `categories`
- migration を全 tenant DB に loop apply するスクリプト (`db:migrate:tenants`)
- 新規 tenant 作成時に migration + default 5 categories を自動適用 (auth hook)
- dev seed (`db:seed:tenant`) で sample expenses を投入

**Done**: 全 tenant DB に schema 適用 / categories 5 件 seed / sample expenses + events 動作確認済み。

> ⚠️ Phase 3 後の設計再検討で MVP を「会計管理アプリ」スコープに拡張、Transaction 上位概念モデル ([DATA-MODEL.md](./DATA-MODEL.md), [ADR 008](./decisions/008-transaction-model.md)) に移行することが決定。Phase 3.5 で Tenant DB schema を再生成する。

### Phase 3.5: Tenant DB schema を Transaction 系に再生成 ✅ (完了 2026-06-05)

- `features/transactions/db.ts` (type=expense/direct/income discriminator、transactions + transaction_events を co-locate)
- `features/accounts/db.ts` (bank/cash 2 種、archivedAt soft archive、default seed 2 件)
- `features/categories/db.ts` に `kind` (expense/income) + `archivedAt` 追加、default seed を 9 件に拡張
- 旧 `features/expenses/db.ts` 削除、`tenant-schema.ts` re-export 更新
- migration 再生成 (0000_bizarre_shiva)、runner を `client.batch('write')` + `CREATE TABLE / INDEX IF NOT EXISTS` で atomic & retry 安全に
- `beforeCreateOrganization` の default seed を Account x 2 + Category x 9 に更新
- code review follow-up: `redactOrgSecrets` の `SECRET_FIELDS` に `schemaVersion` / `lastMigratedAt` 追加 / `TransactionStatus` / `TransactionAction` / `TransactionType` を `packages/shared` に切り出し
- `db:inspect:tenant` dev tool 追加 (table 一覧 + accounts / categories / transactions 集計、旧 schema 検出にも対応)

**Done**: 新規 org `phase-3.5-85eec126` を作成して 4 table + Account 2 + Category 9 + auto-migration + auto-seed が動くことを確認済み。PR #9 で main に merge。

### Phase 4: Tenant Shell + 口座 + 設定

- BE: `requireAdmin` middleware (role guard)
- FE: Tenant 内 Layout (Slack スタイル Sidebar + Header + Avatar dropdown + mobile drawer)
- FE: `/t/:tenantId/` ホーム placeholder
- FE: `/t/:tenantId/accounts` (口座一覧 + 追加 + 編集 + archive)
- FE: `/t/:tenantId/settings` (サークル名 / 削除 / 脱退)
- Tenant 切替 dropdown (Sidebar 上部)
- sign out

**DOD**: ログイン後にサークルを開くと layout が出る、admin で口座管理 / 設定変更 / サークル削除ができる、member で口座 / 設定にアクセスすると 403

### Phase 5: Transaction 投稿系 ★ MVP 核心

- BE: `POST /api/t/:tenantId/transactions` (type 別 validation、admin/member 権限)
- BE: `GET /api/t/:tenantId/transactions/:id` (詳細 + events)
- BE: `PATCH /api/t/:tenantId/transactions/:id` (expense status 遷移、direct/income 編集)
- BE: `DELETE /api/t/:tenantId/transactions/:id` (direct/income のみ、admin)
- BE: Presigned URL endpoints (R2 PUT / GET、5-10 分期限)
- FE: `/t/:tenantId/transactions/new` (type 選択 dropdown for admin、member は expense 固定、画像 upload、フォーム)
- FE: `/t/:tenantId/transactions/:id` (詳細、events タイムライン、承認/差戻/振込済/再提出ボタン)
- status 遷移: pending → approved → paid / rejected (差戻し → pending)

**DOD**: end-to-end で 1 立替申請が完走 (投稿 → 承認 → 振込済み)、admin で 1 収入 + 1 直接支出 が記録できる

### Phase 6: 取引一覧 + 残高 + ホーム dashboard

- BE: `GET /api/t/:tenantId/transactions` (filter: type / status / category / dateRange / userId、role で scope 分岐)
- BE: `GET /api/t/:tenantId/balance` (Account 別 + 全体残高、現金主義集計)
- BE: `GET /api/t/:tenantId/summary` (期間内 P/L: 収入合計 / 支出合計 / 差額)
- FE: `/t/:tenantId/transactions` (HeroUI Table、role で表示分岐、filter 多数)
- FE: `/t/:tenantId/` ホーム dashboard (admin: 残高 / 今月の収支 / 承認待ち / 最近 5 件、member: 自分の申請ステータス / 自分の最近 5 件)

**DOD**: admin で「今月の残高 / 収支 / 承認待ち件数」が一発で見える、member で「自分の申請がどうなってるか」が一発で見える

### Phase 7: メンバー管理 + エクスポート

- BE: invitation API (作成 / 検証 / 受理) ─ better-auth invitation を活用
- BE: role 変更 / 除名 API
- BE: `GET /api/t/:tenantId/export?from=...&to=...&includeReceipts=bool` (CSV + zip 生成、Presigned download)
- FE: `/t/:tenantId/members` (招待リンク発行、role 変更、除名)
- FE: `/t/:tenantId/export` (date range picker、zip download)
- FE: `/invite/:token` (招待受入 onboarding flow ─ 未ログイン → signup フロー、ログイン済 → 直接加入)

**DOD**: 招待 URL から新規メンバーが参加できる、admin が任意期間の取引 + 領収書 zip を出せる (補助金申請に使える)

### Phase 8: Polish + in-app 通知

- HeroUI Toast で flash 相当 (成功 / エラー / info)
- React Hook Form + Zod で form validation 統一
- Empty states (申請ない / サークルない / メンバーひとり 等)
- Loading states (Suspense + Skeleton)
- Error boundary
- in-app 通知: header bell icon dropdown、申請承認/差戻し時に member へ in-app 通知

**DOD**: UX が production grade、member は自分の申請が承認/差戻しされたことを bell でリアルタイム確認できる

### Phase 9: Deploy

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
| **Activity / イベント tag** | 新歓 / 夏合宿 / 演奏会 / 文化祭 単位の事後集計 | MVP は description ベタ書きで運用、現場で欲しくなったら entity 化 |
| **Budget (予算)** | Activity or Category 単位の予算 + 執行率 | あさひ現場では使わなかった、現場 feedback 待ち |
| **FiscalPeriod (会計期)** | 期単位の集計を強制 | Budget 導入時にセット、それまでは date range で OK |
| 細かい role | 副会計 / 部長 / 監査 | 大型サークル向け |
| **カスタムカテゴリ管理 UI** | tenant 単位でカテゴリ追加/編集/並び替え | MVP は default 9 個固定 |
| 振込銀行 API | 実際の振込実行 | 究極の自動化 |
| i18n | 日本語以外 | 海外展開 |

## 5. マイルストーン (目標日)

仮置き。実装ペースで調整。

| マイルストーン | 内容 | 目標 |
|---|---|---|
| M1 | Phase 0 完了 | ✅ 2026-06-03 |
| M2 | Phase 3 完了 | ✅ 2026-06-04 |
| M3 | Phase 5 (Transaction 投稿系) 完了 = MVP の核心体験動く | 2026-07-15 |
| M4 | Phase 9 (deploy) 完了 = MVP リリース | 2026-08-15 |
| M5 | v1.1 (billing) 完了 | 2026-09-15 |

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

### 6.8 Transaction type discriminator の type-safety

- **問題**: 1 table + type discriminator パターンで、type ごとに使うカラム / status の有効値が違うため、TypeScript で type-narrow が効きにくい
- **対策**: Zod の `discriminatedUnion` で type=expense / direct / income それぞれの schema を分けて validate、API layer から service layer まで discriminated union 型で受け渡す
- **Phase**: 5

### 6.9 残高計算の現金主義ロジック

- **問題**: 残高 = 収入 - 確定支出。`expense` で `status=paid` だけが残高に影響、`pending / approved / rejected` は未確定。意外と境界条件が多い (差戻し後の再申請、承認後の取り消し等)
- **対策**: 残高計算は repository 層で 1 つの SQL に集約、テスト可能な単体関数に切り出す。`expense_events` を見れば挙動の歴史も追える
- **Phase**: 6

## 7. 関連ドキュメント

- [REQUIREMENTS.md](./REQUIREMENTS.md) - 要件定義
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture
