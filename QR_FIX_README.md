# Visitor QR fix

- Newly created QR codes encode a URL pointing to a read-only visitor pass details page.
- Existing raw-token QR codes still work in the in-app guard scanner.
- The read-only page shows visitor name, purpose, vehicle, dates, and status, but does not grant entry.
- Only authenticated guards/admins can check visitors in/out.
- Configure PUBLIC_APP_URL to your publicly reachable HTTPS frontend origin before creating QR passes for phones. Localhost/127.0.0.1 URLs will NOT open from another device.
- For local same-Wi-Fi testing, expose the frontend and API safely on the LAN, configure PUBLIC_APP_URL to the reachable frontend URL, and note camera scanning requires HTTPS (or localhost on the same device).
- Previously generated QR codes are unchanged; create a new pass to receive the URL QR.
- A QR bearer link reveals limited visitor details to anyone possessing it. Do not share it publicly.
