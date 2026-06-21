# ANOREP

A clearance-gated personnel search terminal for a game setting. Operators sign in with assigned credentials, then query the anomalous personnel registry by name. Results display a personnel file scoped to the operator's clearance level; missing records trigger a red flash alert.

## Features

- **Authentication** — demo accounts with different clearance levels
- **Personnel search** — match by name, alias, or record ID
- **Clearance-based redaction** — fields above your clearance show as `[REDACTED]`
- **Not-found alert** — full-screen red flash + error panel when no record exists



## Indexed Personnel

Try searching: **Voss**, **Hale**, **Tanaka**, **Cross**, or a non-existent name to see the red flash.

## Run Locally

Node.js is installed at `C:\Program Files\nodejs`. If `node` or `npm` is "not recognized" in a terminal, **restart Cursor** (or open a new terminal) so PATH updates. Or double-click **`start.bat`** in the project folder — it sets PATH and starts the dev server automatically.

Requires [Node.js](https://nodejs.org/) 18+.

```bash
cd Projects/anomaly-personnel-db
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Quick start (Windows)

Double-click `start.bat` in the project folder.

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  components/     Login, search terminal, personnel file UI
  context/        Auth session state
  data/           Mock users + personnel records
  types.ts        Shared TypeScript types
```

## Next Steps

- Replace mock auth/data with a real backend (SQLite, Supabase, etc.)
- Add more personnel records via JSON or admin panel
- Wire clearance levels to server-side field filtering (never trust the client alone in production)
- Add scanline/crt effects, audio cues, or lore pages for the game world
