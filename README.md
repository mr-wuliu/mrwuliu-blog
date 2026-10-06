# Blog

A personal blog powered by [Cloudflare Workers](https://workers.cloudflare.com/), built with [Hono](https://hono.dev/), D1, R2, and React.

Live site: [https://mrwuliu.top/](https://mrwuliu.top/)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Cloudflare Workers (Hono framework) |
| Database | D1 (SQLite), managed via [Drizzle ORM](https://orm.drizzle.team/) |
| Storage | R2 for images |
| Public Site | SSR with `hono/jsx` server-side rendered views |
| Admin Panel | Vite + React SPA (in `/admin`), built to `/public/admin` |
| Styling | Tailwind CSS |
| i18n | Custom implementation with `zh` / `en` locales |
| Testing | [Vitest](https://vitest.dev/) with `@cloudflare/vitest-pool-workers` |
| CI/CD | GitHub Actions (typecheck → test → build → deploy) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)

## Getting Started

### 1. Install dependencies

```bash
npm install
cd admin && npm install && cd ..
```

### 2. Start dev server

This project uses `dev.sh` as the unified dev server entry point:

```bash
./dev.sh start      # Start dev server on :8787 (auto-builds admin SPA if needed)
./dev.sh stop       # Stop dev server
./dev.sh restart    # Stop then start
./dev.sh migrate    # Apply D1 migrations locally
./dev.sh status     # Show server status
./dev.sh logs       # Tail server logs
```

### 3. Open in browser

- Public site: [http://localhost:8787](http://localhost:8787)
- Admin panel: [http://localhost:8787/admin](http://localhost:8787/admin)

## Project Structure

```
├── admin/                  # Admin SPA (Vite + React)
│   └── src/
├── migrations/             # D1 database migrations
├── public/                 # Static assets (admin SPA output)
├── scripts/
│   ├── build.sh            # Production build script
│   └── seed.sh             # Database seeding
├── src/
│   ├── db/                 # Database schema, queries, and connection
│   ├── i18n/               # Internationalization (zh/en locales)
│   ├── middleware/          # Hono middleware (security headers, CORS, etc.)
│   ├── routes/             # API and page route handlers
│   ├── services/           # Business logic layer
│   ├── styles/             # Shared stylesheets
│   ├── utils/              # Utility functions
│   ├── views/              # SSR view components (hono/jsx)
│   │   └── components/     # Reusable UI components
│   └── index.ts            # Worker entry point
├── tests/                  # Vitest test files
├── .github/workflows/      # CI/CD pipelines
│   ├── ci.yml              # Continuous integration
│   └── deploy.yml          # Production deployment
├── drizzle.config.ts       # Drizzle ORM configuration
├── vitest.config.ts        # Vitest configuration
├── tsconfig.json           # TypeScript configuration
└── wrangler.toml           # Cloudflare Workers configuration
```

## Database

This project uses [Drizzle ORM](https://orm.drizzle.team/) with Cloudflare D1 (SQLite).

### Modify schema

1. Edit `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply locally: `./dev.sh migrate`
4. Apply to production: `npm run db:migrate:prod`

The migration commands use `scripts/migrate.mjs`. Before applying generated migrations, it removes duplicate post/tag associations and normalizes historical analytics language values. Afterward, it backfills stored word counts in bounded pages. Migration errors stop deployment. Historical daily analytics had only one row per visitor; repeated page views from before this migration cannot be reconstructed from those rows.

## Testing

```bash
npm test             # Run all tests
npm run typecheck    # Type checking only
```

## Deployment

Deployment is automated via GitHub Actions on tag push (`v*`):

1. Push a version tag: `git tag v1.0.0 && git push origin v1.0.0`
2. CI pipeline runs typecheck and tests
3. Public Tailwind CSS and the admin SPA are built
4. D1 migrations are applied to production
5. Worker is deployed to Cloudflare

Manual deployment:

```bash
npm run deploy
```

`npm run deploy` runs the same typecheck, complete test suite, build, and migration steps before deploying. It accepts `CLOUDFLARE_API_TOKEN` or the existing `CF_API_TOKEN` from `.env`.

API authentication accepts an API key, a verified Cloudflare Access JWT, or an admin session. Hostnames and the presence of Access headers do not grant access. To use Cloudflare Access, configure both `ACCESS_TEAM_DOMAIN` (your `*.cloudflareaccess.com` team domain) and `ACCESS_AUD` (the application's audience tag) as production Worker secrets. The deployment workflow also accepts these two GitHub secrets. Local API bypass requires both `ENVIRONMENT=development` and `DISABLE_API_AUTH=true`; production disables it.

## Available Scripts

| Command | Description |
|---|---|
| `./dev.sh start` | Start local dev server |
| `./dev.sh stop` | Stop dev server |
| `./dev.sh migrate` | Apply D1 migrations locally |
| `npm test` | Run tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate:prod` | Apply migrations to production |
| `npm run deploy` | Build and deploy to production |
| `npm run dev:admin` | Start admin SPA dev server |

## License

Private project. All rights reserved.
