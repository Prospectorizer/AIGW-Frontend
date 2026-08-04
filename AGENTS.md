<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Gateway Dashboard

## Architecture

- Next.js App Router and strict TypeScript.
- Server Components are the default; Client Components are reserved for interaction.
- Keep database access under `src/server` or `src/db` when persistence is added.
- Every future query must enforce organization and project authorization.
- Never expose provider credentials or API-key hashes.
- Use cursor pagination for request logs.
- Keep dashboard APIs separate from the high-throughput gateway service.

## UI and code rules

- Support responsive desktop and mobile layouts.
- Keep filters in URL search parameters when backed by real data.
- Every data view must provide loading, empty, and error states when connected.
- Do not use `any`; validate external input at the server boundary.
- Keep business and authorization logic out of React components.
