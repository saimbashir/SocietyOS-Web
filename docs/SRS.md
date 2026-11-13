# Software requirements specification

## 1. Purpose
SocietyOS helps a residential community coordinate people, property, visitors, maintenance, billing, shared resources and communications. The academic deliverable is an understandable modular JavaScript application with real relational data and clear authorization. The supplied release is for local evaluation and preparation for a separately configured cloud deployment.

## 2. Users and permissions

| Operation | Platform admin | Society admin | Resident | Security | Maintenance |
|---|---|---|---|---|---|
| View platform/suspend society | Yes | No | No | No | No |
| View society workspace | Explicit society context | Own memberships | Own memberships | Own memberships | Own memberships |
| Create/edit property | Explicit society context | Yes | No | No | No |
| Invite/manage members | Explicit society context | Yes | No | No | No |
| View units | Explicit society context | All society | Assigned only | Operational directory | Operational directory |
| Create visitor pass | Explicit society context | Yes | Assigned units | Manual registration | No |
| Verify/check in/out | Explicit society context | Yes | No | Yes | No |
| Submit complaint | Explicit society context | Yes | Own unit | No | No |
| Assign complaint | Explicit society context | Yes | No | No | No |
| Start/resolve repair | Explicit society context | Yes | No | No | Assigned tasks only |
| Close/reopen repair | Explicit society context | Yes | Own request | No | No |
| Create invoices/review payment | Explicit society context | Yes | No | No | No |
| View bills/submit payment | Explicit society context | Yes | Assigned-unit invoices | No | No |
| Request booking | Explicit society context | Yes | Yes | No | No |
| Approve/reject booking | Explicit society context | Yes | No | No | No |
| Publish notices/events/polls/docs | Explicit society context | Yes | No | No | No |
| Vote | Explicit society context | Yes | Yes, once | No | No |
| Emergency directory | Explicit society context | Edit | Read | Read | Read |
| Duty shifts | Explicit society context | Edit all | No | Own only | Own only |
| Society reports/audit | Explicit society context | Yes | No | No | No |

The local platform demo has no society membership and shows the platform screen only. Its global platform role can operate with an explicit tenant header at the API, which is never available to ordinary accounts.

## 3. Functional requirements
- FR-01: authenticate users and identify their memberships using a server-validated identity.
- FR-02: store independent society records and prevent cross-society references.
- FR-03: map society → building → floor → unit and owner/tenant assignments.
- FR-04: issue expiring visitor passes; record bounded entry/exit history atomically.
- FR-05: coordinate open → assigned → in-progress → resolved → closed maintenance, with controlled reopening.
- FR-06: issue integer-cent invoices; hold payment submissions pending administrator verification; disallow duplicate approval/overpayment.
- FR-07: reject overlapping pending/approved facility reservations, including concurrent requests.
- FR-08: provide community announcements, events, polls, protected files and resident feedback.
- FR-09: present database-backed role-appropriate notifications, reports and exports.
- FR-10: provide local fictional seed data and deployable external-service configuration without required paid AI/SMS/payment APIs.

## 4. Nonfunctional requirements
- Validate writes with Zod and enforce permissions on the server, not only in navigation.
- Store secrets outside source. Expose only Supabase's public auth key to browsers.
- Use Helmet, restricted CORS, rate limiting, safe API errors, private storage and audit trails.
- Use transactions/locks for reservations, visitor verification and payment review.
- Keep layouts usable from a 390-pixel phone to desktop; contain wide tables in scroll containers.
- Support keyboard focus, labelled fields, modal Escape and focus trapping; respect reduced-motion CSS preferences.
- Allow operation after first local dependency installation without mandatory external services.

## 5. Business rules
- Membership and society active status are checked on every protected tenant request.
- Residents can act on their own unit/record only. A maintenance worker sees assigned complaints.
- Invitation email must match the signed-in account. Tokens expire after seven days.
- QR token hashes are persisted; plaintext tokens are returned once and must be saved by the creator.
- Check-in requires active status, valid time and remaining entry allowance; an open entry cannot be duplicated.
- Payment proof is evidence, not automatic verification. Money is stored in integer cents.
- Pending reservations hold their time slot; rejection/cancellation releases it.
- Monthly billing skips existing society/unit/month combinations.
- Shared notice read status is personal to each user.
- Plans configure unit counts, not paid subscriptions.

## 6. Acceptance and boundaries
Local API and browser checks are reported separately from hosted integration readiness. FEATURE_CHECKLIST.md identifies partial requirements; unsupported capabilities are not presented as completed. The UI does not imply real payment processing or automatically sent invitations.
