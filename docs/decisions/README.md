# Architecture Decision Records (ADR)

このディレクトリには、プロジェクトの設計判断を残す ADR (Architecture Decision Record) を置く。

## なぜ ADR を残すか

solo + AI 開発では、未来の自分や新しい AI session が「なぜこの選択をしたか」を理解できることが最重要。コードは "what" は語るが "why" は語らない。ADR は **why** を残すための仕組み。

## いつ書くか

- 新しい技術・ライブラリの採用 / 不採用を決めたとき
- アーキ上の重要な選択をしたとき (例: DB per tenant、auth 方式)
- 後から「なぜこうした?」と聞かれそうな判断をしたとき

書かなくていいもの:
- 自明な実装詳細 (コード読めば分かる)
- 一時的な暫定対応

## 書き方

1. ファイル名: `NNN-short-kebab-case.md` (例: `001-better-auth-adoption.md`)
2. 番号は連番、欠番 OK (中止した ADR は番号空けたまま `Status: Rejected` で残す)
3. テンプレ:

```md
# NNN: タイトル

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
何の判断が必要か。背景・制約。

## Decision
何を選んだか。

## Alternatives Considered
- 案A: 概要 → 不採用理由
- 案B: 概要 → 不採用理由

## Consequences
この選択による影響 (good / bad / neutral)。
```

## Status の運用

- **Proposed**: 議論中 / 未確定
- **Accepted**: 確定、有効
- **Deprecated**: もう使わないが、historical context として残す
- **Superseded by ADR-XXX**: 別 ADR に置き換わった (どの ADR か明記)

過去の ADR は **書き換えない**。方針変更時は新 ADR を書いて、古い方の Status を変更する。
