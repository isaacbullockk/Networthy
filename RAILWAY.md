# Deploying NetWorthy to Railway

NetWorthy is a single-service full-stack app: one Node process serves the React
frontend, the tRPC API, and the WebSocket signaling server for video calls.
Railway builds it from the included `Dockerfile` automatically.

**What happens at container start:** `node db/run-migrations.mjs && npm start` —
database migrations apply automatically (idempotent, skipped when already
applied), then the server boots. No manual migration step.

## 1. Push the code to GitHub

```bash
git init && git add -A && git commit -m "NetWorthy"
git remote add origin <your-repo-url>
git push -u origin main
```

## 2. Create the Railway project

1. Railway → **New Project** → **Deploy from GitHub repo** → pick the repo.
2. Railway detects the `Dockerfile` and `railway.toml` (health check on
   `/api/health`) — no further build config needed.

## 3. Set environment variables

In the service → **Variables**, add:

| Variable       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | `mysql://user:password@host:port/database` (see step 4)      |
| `APP_ID`       | any non-empty value, e.g. `networthy`                        |
| `APP_SECRET`   | any non-empty secret                                         |

`PORT` is injected by Railway automatically; the server reads it.

## 4. Database

**Option A — keep the existing cloud MySQL (TiDB):** copy the `DATABASE_URL`
from your local `.env` into Railway. Nothing else to do — schema and demo data
are already there (migrations self-verify at boot).

**Option B — fresh Railway MySQL:** add the **MySQL** plugin to the project and
copy its `DATABASE_URL` into the app variables. The container creates all
tables on first boot. Then seed the launch content once, from your machine:

```bash
DATABASE_URL=<railway-mysql-url> SEED_DATABASE=yes SEED_PASSWORD='<strong-password>' ADMIN_PASSWORD='<admin-password>' npx tsx db/seed.ts
```

The seed script **wipes every table** and therefore refuses to run without
`SEED_DATABASE=yes` — it can never hit production by accident. Passwords are
bcrypt-hashed and come from env vars (default `NetWorthy!2026` if unset —
change it on first login).

Seeds: 8 talents, 2 approved recruiters (lisa@picnic.nl · PicNic, mark@bol.com ·
Bol.com), 1 independent assessor (jeroen@networthy.app), 1 admin
(isaac@networthy.app — approves recruiters, invites assessors) — plus matches,
questionnaires, meetings, exchanges, assessments, a hired match in retention
mode and a retained alumna for the buddy pool.

## 5. Deploy & verify

- Railway deploys on every push to `main`.
- Check `https://<your-app>.up.railway.app/api/health` → `{"ok":true,...}`.
- Sign in as admin (`isaac@networthy.app`) and open `/admin` — the trust gate.
- Roles to try: admin (approve recruiters, invite assessors), recruiter
  (dashboard, pipeline, records), talent (portal, video intro, retention
  journey), assessor (verification directory).
- New signups: talents get instant access to their portal; recruiters land on
  an "under review" screen until the admin approves them.

## Notes

- **Build-time `NODE_ENV`:** Railway sets `NODE_ENV=production` during the
  Docker build, which makes plain `npm ci` silently skip devDependencies and
  fail with `sh: vite: not found` (exit 127). The Dockerfile therefore uses
  `npm ci --include=dev` in the build stage — do not "simplify" it back.
- **Video calls (WebRTC)** run over the same port and domain (`/ws`), so they
  work out of the box behind Railway's TLS — camera/mic require HTTPS, which
  Railway provides.
- **Async video intros** are stored in the database (`video_intros` longblob),
  so they survive redeploys — no object storage needed.
- **NetWorthy Records** are public via share tokens (`/r/:token`) — no auth
  wall for sign-off reviewers, nothing to configure.
- Sessions are cookie-based (`SameSite=Lax`); no extra config needed.
- Local production run: `npm run build && npm start` → http://localhost:3000
