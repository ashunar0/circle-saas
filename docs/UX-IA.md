# UX / Information Architecture

会計管理アプリとしての画面構成 / URL / nav / 役割マトリクス。

> データモデル前提は [DATA-MODEL.md](./DATA-MODEL.md)、機能要件は [REQUIREMENTS.md](./REQUIREMENTS.md)、Phase 別実装順は [ROADMAP.md](./ROADMAP.md)。

## 1. 概要

サークルには 2 種のユーザーがいる:

- **member (メンバー)** ─ 自己申請型の立替精算が core 体験。他の機能は基本見えない
- **admin (会計)** ─ 会計管理アプリ全体が使える。承認 / 直接支出/収入の記録 / 残高把握 / エクスポートまで

→ Member 視点は「Expensify 風の精算ツール」、Admin 視点は「会計管理アプリ」。同じ URL でも role で表示と操作権限が分岐する。

## 2. URL マップ

### 2.1 Public (auth 不要)

| URL | 内容 |
|---|---|
| `/` | landing (MVP は `/signin` redirect でも可) |
| `/signin` | メール+PW / Google OAuth |
| `/signup` | サインアップ |
| `/invite/$token` | 招待リンク受入。未ログイン → signup フローで token 引き継ぎ、ログイン済 → 直接加入 |

### 2.2 認証必須、テナント外

| URL | 内容 |
|---|---|
| `/tenants` | 所属サークル一覧 + 新規作成 (signin 後の landing) |
| `/me` | 自分のプロフィール (sign out、名前変更だけ MVP)。パスワード変更は v1.1+ |

### 2.3 テナント内 `/t/$tenantId/...`

| URL | 内容 | member | admin |
|---|---|---|---|
| `/` | **ホーム dashboard** (今月の収支 / 残高 / 承認待ち / 最近 5 件) | ✓ 自分視点 | ✓ 全体視点 |
| `/transactions/` | 取引一覧 (date range / type / category / status filter) | ✓ 自分の expense のみ | ✓ 全件 |
| `/transactions/new` | 新規取引フォーム | ✓ `type=expense` 固定 | ✓ 全 type 選択 |
| `/transactions/$id` | 取引詳細 (領収書画像 + events log) | ✓ 自分の expense のみ閲覧 + 再提出 | ✓ 全件、承認/差戻/振込済/編集 |
| `/members` | メンバー一覧 + 招待 URL 発行 + role 変更 + 除名 | ✗ | ✓ |
| `/settings` | サークル名 / 口座管理 / 削除 / 脱退 | △ 脱退のみ | ✓ |
| `/export` | エクスポート (date range picker + zip download) | ✗ | ✓ |

合計 **テナント内 7 画面**。口座管理は `/settings` の subsection (Phase 4 で頻度低・固定マスタと判断、独立ページから格下げ)。

> Member は `/members` `/settings` (除く脱退) `/export` にアクセスすると 403。`/transactions/$id` で他人の取引 URL を直叩きしても 403。

## 3. 各画面の責務詳細

### 3.1 `/t/$id/` ホーム dashboard

**Admin 視点:**
- **今月の収支カード**: 収入 / 支出 / 差額
- **口座残高カード**: 全 Account の現在残高 (現金主義集計)
- **承認待ち件数**: クリックで `/transactions/?status=pending` へ
- **最近の取引 5 件**: time-line 形式
- **クイックアクション**: 「収入を記録」「直接支出を記録」 (member には出ない)

**Member 視点:**
- **自分の申請ステータス**: 申請中 N 件 / 承認済み N 件 / 振込済み N 件
- **自分の最近の申請 5 件**
- **クイックアクション**: 「立替申請」(`/transactions/new` への shortcut)

### 3.2 `/t/$id/transactions/` 取引一覧

- 一覧テーブル: 日付 / type バッジ / カテゴリ / 金額 / Account / status バッジ / 描述抜粋
- フィルタ: date range (default 今月) / type / category / status / account (admin だけ全部、member は自分の expense のみ)
- ソート: 日付 / 金額
- 行クリック → `/transactions/$id`
- 上部に「新規取引」ボタン

### 3.3 `/t/$id/transactions/new` 新規取引

