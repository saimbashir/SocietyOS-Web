# SocietyOS security and responsible disclosure

SocietyOS is an academic project supplied as source code, not a security-audited commercial SaaS. Please report suspected vulnerabilities privately to the repository owner rather than posting secrets, QR access tokens, personal data or exploit payloads in public issues.

## Before deploying to production

- Do not deploy with `AUTH_MODE=local` or a local demo password. Use configured Supabase Auth, HTTPS and verified production domains.
- Store `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, and all private keys in provider secret settings only, never in Git or `VITE_` variables.
- Never publish QR tokens, visitor names, building/unit assignments, private files or production database backups.
- Run database migrations (including tenant isolation and RLS hardening) and provision the private object storage bucket.
- Configure backups, monitoring, security headers, appropriate rate limits and an incident response procedure.
- Test public QR endpoints and scanning against your actual hosting environment before opening access to users.

## Scope

The app's UI role filtering does not confer security; the backend must enforce membership, tenant and resource permissions. A public GitHub repository can expose source code safely only if credentials and real user records remain outside version control. See `docs/DEPLOYMENT.md`, `docs/security.md`, and `docs/FEATURE_CHECKLIST.md`.
