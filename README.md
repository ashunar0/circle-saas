# circle-saas

サークル会計 SaaS（仮名）。詳細構想は brain `/docs/サークル会計SaaS.md` 参照。

## Stack

- **Runtime**: Bun
- **BE**: Hono + Drizzle + better-auth
- **DB**: Turso (libSQL, DB per tenant)
- **FE**: React 19 + TanStack Router (file-based)
- **UI**: HeroUI v3 + Tailwind v4
- **State**: TanStack Query
- **Bridge**: Hono RPC (hc<AppType>)
- **Compiler**: React Compiler
- **Deploy**: Fly.io

## Structure

```
apps/
  api/         Hono BE
  web/         Vite + React FE
packages/
  shared/      Zod schemas, shared types
```

## Dev

```sh
bun install
bun run dev
```
