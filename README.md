# ANOREP

A clearance-gated personnel search terminal for a game setting. Operators sign in with assigned credentials, then query the anomalous personnel registry by name. Results display a personnel file scoped to the operator's clearance level; missing records trigger a red flash alert.

## Live site

**Frontend (GitHub Pages):** https://ikaros2491.github.io/anomaly-personnel-db/

GitHub Pages hosts the static React app only. Sign-in and shared data require the API server to be running somewhere else (see [Hosting](#hosting) below).

## Features

- **Authentication** — server-side accounts with clearance levels
- **Personnel search** — match by name, alias, or record ID
- **Clearance tags** — inline `[C1]`–`[C4]` redaction in file text
- **SCP registration** — CL2+ operators submit files; admins approve
- **Administrator tools** — approval queue, operator management, file deletion
- **Not-found alert** — full-screen red flash when no record exists

## Indexed Personnel

Try searching: **Voss**, **Hale**, **Tanaka**, **Cross**, or a non-existent name to see the red flash.

## Run Locally

Requires [Node.js](https://nodejs.org/) 18+.

**Quick start (Windows):** double-click `start.bat` in the project folder.

```bash
npm install
npm install --prefix server
npm run db:setup          # first time only
npm run dev:all           # frontend + API
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Build for Production

```bash
npm run build
npm run preview
```

## Hosting

### Frontend — GitHub Pages

Pushes to `main` automatically deploy via GitHub Actions.

1. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. After the API is live, set a repository variable:
   - **Settings → Secrets and variables → Actions → Variables**
   - Name: `VITE_API_URL`
   - Value: your API URL, e.g. `https://anorep-api.onrender.com` (no trailing slash)
3. Re-run the **Deploy to GitHub Pages** workflow (or push a commit)

### Backend — separate host required

GitHub Pages cannot run the Node/Express API. Deploy `server/` to a host such as [Render](https://render.com) (a `render.yaml` is included).

On the API host, set:

| Variable | Example |
|---|---|
| `CORS_ORIGIN` | `https://ikaros2491.github.io` |
| `COOKIE_CROSS_SITE` | `true` |
| `JWT_SECRET` | long random string |
| `DOLL_PASSWORD` | your admin password |

Then point `VITE_API_URL` at that API URL in GitHub Actions variables.

## Demo Accounts

| Operator ID | Access Code | Clearance |
|---|---|---|
| `intern.lee` | `trainee` | 1 |
| `agent.smith` | `access` | 2 |
| `director.jones` | `omega` | 4 |
| `Doll` | *(set via `DOLL_PASSWORD` on server)* | Administrator |

## Project Structure

```
src/              React frontend
src/api/          API client (replaces localStorage)
server/           Express + Prisma + SQLite API
.github/          GitHub Pages deploy workflow
```
