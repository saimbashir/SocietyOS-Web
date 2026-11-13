# Publish SocietyOS to a separate public repository

Recommended GitHub repository name: `SocietyOS-Web`.

1. Create a new **Public** GitHub repository, with no README/License/.gitignore initialization.
2. Extract the ZIP; open a terminal inside the `SocietyOS` folder.
3. Run:

```bash
git init
git branch -M main
git add .
git commit -m "feat: publish SocietyOS community management showcase"
git remote add origin https://github.com/YOUR_USERNAME/SocietyOS-Web.git
git push -u origin main
```

Replace `YOUR_USERNAME`. The repository is intentionally source-only. `npm ci` and `npm run build` are required before running the production frontend. The GitHub CI workflow checks these steps when published.

Never publish your local `.env`, `data/` (PGlite records/uploads), real QR tokens, credentials, or private resident records. The optional scheduled reminders workflow is disabled until the owner configures appropriate secrets.
