# Cocowork Contracts & Invoices

A lightweight Cocowork web app to manage contractor profiles, shared contracts, and monthly invoices.

## Run locally (Python stdlib)

```bash
python3 server.py
```

Then open `http://localhost:8000`.

## Default Admin

- Email: `admin@cocowork.local`
- Password: `admin123`

## What’s Included

- Contractor sign-up and login
- Profile data for invoicing and contracts
- Shared contract view + signatures (contractor + admin)
- Invoice generation split equally across contractors
- Admin dashboard to view contractors, sign contracts, and mark invoices paid

## Deploy to Vercel

This project includes a Vercel serverless function at `api/index.py` and static UI in `public/`.

Important: Vercel serverless functions do **not** keep a persistent filesystem. The built‑in SQLite DB is stored in `/tmp` and will reset.
For production, wire this to a hosted database (Supabase/Postgres, Neon, etc.).

### Steps

1. Create a GitHub repo (e.g., `cocowork`) and push this code.
2. In Vercel, import the repo.
3. Set environment variables if desired:
   - `COCOWORK_ADMIN_EMAIL`
   - `COCOWORK_ADMIN_PASSWORD`
   - `COCOWORK_DB_PATH` (for custom SQLite path; not persistent on Vercel)
4. Deploy.

## Data

Local data is stored in `cocowork.db` (SQLite) in the project root.
