# Requirements

サークル会計 SaaS (仮名 `circle-saas`) の要件定義書。

## 1. 概要

### 1.1 プロダクトの目的

大学サークルの会計係を「立替精算の情報収集ボトルネック」から解放する、マルチテナント SaaS。法人会計の重さ (仕訳 / 税務 / 会計ソフト連携) を捨てた軽量設計を狙う。

### 1.2 開発の動機

- **練習目的**: SaaS 固有の仕組み (auth / billing / multi-tenant / onboarding / admin) の習熟
- **公開前提**: マネタイズ検証は absolute ではないが、production-level を目指す
- **顧客像の明確さ**: 開発者自身がサークル会計係経験者、pain visible

## 2. ターゲット顧客

### 2.1 一次ターゲット (MVP)

**大学サークル特化**。理由:

- 開発者の半径 50m に N 個の同型顧客が存在 (早稲田 / 慶應 / 東大 ... サークル数万)
- 業種跨ぎ問題なし (全部同じ "サークル会計" ドメイン)
- 開発者本人の経験あり、pain visible

### 2.2 将来射程

非法人小規模団体全般:

- 高校部活 / 同窓会 / OB会 / 社会人サークル / 草野球 / 読書会 / PTA / NPO

## 3. 設計哲学

### 3.1 コンセプト

**"会計知識ゼロで回る、立替精算と収支管理"**

### 3.2 ポジショニング

| 軸 | Expensify / freee | この製品 |
|---|---|---|
| 対象 | 法人 | 非法人小規模団体 |
| 簿記知識 | 必要 | 不要 |
| 税務 | 必須 | なし |
| 価格 | 月数千〜/seat | 部費から払える (月数百〜) |
| onboarding | 経理担当向け | 学生でも 10 分 |

### 3.3 捨てるもの / 残すもの

| 捨てる (法人向けの重さ) | 残す (サークルが本当に要る) |
|---|---|
| 仕訳・複式簿記、勘定科目 | 立替申請 → 承認 → 振込 (Expense ワークフロー) |
| 消費税区分、インボイス | 直接支出 / 収入の現金主義記録 (Direct / Income) |
| 法人税 / 所得税 | 口座 / 現金 残高の把握 (Account 別) |
| 月次 / 四半期決算、部門別損益 | 領収書画像保管 (R2) |
| 会計ソフト連携 (freee / MF) | **補助金申請用 エクスポート (CSV + 領収書 zip)** ★ サークル特有 |
| 仕訳承認の二重ワークフロー | カテゴリ別 / 期間別 集計 (date range で任意期間) |
| 期 / 予算 / 活動 entity の固定化 | 年次 "収支報告書" PDF (v2+) |
| | (期 / 予算 / 活動 tag は MVP では date range / description で代替、現場 feedback で v1.1+ 検討) |

## 4. 機能要件 (MVP)

> データモデルは [DATA-MODEL.md](./DATA-MODEL.md)、画面 / IA は [UX-IA.md](./UX-IA.md)、実装フェーズは [ROADMAP.md](./ROADMAP.md) 参照。

### 4.1 認証

- メール + パスワードでのサインアップ / ログイン (Google OAuth も対応済)
- セッション管理 (cookie ベース、better-auth)
- 招待リンク経由のサインアップ (有効期限あり)
- パスワードリセットは v1.1 後でも可

### 4.2 Multi-tenant

- サークル (テナント) 作成
- ユーザーは複数サークル所属可能
- サークル切替 UI (Sidebar 上部の dropdown)
- ロール 2 種類: **会計 (admin)** / **メンバー (member)** (副会計 / 監査 / 部長は v2+)

### 4.3 取引管理 (Transaction)

サークルの金銭の動きすべて = Transaction (上位概念)。`type` で 3 種を区別:

| type | 何 | 誰が投稿 | status |
|---|---|---|---|
| `expense` | 立替精算 | メンバー (会計も) | 申請中 → 承認済 → 振込済 / 差戻し |
| `direct` | 直接支出 (口座振込、サブスク、振込手数料 等) | 会計のみ | 即記録 (recorded) |
| `income` | 収入 (部費徴収、補助金、イベント収益 等) | 会計のみ | 即記録 (recorded) |

#### 4.3.1 立替申請 (`expense`) ─ コア体験

メンバー自己申請型のワークフロー。会計係の仕事を "情報収集" から "承認" に変える。

**申請投稿** (メンバー or 会計):

- 金額 / 日付 / カテゴリ / 用途メモ / 領収書画像 / どの Account に振込希望か

**ステータス遷移**:

```
申請中 (pending) → 承認済 (approved) → 振込済 (paid) [終]
       ↓                     ↓
   差戻し (会計、rejected) → 申請中 (メンバー再提出)
```

**領収書画像**: Cloudflare R2 に保存、Presigned URL (5-10 分期限) で upload / 閲覧。

#### 4.3.2 直接支出 (`direct`)

会計が口座から直接支払った分の記録。立替を介さない支出。例: 家賃振込、定期サブスク、振込手数料。

- 会計のみ記録可能
- 金額 / 日付 / カテゴリ / どの Account から出たか / 描述 / 領収書画像 (任意)
- `status=recorded` 固定、status 遷移なし
- 会計は後から編集 / 削除可能

#### 4.3.3 収入 (`income`)

サークルへの入金の記録。

- 会計のみ記録可能
- 金額 / 日付 / カテゴリ (部費 / 補助金 / イベント収益 / その他) / どの Account に入ったか / 描述 / 領収書画像 (任意)
- `status=recorded` 固定
- 会計は後から編集 / 削除可能

