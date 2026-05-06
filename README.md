# JAMB CBT Centre Allocator

A full-stack system for allocating JAMB exam candidates to their nearest available CBT centre.

## Structure

```
jamb-cbt-allocator/
├── api/          # Node.js + Express + TypeScript backend
├── client/       # Student PWA (React + Leaflet + Vite)
├── admin/        # JAMB Admin Portal (React + Recharts + Vite)
├── seed.sql      # 1,040 centres + batch schedule + admin user
└── render.yaml   # Render free-tier deployment config
```

## Quick Start (Local)

### 1. Database
```bash
createdb jamb_allocator
psql jamb_allocator -c "CREATE EXTENSION postgis;"
```

### 2. API
```bash
cd api
cp .env.example .env   # fill in DATABASE_URL and keys
npm install
npm run migrate
npm run seed
npm run dev            # runs on :3001
```

### 3. Student PWA
```bash
cd client && npm install && npm run dev   # runs on :5173
```

### 4. Admin Portal
```bash
cd admin && npm install && npm run dev    # runs on :5174
```

Admin login: `admin@jamb.gov.ng` / `Admin@JAMB2026`

## Deploy to Render
1. Push repo to GitHub
2. Connect repo in Render dashboard
3. Render reads `render.yaml` and creates all 3 services + DB automatically
4. Set env vars (TERMII_API_KEY, SENDGRID_API_KEY) in Render dashboard
5. Run seed: `psql $DATABASE_URL -f seed.sql`

## Allocation Logic
- Radius rings: 3km → 10km → 20km → 25km → 30km → ward → LGA
- Batches: Mon–Sat (Batch 3 excluded on Fridays)
- Capacity: 150–200 students per batch per centre
- Overflow: next available day (max 30 days ahead)
- Notifications: on-screen + email (SendGrid) + SMS (Termii)
