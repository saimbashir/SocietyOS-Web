# Verification report

Verification date: 17 October 2026. Linux runtime, Node.js 24, embedded PostgreSQL (PGlite). Tests use an isolated in-memory database and fictional accounts. Test-only passwords are not production credentials.

## Automated checks

- Production frontend build: successful. Vite emits a non-blocking warning for the approximately 530 KB vendor chunk; performance tuning remains possible.
- Backend: **54 passing Vitest/Supertest checks**. Includes database readiness, password login/signup, removal of passwordless role entry, anonymous API denial, tenant isolation, role permissions, unknown-field rejection, browser-origin checks, secure QR tokens, visitor check-in/out and replay limits, maintenance state transitions, partial payments and approval, PDF generation, reservation overlap prevention, polls, protected uploads, CSV exports, audit records, invitations, property editing/import, monthly billing, reports and reminder behavior.
- Browser: **10 passing Playwright tests** against the production build (39.8 seconds). Tests cover signed-out direct links, password-required role selection, responsive sign-in, 26 administrator sections, building create/edit, resident complaint and visitor QR flows, mobile navigation, guard/maintenance separation, platform overview, settings, charts, monthly invoices, calendar and sign-out access revocation.

## Visual review

Desktop screenshots at 1440 × 900 were inspected against the supplied screen references. Main checks covered sign-in, dashboard, resident directory, visitor table and QR panel, complaints, invoices, facilities, community/poll panel, analytics, gate console and maintenance layout. A 390-pixel mobile dashboard was checked for overflow. Screenshots are internal QA outputs and are not packaged as user data.

The design uses the reference palette, sidebar, alignment, cards and screen structure with working controls. Record values, row counts, available actions and empty states are database- and role-dependent. No pixel-identical rendering claim is made across browsers and fonts.

## External boundaries

Live Supabase Auth/Storage, hosted PostgreSQL, email delivery, Vercel/Render deployment and remote scheduling were not exercised without the owner's credentials. Physical phone-camera scanning and the Windows launcher were not executed on those devices; manual QR token workflows were tested. No production load test, independent penetration test or hosted backup/restore drill was performed. See FEATURE_CHECKLIST.md for precise scope and remaining refinements.
