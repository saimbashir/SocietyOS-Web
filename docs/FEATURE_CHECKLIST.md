# Feature completion matrix

Status: **Implemented** means working source and UI/API are included. **Configured, not live-verified** means external credentials/infrastructure are required. **Partial** means the specific limitation below remains. This release is not a claim that every line of the original master brief is finished.

| Area | Status | Exact scope |
|---|---|---|
| React JSX / JavaScript / Vite | Implemented | React Router, TanStack Query, React Hook Form, Motion, Lucide, Tailwind, Recharts; custom semantic components, not the shadcn package |
| Four-layer backend | Implemented | Express route/controllers, validation and middleware, business services, repository/database layer |
| PostgreSQL data | Implemented locally | Persistent PGlite PostgreSQL engine; not localStorage or hardcoded replacement data |
| Supabase PostgreSQL / Prisma | Configured, not live-verified | SQL migrations, Prisma scalar models, parameterized SQL repositories and production environment checks |
| Information and account pages | Implemented | Home, Features, Solutions, How It Works, Pricing, About, Contact, Privacy and Terms require sign-in. Login, Signup and Forgot/Reset Password remain accessible for account access. |
| Visual design | Implemented | Layout adapted from the 13 supplied GUI references: forest/navy sidebar, pale canvas, aligned cards/tables, blue/pink charts, responsive forms and modal flows |
| Animation details | Partial | Motion reveals/float/fade and CSS transitions; no numeric count-up, canvas particles, or scroll-parallax system; loading uses a spinner rather than skeleton cards |
| Five workspaces | Implemented | Superadmin, society admin, resident, guard, maintenance; shared layout with role-filtered routes and actions |
| Local auth | Implemented and tested | Password hashing, HttpOnly opaque sessions, logout, protected page routes and APIs; local account cards require a password; no passwordless role endpoint |
| Supabase Auth | Configured, not live-verified | Signup/login, email verification flow, reset email, password update, server-side token verification via Supabase Auth |
| Society onboarding | Implemented | Create society, then add property records; unit plan limit selection; invitation acceptance. Property setup is sequential pages rather than a six-screen wizard |
| Membership administration | Implemented | Manual invitation tokens, directory, role changes/removal, unit assignment. No automated invitation email delivery |
| Property management | Implemented | Building/floor/unit creation and edits; apartment/house types; owner/tenant associations; removal with referential safeguards; unit CSV import and CSV export |
| CSV import | Partial | Units only; per-row success/errors; up to 200 rows; no multiline quoted CSV fields |
| Visitor QR | Implemented | Random hashed token, QR generation/download, validity and usage checks, check-in/out, entry history, resident notifications; manual fallback |
| Physical QR camera | Not device-tested | BarcodeDetector API where available, HTTPS/localhost required. Secure manual token path is tested |
| Maintenance | Implemented | Categories, priority, assignment, start/resolve/close/reopen, comments, attachment evidence, deadlines, recurring-category and building/workload reports |
| Maintenance details | Partial | Before/after evidence uses document titles rather than dedicated image slots; `maintenance_updates` table is reserved, comments are the active repair-note workflow |
| Billing | Implemented | Per-unit invoices, monthly batch generation for occupied units, extra-fee line item, unique monthly invoices, PDF, integer cents, partial manual payments, proof, review and CSV |
| Real-money payments | Intentionally absent | No gateway, card collection, or fabricated payment processing |
| Facilities | Implemented | Listings, capacity/fee metadata, booking requests, approval/rejection/cancellation, calendar and history, overlap locking and PostgreSQL trigger |
| Facility booking fees | Partial | Fee is displayed but not automatically posted to an invoice |
| Community | Implemented | Notices/emergency broadcasts, events, single-vote polls, documents, feedback, lost/found, emergency contacts, duty shifts |
| Notifications | Implemented | Database records, shared/personal read state, 30-second polling, personal-update preference, deadline reminders |
| Scheduled reminders | Configured, not enabled remotely | Authenticated endpoint and GitHub Actions workflow; manual run works without a scheduler |
| Socket.IO | Optional alternative omitted | Polling is the implemented realtime fallback |
| Analytics | Implemented | Occupancy, resident additions, payment collections, invoice balances, visitor traffic, maintenance categories/status/workload, facility booking counts, building issues, plan mix and platform growth |
| Analytics refinements | Partial | Overview health score uses booking approval ratio, not time-based facility utilization. Collection charts use payment submission/invoice month, not a separate verification timestamp. No predictive AI |
| Smart score | Implemented | Transparent weighted score with empty-data convention disclosed in UI; role-visible data only |
| Platform administration | Partial | Overview, society activation/suspension, users, plan limits display, support inbox, audit logs; no dedicated platform-settings editor, plan-price editor, or subscription payment processing |
| Storage | Implemented locally; cloud configured | Authenticated file downloads; MIME signature checks; 5 MB maximum; private Supabase bucket with server-only access |
| Tenant isolation | Implemented and tested | Membership middleware, server role checks, scoped queries, tenant foreign keys, RLS deny-by-default browser roles |
| Reporting/export | Implemented | Admin date ranges and CSV reports; module CSV exports; financial PDF |
| Large datasets | Partial | Module lists return latest 500 records; no server pagination yet. Aggregate reports and overview use all relevant records |
| Production deployment | Not performed | Render/Vercel configuration, Supabase migrations/storage SQL, setup and troubleshooting guide provided; needs your accounts |
| Tests | Executed locally | See TEST_REPORT.md for exact run results and untested boundaries |
| Windows launcher | Included; not Windows-executed | START.bat + cross-platform Node launcher; Linux runtime used for testing |
| Formal production readiness | Not certified | No hosted load test, penetration test, backup-restore drill or legal-policy review |