- type 選択 (admin だけ): expense / direct / income。Member は expense 固定で UI に表示なし
- 共通フィールド: 金額 / 日付 / カテゴリ / Account / 描述 / 領収書画像 (R2 upload)
- type=expense の時: 申請者 = 自分、status = pending
- type=direct / income の時: 記録者 = 自分、status = recorded

### 3.4 `/t/$id/transactions/$id` 取引詳細

- 表示: 金額 / 日付 / type / カテゴリ / 描述 / Account / 領収書プレビュー (Presigned GET URL、5-10 分期限)
- TransactionEvents (expense only): 申請 → 承認 → 振込み のタイムライン
- アクション (権限別):
  - expense + 自分の申請 + status=rejected: 「再提出」ボタン
  - expense + admin + status=pending: 「承認」「差戻し (理由入力)」ボタン
  - expense + admin + status=approved: 「振込済みにする」ボタン
  - direct/income + admin: 「編集」「削除」ボタン

### 3.5 `/t/$id/members` メンバー管理

- メンバー一覧: 名前 / メール / role / 加入日
- 「招待リンクを発行」: 有効期限 (24h / 7d / 30d) と 一度きり/複数回 を選択して URL 生成
- 「role 変更」: member ↔ admin
- 「除名」: 確認ダイアログで除名
- (admin only)

### 3.6 `/t/$id/settings` サークル設定

- サークル名変更
- ロゴ画像 (v1.1+、MVP は無し)
- **口座管理** (admin only、独立ページから格下げ): Account 一覧 (name / kind / 現在残高 / active|archived) + 追加 + 編集 (name) + archive (物理削除せず archived フラグ)
- 「サークルを削除」: 確認入力 (サークル名タイプ) + 削除実行 → Turso 上の Tenant DB も delete
- 「サークルから脱退」: member 用、admin は自分以外に admin がいない場合は脱退不可

### 3.7 `/t/$id/export` エクスポート

- date range picker (default 「今月」、shortcut で「直近 30 日」「直近 90 日」「カスタム」)
- 「含めるもの」: 領収書画像を含む zip / CSV のみ
- 「エクスポート」ボタン → 数秒待って zip download
- zip 構成: `summary.csv` + `receipts/<transactionId>.<ext>`
- (admin only、補助金申請業務の核心)

## 4. Nav 構造 (Slack スタイル)

### 4.1 Desktop (≥768px)

**Sidebar が全高、Header はコンテント上だけ** (Slack 風)。

```
┌─────────────┬─────────────────────────────────────┐
│ [Tenant ▾]  │ Header (ページタイトル / 🔔 通知)     │
│             ├─────────────────────────────────────┤
│             │                                       │
│ ホーム       │                                       │
│ 取引        │  Content (page-specific)              │
│             │                                       │
│ ── admin ── │                                       │
│ メンバー     │                                       │
│ 設定        │   (口座管理は設定の subsection)        │
│ エクスポート │                                       │
│             │                                       │
│ ─────────── │                                       │
│ [👤 Avatar ▾]│                                      │
└─────────────┴───────────────────────────────────────┘
```

**Sidebar (固定幅 ~240px):**
- 上部: Tenant 切替 dropdown (現在のサークル名 + 他サークル + 「新規作成」)
- 中央: ナビリンク。role で出すリンク切替 (member は「メンバー / 設定 / エクスポート」非表示)
- 下部: Avatar dropdown (`/me` / sign out)

**Header (コンテント上のみ):**
- 左: 現在のページタイトル (例: 「取引一覧」「ホーム」)
- 右: 通知 bell icon (in-app notifications dropdown)
- 検索バーは MVP では無し (v1.1+)

### 4.2 Mobile (<768px)

```
┌─ Header (slim) ────────────┐
│ ☰  ページタイトル        🔔 │
└─────────────────────────────┘
┌─ Content ──────────────────┐
│                             │
│                             │
│              [➕ 新規 FAB]   │
│                             │
└─────────────────────────────┘
┌─ Bottom Tab ───────────────┐
│  ホーム  取引  口座  ⋯       │
└─────────────────────────────┘
```

