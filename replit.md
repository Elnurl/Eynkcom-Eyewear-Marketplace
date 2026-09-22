# Eynək.com Eyewear Marketplace

Eynək.com is a multi-vendor Azerbaijani eyewear marketplace for discovering frames and sunglasses from independent Bakı optical stores.

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
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eynek-marketplace/src/App.tsx` — storefront routes, sample marketplace data, and interaction state
- `artifacts/eynek-marketplace/src/index.css` — the storefront design system and responsive styles
- `artifacts/eynek-marketplace/.replit-artifact/artifact.toml` — artifact routing and managed web workflow

## Architecture decisions

- The first release is a frontend-first experience with local sample marketplace data so browsing and merchandising can be validated before adding persistence.
- The site uses original Eynək.com brand language and visuals, using Zenni Optical only as a broad commerce reference.
- Product, vendor, filter, cart, favorites, quick-view, and virtual try-on state live in the storefront so primary interactions work without a backend.

## Product

Users can browse optical frames and sunglasses, filter by shape and attributes, search and sort products, inspect seller details and frame measurements, save favorites, add items to cart, open vendor storefronts, and launch a virtual try-on overlay.

## User preferences

- Use Zenni Optical for reference only; keep Eynək.com branding, product language, and visuals original.

## Gotchas

- The storefront is currently local-data driven; connect API/database persistence before treating cart, inventory, or vendor catalog data as production records.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
