# remitx-web

React web frontend for the RemitX cross-border payment platform.
React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query · Zustand

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 |
| npm | >= 10 |

> Requires **remitx-api** running on port 3000 before starting the dev server.

---

## Environment

Create `.env.local` in the project root:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

---

## Setup

```bash
npm install
npm run dev     # Vite dev server → http://localhost:5173
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `localhost:5173` with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

---

## Logging in

Enter workspace slug **`remitx`** along with any seed account credential:

| Email | Password | Role |
|-------|----------|------|
| `admin@remitx.com` | `Admin@RemitX2024!` | super_admin |
| `cadmin@remitx.com` | `Test@1234!` | client_admin |
| `maker1@remitx.com` | `Test@1234!` | maker |
| `checker1@remitx.com` | `Test@1234!` | checker |

**Dev quick-login:** in development the login page shows a **DEV** panel with role chips that auto-fill the credentials above — click a chip then press **Sign in to workspace**.

---

## Troubleshooting

**Login returns "Invalid credentials"**
The API is not running or not reachable. Start `remitx-api` first and confirm
`http://localhost:3000/health` returns `{ "status": "ok" }`.

**Blank page after `npm run build && npm run preview`**
Check the browser console for asset path errors — ensure `VITE_API_URL` is set correctly for the target environment.
