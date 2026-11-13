# Supplied GUI screen map

The 13 images supplied with `SocietyOS_Full_Separate_Web_Screens(1).zip` guide the shared design and screen composition. The implementation is responsive; data, permissions, form controls and empty states reflect the real application rather than fixed illustration values.

| Reference | Working route | Main behavior |
|---|---|---|
| 01 Landing | `/` | Product information, accessible after signing in |
| 02 Login and roles | `/login` | Email/password sign-in; role cards select local accounts only |
| 03 Platform super admin | `/app/platform` | Society status, users, plans, support and audit overview |
| 04 Society dashboard | `/app/overview` | Database totals, collections/visitor chart, operational score and quick actions |
| 05 Residents and units | `/app/members`, `/app/units` | Resident directory, invitations, property and occupancy management |
| 06 Visitor management | `/app/visitor_passes` | Visitor records, new secure QR pass and preview |
| 07 Complaints and maintenance | `/app/complaints` | Request list, assignment, work updates and resolution |
| 08 Billing and invoices | `/app/invoices` | Monthly charges, balances, PDFs and payment review |
| 09 Facility booking | `/app/facilities`, `/app/facility_bookings` | Facility cards, booking forms and calendar |
| 10 Announcements and polls | `/app/announcements`, `/app/polls` | Notices, emergency updates and voting |
| 11 Security gate | `/app/scanner` | Camera/token verification, check-in and check-out |
| 12 Analytics and reports | `/app/reports` | Summary, trends, date filters and report export |
| 13 Maintenance workspace | `/app/maintenance` | Assigned task list, detail action and progress chart |

Related pages are available under **More** in the top bar. The sidebar shows only the user's permitted groups. On small screens it opens using the menu button. Tables scroll within their panels and cards stack for mobile.

## Sign-in rule

Visiting any product route without a session redirects to `/login`. Sign-in, signup and password recovery remain accessible so a user can gain access. The decorative sidebar on these account pages is disabled. Selecting a role does not authenticate, change permissions or reveal data. The former passwordless demo endpoint has been removed. Sign-out revokes the local server session and clears client data. Protected API routes independently reject unauthenticated requests with HTTP 401; tenant membership and role checks then apply.

The browser downloads the application shell and static assets, which contain no private records. Private records and uploaded files require authenticated API requests. The health endpoint and public auth configuration contain only service status and public sign-in configuration.

## Data and visual differences

Seeded records are explicitly fictional and kept in a local PostgreSQL database. Counts and chart values change as actions are performed. Empty queues explain what to do next. Secure QR values are only shown immediately after creation, since only their hashes are retained. Screens are working adaptations of the references, not flattened screenshots or an assertion of pixel-for-pixel identity. Desktop baseline is 1440 × 900; mobile layouts adapt at narrower widths.
