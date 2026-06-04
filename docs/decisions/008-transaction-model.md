# 008: Transaction 上位概念モデル採用 (Phase 3 設計を作り直し)

**Date**: 2026-06-04
**Status**: Accepted

## Context

Phase 3 完了直後、Phase 4 (立替申請ワークフロー) の設計レビューで以下の不足が顕在化した:

1. **画面設計が詰められていない**: ROADMAP の Phase 4 が「立替申請ワークフロー」だけで、テナント内 layout / 設定 / 口座 / dashboard 等の「アプリとしての shell」がそもそも planning されていなかった
2. **機能スコープが狭すぎる**: REQUIREMENTS は実質「立替精算ツール」スコープで、これだと **会計管理アプリではなく Expensify 風の精算ツール** に過ぎない

あさひ (本プロダクト owner、サークル会計係経験者) からの指摘:

- 「**収入 (部費徴収 / 補助金) の記録**」「**直接支出 (口座から直接出た分) の記録**」「**口座 / 現金 残高の把握**」「**活動別 (新歓 / 演奏会 / 文化祭) 集計**」が無いと会計係の仕事は回らない
- 演奏会後に「前回申請からそのイベント終了日までの全取引 + 領収書」を学校に提出して補助金申請する **エクスポート flow** が現場の core 体験

つまり MVP は「立替精算ツール」ではなく「会計管理アプリ」として設計しなおす必要がある。

Phase 3 で実装した `expenses` 単独 schema はこの新スコープと合わない (収入 / 直接支出を表現できない)。

## Decision

### A. Transaction を上位概念 entity にする

`expenses` 単独 table を廃止し、**1 table + type discriminator パターン** の Transaction に統合:

```
Transaction
  type: 'expense' | 'direct' | 'income'
  amount, occurredAt, userId, accountId, categoryId?, description, receiptKey?, status
  ─────────────────────────────────────────────────────────────────────────
  type=expense:  status = pending → approved → paid (or rejected)、Member 投稿可
  type=direct:   status = recorded 固定、Admin のみ、即記録
  type=income:   status = recorded 固定、Admin のみ、即記録
```

### B. Account (口座/現金) を entity 化

`bank` / `cash` の 2 種類のみ。残高は Transaction の現金主義集計で導出 (paid + direct + income)。

### C. Category に `kind` (expense/income) を追加

支出カテゴリ / 収入カテゴリを 1 table に統合、kind で区別。新規 tenant 作成時に default 9 個を seed (支出 5 + 収入 4)。

### D. Activity / Budget / FiscalPeriod は **意図的に entity 化しない**

dogfooding (あさひ会計係経験) で **これらは意識してなかった** と判明:

- 期: 「期を始める」アクションを現場でしたことがない、date range で代替可
- 予算: そもそも立てなかった、振り返り集計で代用可
- 活動: 補助金申請の単位は「前回申請日 〜 イベント終了日」= date range で完結。事後の振り返り集計に必要かは未確認

MVP では:

- 集計 / エクスポートは **date range picker で完結**
- 活動別の表記が欲しければ Transaction.description にベタ書き

v1.1+ で現場 feedback を見て entity 化を再評価する。

### E. Phase 3 を作り直す

Phase 3 で実装した `expenses` / `expense_events` / `categories` を **Phase 3.5** で drop + Transaction 系 4 entity に再生成する。dev tenant は 1 個だけなので delete + 再作成。

## Alternatives Considered

| 案 | 概要 | 不採用理由 |
|---|---|---|
| **expense 単独のまま MVP リリース** | Phase 3 の schema を据え置いて Phase 4 を進める | 「会計管理アプリ」スコープが満たせない、Expensify 風の精算ツールに留まる |
| **3 つの分離 table** (`expenses` / `direct_expenses` / `incomes`) | type 純度高い | 一覧 query で UNION が必要、フィルタ複雑化、Account/Category FK を 3 回書く |
| **Transaction + Activity / Budget / FiscalPeriod entity 全部入り** | 「会計ソフト的に正しい」 | dogfooding 経験で不要と判明、over-engineering |
| **Transaction + Activity を eventTag text field で軽量化** | entity 化せずタグ text + autocomplete で代替 | あさひの flow (補助金申請 = date range) では eventTag すら不要、description ベタ書きで足りる |

## Consequences

### Good

- **一覧 query が単純**: type filter で expense/direct/income を絞れる、UNION なし
- **Drizzle の type-safety**: `$type<ExpenseStatus>()` + Zod `discriminatedUnion` で type ごとに strict validation
- **Account 別残高 / 期間別集計が直接実装可能** (現金主義の単純な SUM)
- **補助金申請業務 (date range エクスポート) が直接 hit**: Transaction を type=all で WHERE occurredAt BETWEEN ? AND ? するだけ
- **将来 entity 化したくなったら column 追加 / table 昇格で済む** (Activity を後で entity 化するなら eventTag text → activities table の back-fill が可能)

### Bad / Risk

- **type ごとに使うカラムが違う**: status は expense のみ、direct/income は recorded 固定。validation 層で頑張る必要 (`discriminatedUnion`)
- **残高計算が status を考慮する必要**: expense の `paid` のみ反映、`pending / approved / rejected` は未確定。境界条件 (差戻し後の再申請等) のテスト要
- **Phase 3 の expenses schema を捨てる手間**: Phase 3.5 として 1 day 想定

### Neutral

- Activity / Budget / FiscalPeriod の v1.1+ での再評価が必要。MVP リリース後の現場 feedback で決まる
- Phase 3 の `expenses` table を実 data が入る前に作り直せるのは幸運 (dev tenant 1 個だけ)

## Mitigation

- **Validation**: Zod `discriminatedUnion` で type=expense / direct / income それぞれの schema を分けて validate (`ROADMAP §6.8`)
- **残高計算**: repository 層に 1 つの SQL に集約、テスト可能な単体関数として切り出す (`ROADMAP §6.9`)
- **Phase 3 ロールバック手順**: dev tenant を delete + 再作成 (memory に snapshot あり)
- **drizzle migration**: 旧 `expenses` を drop してから新 `transactions` を作る一括 migration を Phase 3.5 で生成

## 関連

- データモデル詳細: [DATA-MODEL.md](../DATA-MODEL.md)
- 画面 / IA: [UX-IA.md](../UX-IA.md)
- Phase 構成: [ROADMAP.md](../ROADMAP.md) §2 Phase 3.5 以降
- 機能要件: [REQUIREMENTS.md](../REQUIREMENTS.md) §4
- 学び: [feedback memory: mvp-scope-deduction] ─ 会計ソフト/SaaS の典型抽象 (期/予算/活動 entity) を MVP に入れる前に dogfooding 経験で意識してたか聞く
