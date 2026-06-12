# FishGrow (鱼成长 / フィッシュグロウ)

Virtual fish pet game — pick species, watch them grow from fry to adult, feed on schedule, get weather-aware care advice.

Stack: **Next.js 14 (App Router) + NestJS 11 + Prisma + SQLite**. Free-tier deploy target.

## Quickstart (5 minutes)

```bash
git clone https://github.com/hnlisf/fishgrow.git
cd fishgrow

# 1) Backend
cd backend
npm install
npm run build            # nest build + tsc compile seed.ts
npx prisma migrate deploy
npm run db:seed          # 10 species + demo user + demo tank + 1 goldfish
npm run start            # http://localhost:3000
# Swagger docs: http://localhost:3000/api/docs

# 2) Frontend (new terminal)
cd ../frontend
npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:3000' > .env.local
npm run dev              # http://localhost:3001
```

Open http://localhost:3001 — the demo tank with a goldfish "小金" is ready.

## Features (MVP)

1. **Species library + custom** — 10 default species, multi-language (zh/en/ja), POST custom species.
2. **Fish tank + fish** — CRUD tanks/fish, 4 growth stages (fry → juvenile → subadult → adult).
3. **Feeding + growth model** — feed button, growth % computed from species growthDays + feed history.
4. **Weather integration** — IP geolocation (ipapi.co) + weather (Open-Meteo) → per-fish feeding advice.
5. **Reminders** — auto-derived from species feed frequency + tank size; full CRUD.
6. **Multi-language UI** — `next-intl` (zh/en/ja), fish names read from DB JSONB.
7. **UI style** — fresh/natural + healing aquarelle palette (#5BA9C7 / #F4E4C1 / #FF7F50).

## API summary

Base URL: `http://localhost:3000`. Swagger at `/api/docs`.

| Method | Path | Notes |
|--------|------|-------|
| GET    | /api/fish-species         | list, `?lang=` |
| GET    | /api/fish-species/:id     | detail |
| POST   | /api/fish-species/custom  | create user-defined species |
| GET    | /api/fish-tanks?userId=   | list, `?lang=` |
| POST   | /api/fish-tanks           | create |
| GET    | /api/fish-tanks/:id       | detail |
| GET    | /api/fish?tankId=         | list, `?lang=` |
| POST   | /api/fish                 | create |
| PUT    | /api/fish/:id             | update |
| DELETE | /api/fish/:id             | delete |
| POST   | /api/fish/:id/feed        | feed (validates freq) |
| GET    | /api/location             | IP → lat/lon/city (cache 24h) |
| GET    | /api/weather?lat=&lon=    | current weather (cache 30 min) |
| GET    | /api/feeding-advice?userId= | weather-aware advice per fish |
| GET/POST/PUT/DELETE | /api/reminders | reminders CRUD |
| POST   | /api/reminders/ensure-defaults | auto-derive from species |

All endpoints accept `?lang=zh|en|ja`.

## Repo layout

```
fishgrow/
├── backend/          NestJS + Prisma + SQLite
│   ├── src/          modules: fish-species, fish-tanks, fish, feeding-advice,
│   │                 location, weather, reminders, prisma
│   ├── prisma/       schema.prisma + migrations + seed.ts (10 species + demo data)
│   └── test/         e2e tests
├── frontend/         Next.js 14 (App Router) + Tailwind + next-intl
│   ├── src/app/      pages: /, /species, /tank, /feed, /reminders
│   └── messages/     zh.json, en.json, ja.json
├── .github/workflows/ci.yml    lint + test + build on every push
├── DEPLOY.md         Vercel + Railway free-tier guide
└── README.md         this file
```

## Tests

```bash
cd backend && npm test        # unit tests (Jest)
cd frontend && npm test       # component tests
```

## Deploy

See `DEPLOY.md` for Vercel (frontend) + Railway (backend + SQLite).

## License

MIT
