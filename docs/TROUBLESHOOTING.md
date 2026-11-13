# Troubleshooting

**Node is not recognized:** Install Node.js 22 LTS or newer and reopen the terminal. No Python is required.

**START.bat immediately closes:** Run `node scripts/start.mjs` in the extracted `societyos` folder to read the error. Do not run inside the ZIP viewer.

**First install fails:** Check internet/proxy access to npm. Run `npm ci` again, then `npm run prisma:generate`. The lockfile is included.

**Port already in use:** Stop the other process or change backend `PORT` and frontend Vite proxy together. Vite can offer another frontend port, but update `APP_ORIGIN` to that exact origin so mutations are permitted.

**Blank dashboard / fetch failed:** Keep both processes running. `/api/health` on port 4000 should return JSON. Use http://localhost:5173 as the frontend origin unless APP_ORIGIN has been changed. Check browser console and API terminal.

**No units in resident form:** The administrator must create a unit and assign that resident through Occupancy. This is intentional authorization.

**No tasks for maintenance:** Tasks become visible only after an administrator assigns them to that staff member.

**Invitation rejected:** Sign in with the exact invited email. Tokens expire after 7 days and cannot be reused. Joining the same society twice is prevented.

**QR cannot scan:** Camera scanning uses the browser BarcodeDetector API. Availability varies; Chrome on Android is the intended camera target. HTTPS or localhost is required. Paste the 64-character token as the reliable fallback. Physical camera scanning was not tested in this environment.

**Pass expired / used:** Generate a new pass with the correct start/end window and entry allowance. Dates are stored in UTC and displayed locally. Saving only the database record does not retain the original plaintext QR token.

**Booking conflict:** Pending and approved bookings reserve the time. Cancel/reject an unused booking before reserving overlapping time. Adjacent time windows are permitted.

**Payment amount did not change:** Approval by the administrator is required. Duplicate approval and overpayments are blocked.

**Supabase errors:** Verify DATABASE_URL, SSL, database password, server key, private bucket, redirect URLs and email settings. Run migrations with a session/direct connection. The server connection must have permission to read/write RLS-protected tables. Never weaken table policies to make browser requests work; application records go through Express.

**Fresh local data:** Stop the app first, back up `data/`, then move the existing `data/postgres` directory out of the way. Restart to create a fresh fictional seed. Do not do this with valuable data unless it has been backed up.

**Production build preview:** `npm run build`, then `npm start`; add `http://localhost:4000` to APP_ORIGIN to use the single-server frontend. Local mode still only binds loopback. Production must use Supabase.

**Account card does not open the dashboard:** Cards only select a local account. Enter the password printed in the startup terminal, or read `data/LOCAL_DEMO_LOGIN.txt`. Signed-out product pages always redirect to login. These seeded accounts do not exist in production Supabase authentication.