### 4.4 口座 (Account) と残高

サークルが管理する資金の入れ物。

**Account 仕様:**
- `kind`: `bank` (銀行口座) / `cash` (現金) の 2 種類 (MVP)
- 削除は不可、archive のみ (過去取引と整合性保つため)
- 新規 tenant 作成時に default で `bank: メイン口座` / `cash: 現金` を seed
- 追加 / 編集 / archive は会計のみ

**残高ロジック (現金主義):**
- `income`: 残高に **+amount**
- `expense` で `status=paid`: 残高に **-amount**
- `direct` (常に `recorded`): 残高に **-amount**
- `expense` で `pending / approved / rejected`: 残高未確定 (paid 時点で初めて反映)
- 残高は Transaction の集計で導出、専用 cache table は持たない

### 4.5 取引一覧 / 集計 / ホーム dashboard

**取引一覧 (`/t/$id/transactions/`):**
- 会計: 全件閲覧
- メンバー: 自分の `expense` のみ
- フィルタ: date range (default 今月) / type / category / status / account
- ソート: 日付 / 金額

**ホーム dashboard (`/t/$id/`):**
- 会計視点: 今月の収支カード / 口座残高カード / 承認待ち件数 / 最近の取引 5 件
- メンバー視点: 自分の申請ステータス (申請中 N / 承認済 N / 振込済 N) / 自分の最近 5 件

### 4.6 メンバー管理

- 招待リンク発行 (有効期限: 24h / 7d / 30d 選択、一度きり or 複数回利用切替)
- メンバー一覧表示
- メンバー除名 / ロール変更
- 会計が他に居れば自己脱退可能

### 4.7 エクスポート (補助金申請業務) ★

サークル会計の core flow: イベント (演奏会 / 文化祭 等) 後に、前回申請からそのイベント終了日までの全取引 + 領収書を学校に提出して補助金申請する。

**仕様:**
- date range picker で任意期間を指定 (default 「今月」、shortcut で「直近 30 日」「直近 90 日」「カスタム」)
- 「領収書画像を含める」「CSV のみ」 の切替
- エクスポート実行 → zip download
- zip 構成:
  - `summary.csv` ─ 期間内全 Transaction の一覧 (type / 金額 / 日付 / カテゴリ / 描述 / Account / 申請者)
  - `receipts/<transactionId>.<ext>` ─ 領収書画像 (R2 から取得)
- 会計のみ実行可能

> PDF 形式の収支報告書 (年次決算 PDF) は v2+。

### 4.8 通知

- **MVP は in-app 通知のみ** ─ 申請承認 / 差戻し時に メンバーへ通知
- Header の bell icon dropdown で確認 (独立ページなし)
- メール / push 通知は v2+

## 5. 非機能要件

### 5.1 Performance

- 申請投稿レスポンス: < 500ms (p95)
- 一覧表示: < 1s
- 想定スケール: MVP 段階で 100 サークル × 各 20 メンバー = ~2,000 users

### 5.2 Security

- 全 endpoint は認証必須 (`/api/auth/*` を除く)
- **Tenant 間 data 完全分離**: DB per tenant + middleware で tenant_id 検証
- 領収書画像は **Private bucket + Presigned GET URL** (5〜10 分期限)
- CSRF 対策、XSS 対策、SQL injection 対策 (Drizzle prepared statements)
- パスワードは bcrypt or argon2 hashed (better-auth デフォルト)

### 5.3 Accessibility

- HeroUI v3 + React Aria 基盤 → WCAG AA 準拠の基礎
- キーボード操作可能
- スクリーンリーダー対応

### 5.4 Browser support

- Chrome / Safari / Firefox / Edge の最新 2 バージョン
- Mobile Safari / Chrome Android 対応 (mobile first)
- IE / 古い Edge は対象外

### 5.5 Stack 制約

詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) 参照。

## 6. スコープ外 (v2+)

### v1.1 (MVP 直後)

- **Billing** (Stripe Checkout, subscription plan、free / paid 切替)

### v2+

- **OCR 自動抽出** (領収書から日付 / 店名 / 金額)
- **年度引継ぎ wizard** (前会計の data を新会計に引き渡し)
- **年次 "収支報告書" PDF 生成** (大学公認サークル用)
- **メール / push 通知**
- **振込銀行 API 連携** (実際の振込実行)
- **細かい role** (副会計 / 部長 / 監査)
- **カスタムカテゴリ設定**
- **活動別 grouping** (新歓 / 夏合宿 / 追いコン 等、イベント単位集計 ─ Saifban 流)
- **i18n** (日本語以外への展開)

## 7. 用語集

| 用語 | 説明 |
|---|---|
| **テナント** (Tenant) | 一つのサークル / 学生団体。物理的に DB が分離される単位 |
| **メンバー** (Member) | テナントに所属する個人 |
| **会計** (Treasurer) | テナント内で承認 / 振込権限を持つロール |
| **申請** (Expense) | メンバーが提出する立替精算リクエスト |
| **ステータス** (Status) | 申請の状態: 申請中 / 承認済 / 振込済 / 差戻し |
| **招待リンク** (Invite Link) | 新メンバーをテナントに加える時間制限付き URL |
| **Central DB** | 全テナント共通 DB (users / tenants index / billing) |
| **Tenant DB** | テナントごとに独立した libSQL DB (expenses / memberships) |
