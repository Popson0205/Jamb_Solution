# JAMB CBT Centre Allocator

Student PWA + JAMB Admin Portal for nearest-centre exam allocation.

## Structure
```
jamb-cbt-allocator/
├── api/          # Node.js + Express + TypeScript backend
├── client/       # Student PWA (React + Leaflet + Vite)
├── admin/        # JAMB Admin Portal (React + Recharts + Vite)
├── seed.sql      # 1,040 centres + batch schedule + admin user
└── render.yaml   # Render deployment config
```

## Local Setup
```bash
# 1. API
cd api && cp .env.example .env   # fill in your Neon DATABASE_URL
npm install && npm run build && node dist/server.js

# 2. Student PWA
cd client && npm install && npm run dev   # :5173

# 3. Admin Portal
cd admin && npm install && npm run dev    # :5174
```

Admin login: admin@jamb.gov.ng / Admin@JAMB2026

## Deploy to Render
1. Push repo to GitHub
2. Render → New → Blueprint → connect repo
3. Set env vars: DATABASE_URL (Neon), TERMII_API_KEY, SENDGRID_API_KEY, CLIENT_URL, ADMIN_URL
4. Run seed: psql $DATABASE_URL -f seed.sql
