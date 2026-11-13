# API guide

Base URL: `/api`. OpenAPI 3.1 JSON is in `openapi.json`; regenerate with `node scripts/openapi.mjs`.

Protected society routes require an authenticated identity and `X-Society-Id` matching membership. Omit the header only when intentionally using the first available membership. Production uses `Authorization: Bearer <Supabase access token>`. Local development uses an HttpOnly session cookie. Do not put service-role keys in browser requests.

| Area | Routes |
|---|---|
| Auth | `/auth/config`, `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/onboard`, `/auth/join`, `/auth/profile`, `/auth/preferences` |
| Entities | `GET/POST /{module}` for enabled modules; explicit admin `PATCH/DELETE /{module}/{id}` for mutable basic records |
| Members | `GET /members`, `PATCH/DELETE /members/{id}`, `POST /invitations`, `GET /staff` |
| Gate | `POST /visitors/verify` with `{token, exit}`; `GET /visitor_entries` |
| Maintenance | `/complaints/{id}/assign`, `/start`, `/resolve`, `/close`, `/reopen`, `/comment`; `GET /complaints/{id}/comments` |
| Invoices | `POST /invoices`, `GET /invoices/{id}/pdf`, `POST /invoices/{id}/payments`, `POST /billing/monthly` |
| Payments | `POST /payments/{id}/approve` or `/reject` |
| Bookings | `POST /facility_bookings`, `/facility_bookings/{id}/approve`, `/reject`, `/cancel` |
| Polls | `POST /polls`, `GET /polls/{id}/results`, `POST /polls/{id}/vote` |
| Files | `POST /files` multipart; `GET /files/{id}` authenticated download |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read` |
| Reporting | `GET /analytics`, `GET /reports?from=YYYY-MM-DD&to=YYYY-MM-DD`, `GET /{module}/export` |
| Import | `POST /units/import` with `{rows:[{building_id,floor_id?,name}]}` |
| Settings | `GET/PATCH /settings` |
| Reminders | `POST /reminders` as society admin; `POST /jobs/reminders` with independent CRON_SECRET bearer authentication |
| Platform | `GET /platform`, `POST /platform/{societyId}` with `{status}` |
| Health | `GET /health` |

## Examples
Create a resident visitor pass:
```json
{
  "unit_id": "a-real-unit-uuid-from-the-units-endpoint",
  "name": "A guest",
  "purpose": "Family visit",
  "vehicle": "",
  "starts_at": "2027-01-15T10:00:00+05:00",
  "ends_at": "2027-01-15T14:00:00+05:00",
  "allowed_entries": 1
}
```
Creation returns the record, one-time plaintext `pass_token`, and a PNG data-URL `qr`. List responses never include the token hash or plaintext token. The client must save the token/QR immediately.

Submit a partial payment:
```json
{"amount_cents": 250000, "reference": "Bank transfer reference"}
```
Money is in integer cents: PKR 2,500.00 = 250000. Submissions start pending. Approving a pending payment increments verified invoice balance once. The API rejects overpayment.

Monthly billing:
```json
{"period":"2027-01","title":"January maintenance","amount_cents":750000,"extra_cents":50000,"due_at":"2027-01-10T00:00:00Z"}
```
Creates one invoice for each occupied unit and skips already billed unit/month combinations. Returns `{created, skipped}`.

## Validation and errors
- 400: malformed input, unsupported action or invalid invitation.
- 401: missing/expired login, invalid scheduler secret.
- 403: wrong role, nonmember society, suspended society or untrusted write Origin.
- 404: record not found within the selected society.
- 409: duplicate, overlapping booking, invalid transition, related-record constraint, or serialization conflict.
- 413: upload above 5 MB.
- 429: request limit exceeded.
- 500: safe general error; full details stay in server logs.

Generic SQL identifiers come only from server-controlled allowlists; request values are parameterized. Client navigation is not an authorization boundary.

## Reference-screen data
- `GET /api/search?q=...`: searches only the signed-in role's visible tenant records; 2–100 characters, up to 20 results.
- `GET /api/summary/:table`: summary-card values computed from permitted tenant records.
- `GET /api/analytics`: dashboard totals and six-month collection/visitor trends.
- `POST /api/auth/login`: email and password required in local mode. Role cards do not call an authentication bypass. `/api/auth/demo` is not available.
