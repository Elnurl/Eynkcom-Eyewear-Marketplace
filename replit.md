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
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eynek-marketplace/src/App.tsx` — customer marketplace routes, sample marketplace data, and interaction state
- `artifacts/eynek-marketplace/src/index.css` — the EYNƏK design system and responsive styles
- `artifacts/eynek-marketplace/.replit-artifact/artifact.toml` — artifact routing and managed web workflow

## Architecture decisions

- The current release is a frontend-first customer experience with clearly labeled development inventory; persistence and marketplace services are intentionally not faked.
- The site uses original EYNƏK brand language and visuals, using major eyewear sites only as broad UX references.
- The customer surface includes shop, stores, brands, seller onboarding, product detail, wishlist, cart, account, and integration-ready VTO routes.

## Product

Users can browse optical frames and sunglasses, filter by shape and attributes, search and sort products, inspect seller details and frame measurements, save favorites, add items to cart, open vendor storefronts, discover stores and brands, submit a seller application, and launch an integration-ready virtual try-on experience.

## User preferences

- Use eyewear references for UX quality only; keep EYNƏK branding, product language, and visuals original.

## Gotchas

- The customer experience is currently local-data driven; connect API/database persistence before treating cart, inventory, seller applications, or order flows as production records.
- The VTO surface is a provider boundary and preview state, not a real camera or face-tracking implementation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
