# SocietyOS v1.1 — Workspace Experience release

An incremental UI/UX enhancement to the supplied SocietyOS React/Express application. Existing roles, PostgreSQL models, visitor QR checks and business routes have deliberately not been replaced.

## Added

- **Command Center:** keyboard-accessible Ctrl/⌘+K navigation with search and clear result descriptions.
- **Contextual Launchpad:** role-aware dashboard shortcuts for everyday administration, resident, guard and maintenance tasks.
- Premium overlay styling, mobile layout, keyboard controls and reduced-motion-aware interactions.
- A reproducible GitHub CI workflow and public release security documentation.

## Preserved

- Existing source modules, tests, data model and migrations.
- Backend role and tenant isolation (navigation is not a security boundary).
- QR visitor check-in/out lifecycle, public bearer-token preview and entry-history workflows.
- Multi-role billing, facilities, maintenance, community and reporting features.

## Verification

- JavaScript server files were syntax checked with Node.js 22.16.0.
- Original archive's October 2026 test report describes 54 Vitest and 10 Playwright checks from a previous run; those results are **not** a fresh verification of v1.1.
- This environment could not install a complete npm dependency tree (registry package unavailable), so a fresh Vite build and Vitest/Playwright run are **not confirmed**.
- On first local launch or GitHub CI run, install dependencies and run `npm run build`, `npm test`, and `npm run test:e2e`.
- Live Supabase Auth/Storage and production deployment still require the owner's credentials and staging tests.

## Public-source hygiene

No `.env`, `data/` directory, embedded PGlite data, private uploads, `node_modules`, or stale precompiled `frontend/dist` is included in the clean public ZIP. All original source files, Prisma migrations, tests and documentation are preserved.
