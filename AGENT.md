# Blog Project — Development Rules

## Dev Server: Always Use `dev.sh`

This project uses `dev.sh` as the unified dev server entry point.

**NEVER** use `npx wrangler dev`, `npm run dev`, `kill <pid>`, tmux, or nohup to manage the server.

```bash
./dev.sh start     # Start dev server on :8787 (auto-builds admin SPA if needed)
./dev.sh stop      # Stop dev server
./dev.sh restart   # Stop then start
./dev.sh migrate   # Apply D1 migrations locally
./dev.sh status    # Show server status
./dev.sh logs      # Tail server logs
```

If `dev.sh` has a bug or doesn't fit the workflow, **fix dev.sh** — don't work around it.

## Tech Stack

- **Runtime**: Cloudflare Workers (Hono framework)
- **DB**: D1 (SQLite), managed via Drizzle ORM
- **Storage**: R2 for images
- **SSR**: hono/jsx server-side rendered views
- **Admin SPA**: Vite + React (in `/admin`), built to `/public/admin`
- **CSS**: Tailwind utility classes inline in JSX
- **i18n**: Custom `/src/i18n` with zh/en locales

## Database Migrations

1. Edit `src/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate`
3. Apply locally: `./dev.sh migrate`
4. Apply to production: `npm run db:migrate:prod`
