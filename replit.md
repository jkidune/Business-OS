# Workspace

## Overview

BusinessOS — A full-stack business management web app for Rose Beauty Palace (a small retail/beauty supply store in Tanzania). Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, React Query
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── business-os/        # React+Vite frontend (BusinessOS)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## BusinessOS Features

### Epic 1: Dashboard
- Net Profit, Total Revenue, COGS, Marketing Spend KPI cards
- Total Inventory Value (stock × landed cost)
- Low Stock Alerts widget
- Top 3 Best Sellers (7-day / 30-day toggle)

### Epic 2: Product & Inventory Engine
- SKU, Name, Category, Base Unit Name, Selling Price
- Current stock calculated as: purchases (arrived) - sales
- Weighted Average Landed Cost (dynamically calculated)
- Profit Margin % display

### Epic 3: Purchasing (Inflow)
- Log purchase batches with supplier, qty, product cost, transport cost
- Backend calculates landed unit cost: (product_cost + transport_cost) / qty
- Arrival Workflow: Pending → Arrived (stock added on arrival)

### Epic 4: Point of Sale (Outflow)
- Searchable product grid + cart sidebar
- Mobile-first design with slide-up drawer on mobile
- Campaign tag support
- Backend calculates profit (never the frontend)

### Epic 5: Marketing & ROI Tracking
- Campaign management with ad spend tracking
- CPA = ad_spend / units_sold
- ROI % calculation
- Sales linked to campaigns via campaign_id

## Data Model

- **products**: sku (PK), name, category, base_unit_name, selling_price (cents), reorder_threshold, is_active
- **purchases**: id, sku, supplier, quantity_base_units, total_product_cost (cents), transport_cost (cents), landed_unit_cost (cents), status (pending/arrived), purchase_date, arrived_at
- **sales**: id, sku, quantity_sold, total_cash_received (cents), cost_of_goods (cents), profit (cents), campaign_id, sale_date
- **campaigns**: id, name, ad_spend (cents), start_date, end_date

**Currency**: All stored as integers (cents = TZS × 100) to avoid floating-point errors.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- `emitDeclarationOnly` — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes: dashboard, products, purchases, sales, campaigns.

- `pnpm --filter @workspace/api-server run dev` — run the dev server

### `artifacts/business-os` (`@workspace/business-os`)

React + Vite frontend. Pages: Dashboard, POS, Products, Purchases, Campaigns.

- `pnpm --filter @workspace/business-os run dev` — run frontend

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `pnpm --filter @workspace/db run push` — push schema changes

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config.

- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and schemas
