# Decisions — cf-workers-blog

## 2026-03-30 Architecture Decisions
- Hybrid SSR+SPA: Public pages SSR via Hono JSX, Admin SPA via React+Vite
- Single Worker with assets binding for hybrid serving
- Password auth only (no OAuth first version)
- Comments require admin moderation (default status: pending)
- No dark mode first version
- No full-text search first version
- Tests-after strategy (tests in Task 20)
- Minimalist CSS (hand-written, no framework for public pages)
- Tailwind CSS for admin SPA only
