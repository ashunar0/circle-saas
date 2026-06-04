# データモデル

サークル会計 SaaS の Tenant DB 内データモデル。

> Phase 3 で `expenses` 単独を作っていたが、`docs/REQUIREMENTS.md` を「会計管理アプリ」スコープに拡張した経緯で **Transaction 上位概念モデル** に再設計 (詳細は [ADR 008](./decisions/008-transaction-model.md))。
>
> 設計判断の流儀 ([feedback memory: mvp-scope-deduction]): あさひ自身がサークル会計係だった時に意識してなかった概念は MVP に入れない。Budget / FiscalPeriod / Activity entity はすべて削ぎ落として、`Transaction + TransactionEvent + Account + Category` の 4 entity に着地。

## 1. 全体像 (ER)

```
[Tenant DB (per サークル)]

   ┌───────────────────────────────┐
   │  Transaction (取引、core)      │
   │   type:                        │
   │    - expense (立替)            │ ← Member 申請、status 遷移
   │    - direct  (直接支出)        │ ← 会計が即記録
   │    - income  (収入)            │ ← 会計が即記録
   │   ─────────────────────────    │
   │   amount / occurredAt          │
   │   description / receiptKey     │
   │   userId / accountId           │
   │   categoryId? (nullable)       │
   │   status (expense のみ遷移)    │
   └──┬─────────────────────┬───────┘
      │                     │
      │ (N:1)               │ (1:N、expense のみ)
      ▼                     ▼
   Account              TransactionEvent
   (bank / cash)        (status 遷移 log)

   Category (kind: expense / income)
       ▲
       │ (任意: 0..1)
       │
   Transaction.categoryId
```

「期 (FiscalPeriod)」「予算 (Budget)」「活動 (Activity)」は **意図的に entity 化しない**。サークル現場で意識してなかった概念で、集計/エクスポートは全部 **date range** で完結する (§7)。

Central DB (better-auth の users / organization / member / invitation / session ...) は変更なし。`organization.schemaVersion` で各 Tenant DB の migration 進捗を引き続き追う。

## 2. エンティティ詳細

### 2.1 Transaction (取引、core entity)

サークルの金銭の動きを表す **上位概念**。`type` で立替/直接支出/収入を区別 (single-table inheritance pattern)。

| field | 型 | nullable | 補足 |
|---|---|---|---|
| `id` | text (uuid) | no | PK |
| `type` | `expense \| direct \| income` | no | discriminator |
| `userId` | text | no | Central DB `user.id` を参照 (FK は張れない、DB 跨ぐので)。expense は申請者、direct/income は記録者 |
| `amount` | integer | no | 円単位、常に正数 (符号は type で決まる) |
| `occurredAt` | timestamp_ms | no | 取引が発生した日付 (領収書日付 / 振込日) |
| `accountId` | text | no | どの Account から/に動いたか |
| `categoryId` | text | yes | 任意 (set null on category archive) |
| `description` | text | yes | 用途メモ。「新歓飲み代」「6月演奏会 会場費」等、自由記述 |
| `receiptKey` | text | yes | R2 object key (任意、領収書画像) |
| `status` | `pending \| approved \| paid \| rejected \| recorded` | no | expense は遷移、direct/income は常に `recorded` |
| `createdAt` / `updatedAt` | timestamp_ms | no | drizzle 自動 |

**Index:**
- `(type, occurredAt DESC)` ─ 一覧/集計用
- `(userId)` ─ メンバーの自分の履歴用
- `(status)` ─ 承認待ち抽出用
- `(occurredAt)` ─ 月次/期間集計 / エクスポート用

**符号と残高への影響 (現金主義):**
- `type=income`: 残高に **+amount**
- `type=expense` で `status=paid`: 残高に **-amount**
- `type=direct` (常に `status=recorded`): 残高に **-amount**
- `type=expense` で `status=pending | approved | rejected`: **残高未確定** (paid に遷移した時点で初めて反映)

### 2.2 Account (口座/現金)

サークルが管理する資金の入れ物。残高は Transaction の集計で導出。

| field | 型 | 補足 |
|---|---|---|
| `id` | text | PK |
| `name` | text | 例: みずほ銀行 / 部室金庫 |
| `kind` | `bank \| cash` | UI 表示用 |
| `archivedAt` | timestamp_ms | nullable ─ 削除はせず soft archive |
| `createdAt` | timestamp_ms | drizzle 自動 |

**MVP 仕様:**
- 削除は不可、archive のみ (過去取引との整合性のため)
- archive 済 Account は新規 Transaction の `accountId` 選択肢から外れる、既存取引には残る
- 新規 tenant 作成時に default で `bank: メイン口座` と `cash: 現金` を seed

### 2.3 Category (カテゴリ)

支出/収入の分類。`kind` で expense/income を区別。

| field | 型 | 補足 |
|---|---|---|
| `id` | text | PK |
| `name` | text | |
| `kind` | `expense \| income` | discriminator |
| `sortOrder` | integer | 表示順 |
| `archivedAt` | timestamp_ms | nullable |
| `createdAt` | timestamp_ms | |

