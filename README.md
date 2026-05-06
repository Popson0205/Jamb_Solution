# JAMB CBT Centre Allocator

Student PWA + JAMB Admin Portal for nearest-centre exam allocation with candidate verification.

## Structure
```
jamb-cbt-allocator/
├── api/                    # Node.js + Express + TypeScript backend
├── client/                 # Student PWA (React + Leaflet + Vite)
├── admin/                  # JAMB Admin Portal (React + Recharts + Vite)
├── seed.sql                # 1,040 CBT centres + batch schedule + admin user
├── seed_candidates.sql     # 500 verified JAMB candidates (demo data)
└── render.yaml             # Render deployment config
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

## Database Seed (run in order)
```bash
psql $DATABASE_URL -f seed.sql              # centres + batches + admin user
psql $DATABASE_URL -f seed_candidates.sql   # 500 verified candidates
```

## Admin Login
- Email: admin@jamb.gov.ng
- Password: Admin@JAMB2026

## Verification Flow
Students must enter their reg number + full name exactly as registered with JAMB.
The system checks against the `candidates` table before allocating a centre.

## Test Candidates (use these on the student PWA)
| Reg Number | Full Name |
|---|---|
| 202664221019KQ | OBI PETER PEACE |
| 202640905340FU | OKAFOR MARY ANGELA |
| 202643708917TN | OKONKWO GABRIEL CORNELIUS |
| 202682293578CQ | CHUKWU SAMUEL JOHN |
| 202636772158LQ | OBASANJO AGNES ANDREW |
| 202639083949VU | EKWUEME FAITH JOSEPH |
| 202662091490WF | IBRAHIM MARK JOY |
| 202671939238RW | IBRAHIM BLESSING ANDREW |
| 202655473870BT | OKAFOR PHILIP AGNES |
| 202621784614MK | OBI DAVID JOHN |
