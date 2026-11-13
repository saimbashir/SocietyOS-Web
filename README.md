# SocietyOS — a better place to belong

> **v1.1 workspace update:** Press **Ctrl+K / ⌘K** anywhere inside a signed-in workspace to open the new role-aware Command Center. Each dashboard also includes contextual action shortcuts. [Feature guide](docs/QUICK_NAVIGATION.md) · [Release notes](docs/RELEASE_1_1_0.md).

A JavaScript/React community-management project with an Express API and PostgreSQL data. Forest green, navy, sky blue, and soft pink; five separate role workspaces; responsive desktop/mobile layouts.

## Easiest start on Windows
1. Install Node.js 22 LTS or newer.
2. Extract the ZIP completely.
3. Open the `societyos` folder and double-click **START.bat**.
4. Wait for installation to finish, then open **http://localhost:5173**.
5. Select an account card on the sign-in page, enter the password printed in the startup terminal, and click **Sign in securely**. The password is also saved privately in `data/LOCAL_DEMO_LOGIN.txt`. Role selection never grants access by itself.

Keep the command window open. Internet is needed for the first dependency install; the local application then uses a persistent embedded PostgreSQL database. No Python, API key, Docker, or separately installed database server is needed for local use. The demo is explicitly local-only and is disabled in production.

Command alternative (PowerShell, Command Prompt, WSL, macOS or Linux):

```sh
node scripts/start.mjs
```

Manual commands:
```sh
npm ci
npm run prisma:generate
npm run dev
```

The API listens on http://localhost:4000; Vite proxies `/api` from http://localhost:5173. Data lives in `data/postgres`, and private local uploads in `data/uploads`. Keep these folders to preserve local records. A fresh extraction starts with two fictional societies. Back up the data directory only while the application is stopped.

## Screen design and access
The interface follows the 13 supplied screen references: dark forest/navy sidebar, pale workspace, white rounded panels, teal actions, blue/pink charts, aligned summary cards and role-specific layouts. See `docs/SCREEN_MAP.md`. Figures come from database records and therefore differ from the static mockups. All product pages, including the landing page, require sign-in. Only sign-in, registration and account recovery are accessible while signed out. API permission checks run independently of the UI.

## What works
- Sign-in-gated website and all workspaces; login/signup/recovery, local sessions, Supabase-auth configuration, society creation, invitations, profile editing.
- Platform overview/access suspension, society selection, role permissions and tenant isolation.
- Buildings, floors, units, occupancy assignments, people, manual invitations, unit CSV import, CSV export, edit/remove for basic entities.
- Secure visitor QR passes, entry/exit verification, limited entries, expiration, camera scanning when supported, manual token fallback.
- Maintenance creation, assignment, work progress, resolution, resident confirmation, reopening, comments and evidence uploads.
- Invoices, PDF download, integer monetary amounts, partial payment submissions, protected proof uploads and administrator verification.
- Facilities, reservations, approval/cancellation and server/database overlap protection.
- Announcements and emergency broadcasts, events, polls, one vote per person, documents, feedback, lost-and-found, emergency contacts, duty shifts and support requests.
- Database notifications, read state, personal-update preference, 30-second polling, reminders, audit logs, database-derived financial/category charts and a transparent health score.

## Important scope and verification
This is a working project release, **not a certification that every advanced item in the master brief is finished**. Read [the exact completion matrix](docs/FEATURE_CHECKLIST.md) and [test results](docs/TEST_REPORT.md). Hosted Supabase Auth/Storage and actual cloud deployment need your account credentials and staging verification. A number of advanced analytics/administration refinements remain listed in that matrix.

## Technology
React JSX, Vite, Tailwind CSS, Motion, Lucide, React Router, TanStack Query, React Hook Form, Recharts, Zod, Express, Helmet, CORS, rate limiting, Prisma, Supabase SDK, PDFKit, QRCode, Vitest, Supertest, Playwright.

Local data uses **PGlite**, a PostgreSQL engine compiled to WebAssembly, persisted on disk. Production uses **Supabase PostgreSQL through Prisma**. Business SQL and constraints are shared. Prisma's parameterized raw-query API is used for explicit tenant predicates and locking. SQL migrations are authoritative; do not use `prisma db push` to replace the tenant constraints, triggers, or RLS setup.

## Public GitHub source hygiene

The clean public-release ZIP excludes `node_modules`, the stale pre-built Vite `frontend/dist` directory, `.env`, embedded PGlite data and private uploads. On a fresh checkout, install dependencies and run the build before using the Express production static-file server. These safeguards do not replace reviewing repository history before publication. No license has been assigned; public visibility does not automatically permit reuse.

## Test and build
```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```
The browser suite serves the production frontend build and uses a temporary in-memory database. Run `npm run build` first. Tests do not require your real database. Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an already-installed test browser.

A fresh build could not be verified in the current release environment because the complete npm dependency cache/registry was unavailable. GitHub CI will run `npm ci`, `npm run build`, and `npm test` after the source is pushed; its result must be checked before considering v1.1 verified. Original October 2026 test results remain documented separately.

## Production
See [deployment guide](docs/DEPLOYMENT.md). This ZIP includes Vercel, Render, Supabase setup, private-storage setup and optional scheduled-reminder configuration. No online service has been provisioned or billed.

## Documentation
- [Start here and user manual](docs/USER_MANUAL.md)
- [Requirements and permissions](docs/SRS.md)
- [Architecture, ERD and database](docs/ARCHITECTURE.md)
- [API reference](docs/API.md) and [OpenAPI JSON](docs/openapi.json)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Feature completion matrix](docs/FEATURE_CHECKLIST.md)
- [Testing report](docs/TEST_REPORT.md)