**Mobile 適応:**
- Sidebar は **drawer** 化 (☰ ハンバーガーで展開、内容は Desktop sidebar と同じ ─ Tenant 切替 / Nav links / Avatar)
- Header は slim、ページタイトル + 通知 bell + drawer toggle
- Bottom tab: 主要 3 リンク (ホーム / 取引 / ⋯)、「⋯」で More メニュー (admin: メンバー / 設定 / エクスポート)
- FAB: member → 立替申請、admin → 取引作成 (type 選択モーダル)

## 5. 役割マトリクス

| 操作 | member | admin |
|---|---|---|
| 立替申請 (`expense`) を投稿 | ✓ | ✓ |
| 自分の立替を再提出 (`resubmit`) | ✓ | ✓ |
| 他人の立替を承認/差戻/振込済 | ✗ | ✓ |
| 直接支出 (`direct`) を記録 | ✗ | ✓ |
| 収入 (`income`) を記録 | ✗ | ✓ |
| 自分の取引一覧 / 詳細を見る | ✓ | ✓ |
| 全取引一覧 / 他人の取引詳細を見る | ✗ | ✓ |
| 残高 / 月次 P/L / 期間集計を見る | ✗ (自分の未払い額のみ) | ✓ |
| Account の追加/編集/archive | ✗ | ✓ |
| エクスポート (date range) | ✗ | ✓ |
| メンバー招待 / role 変更 / 除名 | ✗ | ✓ |
| サークル名 / 削除 | ✗ | ✓ |
| サークルから脱退 | ✓ (自己脱退) | ✓ (admin が他に居れば) |
| 自分のプロフィール (名前変更 / sign out) | ✓ | ✓ |

## 6. 認証ガード

| 範囲 | guard |
|---|---|
| `/` `/signin` `/signup` `/invite/$token` | なし (public) |
| `/tenants` `/me` | session 必須 |
| `/t/$tenantId/*` | session + 当該テナントの membership 必須 (resolveTenant middleware で既に実装済み) |
| `/t/$tenantId/{members,settings,export}` | 上に加えて role=admin 必須 (口座管理は `/settings` の subsection) |
| `/t/$tenantId/transactions/$id` | 上に加えて、member の場合は `userId = session.userId` 必須 (admin は全件 OK) |

middleware は Phase 4 で `requireAdmin` / `requireOwnerOrAdmin` を追加実装する想定。

## 7. ユーザージャーニー例

### 7.1 メンバーの典型 flow (Expensify 風)

```
1. 招待 URL をクリック → signup → 自動で /t/$id/ ホームへ
2. ホームの「立替申請」 FAB をタップ
3. `/transactions/new`: 金額 / 日付 / カテゴリ / Account / 領収書写真 / 描述 を入力 → 送信
4. status = pending、ホームの「申請中 N 件」が +1
5. 数日後、admin が承認/差戻し → in-app 通知 + ホームのカウンタ更新
6. 差戻しなら詳細から「再提出」、承認なら「振込済み」を待つ
7. 振込済みになったらホームから消える (履歴には残る)
```

### 7.2 会計係の月次 flow

```
1. ホームを開く → 承認待ち N 件 / 残高 / 今月収支 を一覧
2. 「承認待ち N 件」 → /transactions/?status=pending
3. 個別に詳細を開いて領収書を確認 → 承認 or 差戻し (理由付き)
4. 承認したものは別途 振込済みフラグを立てる (実振込後)
5. 部費徴収 / 補助金入金があれば「収入を記録」
6. 会場費を口座から直接振込んだら「直接支出を記録」
7. ホームで残高を確認 → 来月の予算感覚を持つ
```

### 7.3 会計係のイベント後 (補助金申請) flow ★ 核心

```
1. 演奏会終了 → /export を開く
2. date range: 前回申請日 〜 演奏会終了日 を指定
3. 「領収書画像を含む zip」 にチェック → エクスポート
4. zip download (summary.csv + receipts/)
5. zip 解凍 → 学校窓口に提出
6. 後日 補助金入金 → /transactions/new で type=income / category=補助金 / amount を記録
```

## 8. 未確定 / v1.1+

- ロゴ画像 (settings) → v1.1+
- パスワード変更 (`/me`) → v1.1+
- in-app 通知センター → MVP は header の bell icon dropdown で完結、独立 URL なし
- カテゴリ管理 UI → v1.1+
- メール / push 通知 → v2+
