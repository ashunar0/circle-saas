# 002: session storage は DB session + httpOnly cookie

**Date**: 2026-06-04
**Status**: Accepted

## Context

[001-better-auth-adoption](./001-better-auth-adoption.md) で better-auth 採用を決定。better-auth は session 管理方式として DB session / JWT / ハイブリッドを選択できるため、circle-saas の前提に合わせて方式を決める必要がある。

circle-saas の前提:

- Hono server 1台構成 (Fly.io 想定)、分散システムではない
- DB は Turso libSQL、Central DB に users / sessions を置く想定
- 将来要件: admin による user kick / session 強制終了、ログイン中デバイス一覧 UI
- Multi-device (PC + スマホ等) からの同時ログイン許可

## Decision

**DB session + httpOnly cookie** 方式を採用する。

具体的な設定:

- Session 保存先: **Central DB** の `session` table (better-auth schema 生成に従う)
- Cookie 属性: `httpOnly; secure; sameSite=lax`
  - `secure` は production のみ (localhost http と両立させるため dev は無効化)
  - `sameSite=lax` は CSRF 緩和と外部リンクからの遷移性のバランス
- Session 有効期限: **7日**
- **Sliding session ON**: アクティブ操作で expiry を再延長 (Slack / GitHub 系の挙動)
- **Multi-device 許可**: 同一 user が複数 session を同時に持てる (PC + スマホ等)

## Alternatives Considered

| 候補 | 概要 | 不採用理由 |
|------|------|-----------|
| JWT (stateless) | 署名済み token を cookie or Authorization header で受け渡し、検証は鍵だけ | revoke が困難 (blacklist or 短期 expiry 必要)、admin による user kick / session 一覧 UI 実装が難しい、鍵漏洩リスク、現段階で stateless のメリット (DB hit 削減 / 分散対応) が活かせる構成ではない |
| ハイブリッド (短期 JWT + 長期 refresh token in DB) | 主流の large-scale パターン | 現段階の規模感に対して過剰、複雑度に見合わない |

Session 有効期限の選択肢:

- **1日**: セキュア寄りだが、再ログイン頻度が高く UX が悪い
- **7日 (採用)**: 一般的な web app の標準ライン (GitHub / Slack 近辺)
- **30日**: UX 良好だがセキュリティリスク増、忘れデバイス問題

## Consequences

### Good

- Revoke が簡単 (DB row 削除のみ)
- Admin による user kick / 強制ログアウト機能を後で素直に実装できる
- 「ログイン中のデバイス一覧」UI を後付け可能
- better-auth デフォルトに乗るため、設定面の落とし穴が最小
- httpOnly cookie で XSS による token 盗難を防げる

### Bad / Risk

- 毎 request で Central DB に session lookup が走る (実測では libSQL は十分速いはずだが、要監視)
- Cookie 方式の宿命として、CSRF 対策を別途意識する必要がある (`sameSite=lax` + better-auth 標準の CSRF 対策で基本足りる想定)

### Neutral

- Sliding session のため、長期未使用 session は自然に expire するが、明示的に「30日無操作で強制 logout」のような cap を設けたい場合は別途 cleanup job が必要 (Phase 1 では不要、将来検討)
