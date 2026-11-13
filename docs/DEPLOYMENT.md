# SocietyOS deployment

The supplied project runs locally without cloud accounts. Online deployment is configured but was not executed against a live Supabase/Render/Vercel account in this session. Never deploy local demo mode publicly.

## 1. Supabase
1. Create a Supabase project and save its database password privately.
2. From Connect, copy a PostgreSQL connection string suitable for your host. Use a direct or **session-pooler** connection for Prisma migrations. Do not use a transaction-pooler endpoint for migrations. Add `?sslmode=require` as appropriate. The API uses a privileged server database connection; no database URL goes into the frontend.
3. Set `DATABASE_URL` in your local backend environment temporarily, then run `npm run prisma:generate` and `npx prisma migrate deploy --schema backend/prisma/schema.prisma`.
4. Run `backend/prisma/storage-setup.sql` in Supabase SQL Editor. The bucket stays private. Do not add public storage policies.
5. SQL migrations enable RLS and revoke browser roles from application tables. The app uses Express exclusively for application data. The server database role must be a table owner/BYPASSRLS role. Do not use the anonymous Supabase key for SQL access.
6. Enable email/password authentication. Set Site URL and allowed redirect URLs to your deployed frontend origin, `/login`, and `/reset-password`. Configure email delivery for real use and verify Supabase's current email rate limits.
7. Save the project URL, anonymous/publishable-compatible key, and service-role key in backend environment variables. The service key must never be exposed via VITE variables or committed.

## 2. Render API
1. Push this source folder to your own GitHub repository, excluding `.env`, `data`, and `node_modules`.
2. Create a Render Node web service or use `render.yaml`.
3. Build: `npm ci && npm run prisma:generate`
4. Start: `npx prisma migrate deploy --schema backend/prisma/schema.prisma && npm start`
5. Set `NODE_ENV=production`, `AUTH_MODE=supabase`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=societyos-private`, `APP_ORIGIN=https://YOUR-FRONTEND`, and a random `CRON_SECRET`.
6. Verify `/api/health` returns `{ "ok": true, "service": "SocietyOS" }`.
7. Production fails closed if database, Supabase auth, or service-role storage configuration is missing. Local seeded users and demo login are disabled.

## 3. Vercel frontend
1. Import the repository. `vercel.json` defines build output and SPA routes.
2. Set `VITE_API_URL=https://YOUR-API.onrender.com` with no trailing slash.
3. Build command: `npm run build`. Output directory: `frontend/dist`.
4. Set the backend `APP_ORIGIN` to the exact frontend origin. For multiple explicitly trusted origins, use commas without spaces.
5. Sign up, verify email if required, and sign in. First-time users can create a society or accept an invitation.
6. To designate your first platform administrator, use trusted SQL Editor: `UPDATE users SET platform_role='superadmin' WHERE email='YOUR_VERIFIED_EMAIL';` after signing into the app once. Do not offer this operation to regular users.

## Reminders and sleeping hosts
The API does not require an always-on background worker. Administrators can run reminders in Settings. For automated reminders, configure GitHub Actions secrets `SOCIETYOS_API_URL` and `SOCIETYOS_CRON_SECRET`; the included workflow calls the authenticated endpoint daily. This schedule is not enabled in a remote repository by this delivery. GitHub schedules may run late and Actions allowances vary by account/repository.
Notifications poll every 30 seconds while a signed-in workspace is open. This is the implemented realtime fallback; Socket.IO is not required.

## Provider limits checked 17 October 2026
- Render free web services can sleep after 15 minutes of inactivity; cold starts occur. Filesystem changes are ephemeral. Supabase stores production records and files, so they do not rely on Render disk. See https://render.com/docs/free and https://render.com/docs/faq.
- Supabase Free advertises a 500 MB database allowance. Storage, egress, auth, project pausing and other limits must be checked for your project: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-on-supabase.
- Vercel Hobby is for personal/non-commercial use. An academic demo may fit; a commercial SaaS launch needs an eligible plan or different frontend host: https://vercel.com/pricing.
- These tiers are not unlimited or permanent. No paid plan, SMS, AI API, or payment gateway has been activated.

## Before real launch
Configure backups, operational monitoring, email deliverability, your legal/support details, and a retention policy. Run the test suite and your own Supabase integration/browser tests against a staging project. The local PostgreSQL engine test does not establish hosted-provider correctness. Use HTTPS and rotate any credentials exposed during setup.
