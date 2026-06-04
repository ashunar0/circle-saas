# 001: better-auth を auth ライブラリとして採用

**Date**: 2026-06-04
**Status**: Accepted

## Context

circle-saas はマルチテナントの SaaS で、以下の auth 要件がある:

- email / password でのサインアップ・サインイン
- session 管理
- 後続 Phase 2 で organizations 機能 (= サークル単位の権限管理) が必要
- Bun + Hono + Drizzle + Turso (libSQL) の stack 上に乗ること
- 学習目的の個人開発のため、self-host 可能で外部 SaaS 依存を避けたい
- 予算は最小 (free tier or self-host で $0 が望ましい)

これらを満たす auth ライブラリ・サービスを選定する必要がある。

## Decision

**better-auth** を採用する。

## Alternatives Considered

| 候補 | 概要 | 不採用理由 |
|------|------|-----------|
| Lucia Auth | TS 軽量 auth lib、かつての定番 | 2024 に作者が "learning resource 化" を宣言、ライブラリとしての active dev は終了 |
| Clerk | hosted SaaS、UI 完成度高、organizations 対応 | $25/mo〜 (free tier 越え時)、vendor lock-in、self-host 不可、学習目的にも合わない |
| Auth0 (Okta) | enterprise grade | 高コスト ($35/mo〜)、機能過剰 |
| Supabase Auth | Supabase バンドル | Turso 採用済みなので stack 不適合 |
| Auth.js (旧 NextAuth) | Next 由来、v5 で多 framework 対応 | Hono adapter はあるが Next-centric な思想、organizations 機能弱い |
| WorkOS | B2B SSO 特化、1M MAU 無料 | enterprise SSO/SCIM 寄りで SMB SaaS には過剰 |
| 自前実装 | JWT + bcrypt + session を自作 | 学習価値はあるが時間が溶ける + security 事故リスク。auth は標準 lib に委ねるのが王道 |

## Consequences

### Good

- Self-host で $0、vendor lock-in なし
- Hono 公式 adapter と Drizzle adapter があり、既存 stack と素直に統合できる
- organizations plugin が multi-tenant 設計の足場になる (Phase 2 で活用)
- 2024 以降に活発化しているライブラリで、Next / Remix / SvelteKit など多 framework 対応 → モメンタムがある

### Bad / Risk

- Lucia 時代より歴史が浅く community 知見が少ない → trouble shoot は GitHub issue 直行になる可能性
- organizations plugin が **同一 DB 前提** で設計されている。circle-saas は DB per tenant 戦略なので、Phase 2 で組み合わせ方を設計する必要がある (`docs/ROADMAP.md` §6 に既出)

### Neutral

- TS ネイティブの schema-first 設計で、Drizzle schema を生成する形式 → migration loop は drizzle-kit に乗る
