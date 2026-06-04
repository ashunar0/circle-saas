# 003: email verification は Phase 1 では機構を組まず、schema だけ準備する

**Date**: 2026-06-04
**Status**: Accepted

## Context

[001-better-auth-adoption](./001-better-auth-adoption.md) で better-auth 採用、[002-session-storage-strategy](./002-session-storage-strategy.md) で session 方式を決定。次に、サインアップ時に email verification (確認メール送信 → リンク click でアクティベート) を Phase 1 で組み込むかを決める必要がある。

verification を実装するには以下が必要:

- メール送信サービス (Resend / Postmark など) の契約
- ドメイン認証 (SPF / DKIM / DMARC) の設定
- 開発環境向けの local メール検証ツール (Mailpit 等)
- メール本文テンプレ
- verification token の発行・検証 flow

これらは Phase 6 (メンバー管理 / 招待リンク) でもメール送信基盤が必要になるため、タイミングを揃えるか、Phase 1 で先取りするかが論点。

## Decision

**Phase 1 では verification 機構を組まない。schema だけ better-auth デフォルトに乗せて準備しておき、Phase 6 でメール基盤と合わせて有効化する。**

具体的には:

- better-auth の `user.emailVerified` field をそのまま採用 (default `false`)
- `requireEmailVerification` 設定は **false** にし、サインアップ直後からログイン可能とする
- Phase 6 でメール送信基盤を整備するタイミングで `requireEmailVerification: true` に切り替える
- 切り替え時の既存 user は `emailVerified: true` で grandfather 扱い (Phase 6 で再判断)

## Alternatives Considered

| 候補 | 概要 | 不採用理由 |
|------|------|-----------|
| A. Phase 1 で verification 必須 | メール基盤を Phase 1 で組み、サインアップに verification を必須化する | Phase 1 の scope が膨らみ、auth flow への集中が阻害される。メール基盤を Phase 6 でも要求するため、二度手間ではないものの先取りメリットが小さい |
| B. Phase 1 で何もせず、schema にも追加しない | verification の存在自体を後回し | 後から `emailVerified` field を migration で追加し、既存 user の扱いを再設計する必要が出る。better-auth が標準で field を持つため、避ける合理的理由がない |

## Consequences

### Good

- Phase 1 が auth flow 本体に集中できる (sign up / sign in / session 管理)
- Phase 6 でメール送信基盤を組むタイミングと自然に揃う
- better-auth schema をそのまま使うため、Phase 1 での追加実装ゼロ
- 将来 verification を有効化しても schema migration 不要

### Bad / Risk

- Phase 1 完了〜Phase 6 着手の間、fake / typo email でのサインアップが可能 (個人開発の初期段階なので実害は実質ない想定)
- Phase 6 で `requireEmailVerification: true` に切り替えた瞬間、既存 user の扱いを再設計する必要がある (grandfather か強制再検証か)

### Neutral

- password reset 機能もメール基盤に依存するため、同様に Phase 6 で組む方針が自然 (本 ADR の scope 外、必要に応じて別 ADR で明示)