**Default seed (新規 tenant 時):**
- `expense × 5`: 食費 / 交通費 / 備品 / 通信費 / その他
- `income × 4`: 部費 / 補助金 / イベント収益 / その他収入

**MVP 仕様:**
- カテゴリ追加/編集/並び替え UI は v1.1+
- MVP は default 9 個のままで運用

### 2.4 TransactionEvent (audit log)

`type=expense` の status 遷移のみ log。Direct/Income の編集ログは MVP では取らない (transactions の `updatedAt` カラムで「最終更新時刻」だけ追える)。

| field | 型 |
|---|---|
| `id` | text |
| `transactionId` | text (FK, cascade) |
| `actorId` | text (user id) |
| `action` | `create \| approve \| reject \| pay \| resubmit` |
| `fromStatus` | text (nullable) |
| `toStatus` | text |
| `note` | text (nullable、差戻時の理由など) |
| `createdAt` | timestamp_ms |

## 3. 状態遷移 (Expense status)

```
[member]                          [member]
  ↓ create                          ↓ resubmit
pending  ──── approve ────► approved ──── pay ────► paid
   │            [admin]                    [admin]    (terminal)
   │
   │ reject (admin)
   ▼
rejected (member が resubmit で pending に戻る)
```

`direct` / `income` は `status=recorded` 固定、遷移なし。

## 4. 役割マトリクス

サークル内ロールは 2 種 (`admin` = 会計、`member` = メンバー)。better-auth organizations plugin の `member.role` を使う。

| 操作 | member | admin |
|---|---|---|
| 立替申請 (`expense`) を投稿 | ✓ | ✓ |
| 自分の立替を再提出 (`resubmit`) | ✓ | ✓ |
| 他人の立替を承認/差戻/振込済 | ✗ | ✓ |
| 直接支出 (`direct`) を記録 | ✗ | ✓ |
| 収入 (`income`) を記録 | ✗ | ✓ |
| 自分の取引一覧を見る | ✓ | ✓ |
| 全取引一覧を見る | ✗ | ✓ |
| 残高 / 月次 P/L / 期間集計を見る | △ (自分関連のみ?) | ✓ |
| Account の追加/編集/archive | ✗ | ✓ |
| エクスポート (date range) | ✗ | ✓ |
| メンバー招待/role 変更/除名 | ✗ | ✓ |
| サークル設定変更 | ✗ | ✓ |

> Member が "残高" を見れるかは UX 判断 ─ MVP では「自分の立替の未払い額」だけ見せる、サークル全体の残高は admin だけ、で進める。

## 5. 不変条件 (invariants)

- `Transaction.amount > 0` (符号は type で決まる)
- `Transaction.type=income` の `status` は常に `recorded`
- `Transaction.type=direct` の `status` は常に `recorded`
- `Transaction.type=expense` の `status` は 4 種のいずれか (`pending` / `approved` / `paid` / `rejected`)
- `Account.archivedAt != null` の Account を **新規** Transaction で `accountId` に指定不可。既存 Transaction の参照は残る
- `Category.archivedAt != null` の Category は新規 Transaction で `categoryId` に指定不可。既存 Transaction の参照は残る

## 6. Default seed (新規 tenant 作成時)

`beforeCreateOrganization` hook で migration apply 直後に自動投入:

1. **Account**: `bank: メイン口座` と `cash: 現金` を 2 個 seed
2. **Category**: `expense × 5` + `income × 4` を seed (§2.3)

## 7. 集計とエクスポート (補助金申請業務用)

サークル会計の core flow: **イベント (演奏会 / 文化祭 等) 後に、前回申請からそのイベント終了日までの全取引** を学校に提出して補助金申請。

**集計 / エクスポートは すべて date range picker で完結** ─ entity の "期" や "活動" を持たない。

**MVP 仕様:**
- **取引一覧画面**: date range フィルタで「2026-04-01 〜 2026-06-30」のような任意期間を絞れる
- **エクスポート機能**: date range を選んで download → zip に以下を含む
  - `summary.csv`: 期間内全 Transaction の一覧 (type / 金額 / 日付 / カテゴリ / 描述 / Account)
  - `receipts/<transactionId>.<ext>`: 領収書画像 (R2 から取得)
- **ホーム dashboard**: default 「今月」、フィルタで「直近 30 日」「直近 90 日」「カスタム期間」切替

PDF 形式の収支報告書 (年次決算 PDF) は v2+ (`docs/REQUIREMENTS.md` §6)。

## 8. v1.1+ で追加する想定

- **Activity / イベント tag** ─ 「新歓 2026」「6月演奏会」のような事後集計用 tag。MVP は description ベタ書きで運用、後で eventTag text or entity 化を再評価
- **Budget (予算)** ─ Activity か Category 単位の予算 + 執行率。あさひ現場では使わなかったので v1.1+
- **FiscalPeriod (会計期)** ─ Budget 導入時にセットで考える
- **Category 管理 UI** ─ tenant 側で追加/編集/並び替え
- **メンバー預かり / 未払い Account** ─ 第 3 の Account kind
- **PDF 形式の年次収支報告書** ─ 補助金申請の Polish

詳細は [REQUIREMENTS.md](./REQUIREMENTS.md) §6 参照。
