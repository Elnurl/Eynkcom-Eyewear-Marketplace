# EYNƏK.com — eyewear marketplace

Multi-vendor marketplace for optical shops in Bakı and Abşeron. Shops sell the
goods; EYNƏK.com runs the platform and earns a commission. Business rules that
the code must respect live in [`docs/business-rules`](docs/business-rules).

## Stack

| Part | Path | Notes |
| --- | --- | --- |
| Storefront, seller and admin UI | `artifacts/eynek-marketplace` | React 19, Vite, Tailwind, wouter |
| API | `artifacts/api-server` | Express 5; in production it also serves the built storefront |
| Database schema + migrations | `lib/db` | Drizzle ORM, Postgres; migrations in `lib/db/drizzle` |
| API contract | `lib/api-spec/openapi.yaml` | Orval generates `lib/api-client-react` and `lib/api-zod` |

Auth is Clerk. Seller product images go to S3-compatible storage (Cloudflare R2).

## Local development

Requirements: Node 24, pnpm 11, a Postgres database.

```bash
pnpm install
cp .env.example .env        # fill in DATABASE_URL, Clerk and S3 values
pnpm dev:api                # API on :5000, applies migrations on start
pnpm dev:web                # storefront on :5173, proxies /api to :5000
```

Other commands:

```bash
pnpm typecheck
pnpm test                                        # API access-control tests
pnpm --filter @workspace/api-spec run codegen    # after editing openapi.yaml
pnpm --filter @workspace/db run generate --name <change>   # after editing the schema
```

Schema changes always go through a new migration file; the API applies pending
migrations at startup (`RUN_MIGRATIONS=false` disables this).

## Deployment (Render)

`render.yaml` defines the web service and the Postgres database (Frankfurt).

1. Render → **New → Blueprint** → select this repository, fill in the secret values.
2. Clerk dashboard:
   - **Sessions → Customize session token**:
     `{ "userId": "{{user.id}}", "email": "{{user.primary_email_address}}" }`
     (the API rejects sessions without both claims)
   - Production instance: set the proxy URL to `https://xn--eynk-x6b.com/api/__clerk`
     and use the same value for `VITE_CLERK_PROXY_URL`.
3. R2 bucket → **CORS policy**: allow `PUT` from `https://xn--eynk-x6b.com` with the
   `Content-Type` header (the browser uploads images straight to the bucket).
4. Render service → **Settings → Custom Domains**: add `xn--eynk-x6b.com` and
   `www.xn--eynk-x6b.com`, then point DNS at the service as Render instructs.

Health check: `GET /api/healthz`.
