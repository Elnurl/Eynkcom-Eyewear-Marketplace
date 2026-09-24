# EYNƏK Eyewear Marketplace

EYNƏK is an Azerbaijan-first multi-vendor eyewear marketplace for discovering frames and sunglasses from independent optical stores.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Authentication: Replit-managed Clerk for identity and sessions; the local users table retains app state and the legacy-ID bridge. Seller/admin access is enforced on the API.
- Clerk provisioning configures signed session claims `userId` (legacy subject/externalId for migrated accounts; native Clerk ID for new accounts) and `email`. The server rejects sessions missing either claim; it never uses an email-only fallback or the Clerk-native ID to look up a migrated local row. New accounts create a local row on their first protected API request.
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eynek-marketplace/src/App.tsx` — customer marketplace routes, sample marketplace data, and interaction state
- `artifacts/eynek-marketplace/src/index.css` — the EYNƏK design system and responsive styles
- `artifacts/eynek-marketplace/.replit-artifact/artifact.toml` — artifact routing and managed web workflow

## Architecture decisions

- The marketplace catalog, seller management, and checkout use the API and database; guest browsing and checkout do not require a Clerk account.
- The site uses original EYNƏK brand language and visuals, using major eyewear sites only as broad UX references.
- The customer surface includes shop, stores, brands, seller onboarding, product detail, wishlist, cart, account, and integration-ready VTO routes.
- Sellers sign in through the branded Clerk pages at `/sign-in` and `/sign-up`; approved shops can manage products and orders through the API.
- Auglio is the planned eyewear VTO provider. Seller products collect separate front (0°) and side (90°) images, each at least 1000 px wide.

## Product

Users can browse optical frames and sunglasses, filter by shape and attributes, search and sort products, inspect seller details and frame measurements, save favorites, add items to cart, open vendor storefronts, discover stores and brands, submit a seller application, and launch an integration-ready virtual try-on experience.

Approved sellers can sign in, review inventory, and add, edit, publish, or delete products from `/seller-panel`.

## User preferences

- Use eyewear references for UX quality only; keep EYNƏK branding, product language, and visuals original.

## Gotchas

- Guest cart and wishlist state remain in the browser; seller inventory, applications, and orders are stored on the server.
- Local data-URL product images are not Google-indexable; production uploads must use object storage and stable public image URLs.
- The VTO surface is a provider boundary and preview state, not a real camera or face-tracking implementation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
