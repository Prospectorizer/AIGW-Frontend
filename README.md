# AI Prospector UI

Next.js App Router, React, and TypeScript. Next.js proxies `/api` and `/v1`
to the Go AIGW backend on `127.0.0.1:8000`.

Start this UI in its own terminal:

```bash
cd /home/vichu/Documents/Hustle/.ai-infra-lab/AIGW-Frontend
export PATH=/home/vichu/.nvm/versions/node/v22.19.0/bin:$PATH
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. The UI reads only live API data. An empty database
shows an empty state.

In **Test Lab**, select a provider. The model dropdown reads that provider's
live model endpoint. llama.cpp lists its currently loaded model; Ollama lists
its installed models; OpenAI-compatible providers, Anthropic, and Gemini expose
model catalogs. Test Lab also shows model IDs saved in the database under the
selected provider. Type a new ID and use **Save model**, or send a successful
inference request with it to save it automatically. Failed requests do not add
model IDs. For providers without a model listing endpoint, saved IDs remain
selectable.

The **Providers** page can add an OpenAI-compatible provider with its base URL,
mode, and optional API key environment variable name. Export that variable in
the backend process before adding the provider. The key value is never stored in
SQLite. Custom providers and saved model IDs remain after an API restart.

Start the Go API separately from `../AIGW-Backend` with `go run ./cmd/server`.
Start llama-server separately from `../llama.cpp`. No PID needs to be copied
into the API; it discovers the local llama-server from the listening socket.

Use Node 22 (`/home/vichu/.nvm/versions/node/v22.19.0/bin` in this workspace).
Run `npm run build && npm run start` to check the production Next.js server.
Set `AIGW_API_ORIGIN` before `npm run dev` or `npm run build` to proxy to
another AIGW address.
