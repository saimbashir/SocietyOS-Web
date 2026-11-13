# SocietyOS user manual

## Presenting the project
1. Open http://localhost:5173. You will be redirected to sign-in. Use the generated password printed in the startup terminal (also `data/LOCAL_DEMO_LOGIN.txt`).
2. Select Administrator, enter the password, and click Sign in securely. See overview, notices and real database totals.
3. Open Buildings → New building, then Floors → New floor, then Units → New unit.
4. Sign out → resident. Open Visitors → New visitor pass. Pick an assigned unit and valid dates. Save the QR or token immediately; the plaintext token is not stored.
5. Sign out → Security. Open Gate check-in, paste the token and choose Check in. A second check-in is refused. Choose Check out.
6. Resident → Maintenance → New request. Admin → Maintenance → open request → assign to Sara Khan. Maintenance → open task → Start work → Mark resolved. Resident → open request → Close or Reopen.
7. Resident → Billing → open invoice → Submit a payment. This does not transfer money. In Payment review open the payment and upload proof. Admin → Payment review → Approve. The invoice balance changes only on approval.
8. Resident → Bookings → New booking. An overlapping reservation is refused. Admin can approve or reject. Residents can cancel their own reservation.
9. Admin → Community polls → Create poll, entering one option per line. Resident opens the poll and votes once.
10. Platform admin sees both societies and can suspend/activate access. Suspension blocks society APIs for ordinary memberships.

The sidebar groups related screens. Use **More** in the top bar for the current group’s extra pages (Buildings, Floors, Units, Occupancy, Payment review, Bookings, and others). The search field searches records you are allowed to see. The notification and account links open your permitted pages. Sign out is at the bottom of the sidebar. Each role requires a valid account password; role cards are account shortcuts only.

## Starting your own society
Local signup creates your own account and society, without seeded resident memberships. Add property records first. Use People → Invite a person. Invitations are not emailed automatically: copy the displayed token and share it yourself. The person must sign in with the invited email, then Settings → Join another society. With Supabase, users without memberships see onboarding immediately. Local invitees can create an account/society first and then join the invited society; this extra local-mode step is documented rather than hidden.

After a resident accepts an invitation, the administrator must assign them to a unit through Occupancy. Until then the resident has no units and cannot create home-specific records. A unit can have owner and tenant memberships. Remove an assignment from its detail view when someone moves out; records retain their history.

## Editing and imports
Open a basic record to edit it. Financial records and visitor history are deliberately managed through explicit workflow actions. Deleting buildings, floors, units or facilities is blocked when linked records exist.

To import units, export Buildings and Floors to obtain IDs. Prepare CSV columns `building_id,floor_id,name`. Floor ID is optional. One record per line; quoted commas are supported, multiline quoted fields are not. Import reports success/error per row; successful rows remain saved when another row fails. Maximum 200 rows. Units sharing a label are possible; check duplicates before import.

## Documents and evidence
Community documents are uploaded by admins and visible to society members. Complaint evidence is visible to its reporter, assigned maintenance staff and admins. Payment proof is visible to its submitter and admins. Allowed files: PDF, PNG and JPEG, up to 5 MB. Files are downloaded through authenticated API routes.

## Notifications and reminders
Workflow notifications and shared announcements appear in Notifications. Mark as read is per user. Settings can disable personal workflow notifications; shared notices and deadline reminders remain visible. New notifications are polled every 30 seconds. Administrators can run idempotent deadline reminders from Settings. Daily unattended reminders require configuring the included GitHub Actions workflow.

## Simple navigation
Use the society selector to change between memberships. Search and status/date filters work within each module (up to the newest 500 records). CSV downloads use the full visible module set, rather than the current client-side text filter. On mobile, the menu button opens the sidebar; wide tables scroll inside their own area.
