# AI Prospector UI

Next.js App Router, React, and TypeScript. Next.js proxies `/api` and `/v1`
to the Go AIGW backend on `127.0.0.1:8000`.

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. The UI reads only live API data. An empty database
shows an empty state.

Use Node 22 (`/home/vichu/.nvm/versions/node/v22.19.0/bin` in this workspace).
Run `npm run build && npm run start` to check the production Next.js server.
Set `AIGW_API_ORIGIN` before `npm run dev` or `npm run build` to proxy to
another AIGW address.
