# SocietyOS role-security review (partial hardening)

This update preserves existing screens and CSS. It removes the frontend fallback that treated a user without an active society membership as an administrator and adds a backend allowlist for membership roles.

Existing role-specific menus, backend role checks, and tenant-scoped queries were reviewed. This is NOT a completed security audit or a guarantee of isolation.

Before production use, test each route and record type with accounts for admin, resident, guard, maintenance and superadmin, including cross-society IDs and direct API requests. Review all detail, mutation, export, file-download and analytics endpoints for object-level permissions. Confirm that signup/onboarding cannot be abused to gain control of an existing society.

Run automated tests and a live PostgreSQL-backed integration suite before deployment.
