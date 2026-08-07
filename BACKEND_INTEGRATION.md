# Go backend integration

The frontend calls the Go service directly. It does not define Next.js API routes.

## Local configuration

Create `.env.local` in the frontend:

```env
NEXT_PUBLIC_AIGW_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_AIGW_GATEWAY_API_KEY=aigw_sk_development_key
```

Set the Go server port in `AIGW-Backend/config.json`:

```json
{
  "server": {
    "port": 5000,
    "read_timeout_seconds": 30,
    "write_timeout_seconds": 120
  }
}
```

The browser currently consumes:

- `GET /health`
- `GET /api/dashboard/overview`
- `GET /api/dashboard/requests`
- `GET /api/dashboard/spend-over-time`
- `GET /api/dashboard/spend-by-model`
- `GET /api/admin/providers`
- `POST /api/admin/providers/create`
- `POST /api/admin/providers/update`
- `POST /api/admin/providers/test`
- `GET /api/admin/models`
- `GET /api/admin/cache/stats`
- `POST /api/admin/cache/clear`
- `POST /v1/chat/completions`

## 1. Add one CORS middleware in Go

Dashboard and admin handlers currently have separate permissive wrappers, while `/health` and `/v1/*` do not consistently return CORS headers. Wrap the root mux once in `cmd/gateway/main.go`:

```go
func allowFrontend(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "http://localhost:3000" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

Then change the HTTP server configuration from `Handler: mux` to:

```go
Handler: allowFrontend(mux),
```

Use an environment-configured allowlist in production. Do not use `*` for authenticated browser traffic.

## 2. Register the existing admin API

`internal/admin/api.go` exists but is not mounted by `cmd/gateway/main.go`. Initialize its MySQL store when `cfg.MySQL.Enabled` is true, then register it on the same mux:

```go
adminStore, err := store.New(cfg.MySQL.DSN)
if err != nil {
	log.Fatalf("initialize admin store: %v", err)
}
defer adminStore.DB().Close()
adminStore.StartReloader(60 * time.Second)
admin.NewAPI(adminStore).RegisterRoutes(mux)
```

Add imports for `internal/admin`, `internal/store`, and a MySQL driver. The repository currently calls `sql.Open("mysql", ...)` but has no MySQL driver registered in `go.mod`. Add one:

```bash
go get github.com/go-sql-driver/mysql
```

and blank-import it in the Go process:

```go
import _ "github.com/go-sql-driver/mysql"
```

Run `migrations/mysql/001_schema.sql` and `002_seed_data.sql` before starting the service.

## 3. Make admin changes affect gateway traffic

Mounting the admin API is not sufficient by itself. The current runnable gateway calls `provider.InitAll(cfg)`, `auth.Middleware(cfg, ...)`, and `proxy.NewHandler(cfg, ...)`, which use static JSON configuration. The MySQL `store.Store` used by the admin package is separate.

Refactor provider resolution, tenant-key lookup, model allowlists, budgets, and cache configuration to read from the shared `store.Store`. Otherwise a provider created in the UI appears in MySQL but is not used by `/v1/chat/completions` until the process/configuration is rebuilt.

## 4. Protect admin and analytics endpoints

The current dashboard and admin APIs are unauthenticated. Before deployment:

- authenticate dashboard users;
- check organization/project membership for every request;
- map the route project to a backend tenant rather than accepting arbitrary tenant query strings;
- reject mutations without owner/admin permission;
- rate-limit admin endpoints;
- never return provider credentials or API-key hashes.

## 5. Encrypt secrets and hash gateway keys

The current MySQL schema stores `providers.api_key` and `tenant_api_keys.api_key` directly. Before production:

- encrypt provider credentials with KMS/envelope encryption;
- store only a key prefix and SHA-256/HMAC hash for virtual gateway keys;
- show a newly created gateway key once;
- redact authorization headers and configured request fields from logs.

The `NEXT_PUBLIC_AIGW_GATEWAY_API_KEY` frontend variable is for local development only because it is included in the browser bundle. Production playground calls need a short-lived, user-scoped key issued by the Go control-plane API.

## 6. Endpoints still required for a complete control plane

The Go backend does not currently expose APIs for request details/payloads, API-key CRUD, routing-rule CRUD, fallbacks, budgets, rate limits, alerts, webhooks, sessions, traces, members, or audit logs. Those screens remain sample UI until corresponding authenticated Go handlers are added.

Use cursor pagination for request logs instead of extending the current numeric `limit` query. A suitable contract is:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "next_cursor": "2026-08-06T12:30:00Z_req_123"
  }
}
```
