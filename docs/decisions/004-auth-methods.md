# 004: 認証方式は email+password と Google OAuth の 2系統

**Date**: 2026-06-04
**Status**: Accepted

## Context

[001-better-auth-adoption](./001-better-auth-adoption.md) で better-auth 採用、[002-session-storage-strategy](./002-session-storage-strategy.md) で session 方式、[003-email-verification-scope](./003-email-verification-scope.md) で verification の scope を決定。

次に、Phase 1 で受け付ける sign in 方式を決定する。

circle-saas の前提:

- ターゲットは大学サークルメンバー (= 大学生中心)
- 大学生は Google アカウント保有率が高い (大学発行 / 個人問わず)
- SNS / OAuth 慣れしていて password 管理は嫌われやすい
- multi-tenant の所属関係は account に紐づき、login flow とは独立 (Slack モデル)。したがって OAuth provider のアカウントが直接 tenant に紐づく構造ではない

## Decision

**email + password** と **Google OAuth** の 2系統を Phase 1 で実装する。

具体:

- better-auth の `emailAndPassword` を有効化
- better-auth の `socialProviders.google` を有効化
- Google OAuth セットアップ作業 (Phase 1 のタスクとして含める):
  1. Google Cloud Console で project 作成 (既存利用可)
  2. OAuth consent screen 設定 (アプリ名 / サポートメール等)
  3. OAuth client ID / secret 発行 (Web application)
  4. Authorized redirect URI に dev (`http://localhost:3000/api/auth/callback/google`) を登録
  5. `apps/api/.env` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を追加 (`.env.example` に placeholder も)
- 同一 email で email+password 登録と Google OAuth ログインが衝突した場合のアカウント紐付けポリシーは better-auth デフォルト (=自動マージ) に従う

## Alternatives Considered

| 候補 | 概要 | 不採用理由 |
|------|------|-----------|
| A. email + password のみ | 古典的、メール基盤不要で最小 | UX 劣化 (password 管理を強いる)、ターゲットの大学生層に対して訴求が弱い。Google OAuth は別 ADR で後付け可能だが、Phase 1 に追加するコスト (15-30 分) は許容範囲内 |
| Magic link | メールで毎回ログインリンク送信、password 不要 | メール基盤が必須。[003](./003-email-verification-scope.md) と矛盾するため除外 |
| GitHub OAuth (追加) | 開発者層向け OAuth | ターゲットが大学生一般のため訴求が薄い。将来 v1.1+ で追加余地あり |
| Passkey (WebAuthn) | 生体認証 / デバイス認証 | Phase 1 では過剰。将来の検討候補 |

## Consequences

### Good

- UX が良い (Google ボタン1クリックでサインアップ完了)
- Google OAuth は provider 側で email 検証済みのため、`emailVerified: true` で user 作成可能 ([003](./003-email-verification-scope.md) で grandfather 戦略と整合)
- メール送信基盤不要のまま、2 系統のログイン手段を提供できる
- 大学生ターゲットに対して敷居が低い

### Bad / Risk

- Google Cloud Console 操作 (15-30 分) を Phase 1 のタスクとして組み込む必要がある (ブラウザ操作必須、自動化不可)
- Redirect URI を dev / prod で別管理する運用が発生 (prod URL は Phase 8 deploy 時に追加)
- 同一 email でのアカウント衝突時のマージ挙動を後から見直す可能性 (better-auth デフォルトに乗せる前提)

### Neutral

- password 認証も並存させるため、password reset 機能は引き続き Phase 6 (メール基盤と一緒) で実装
- GitHub OAuth / Passkey などの追加は将来別 ADR で独立に判断可能
