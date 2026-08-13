# AWS Route53 Clone

A full-stack functional clone of the AWS Route53 management console, built as a Scaler SDE assignment.

![Route53 Clone](docs/screenshot.png)

## Overview

This application replicates the AWS Route53 user experience for managing DNS Hosted Zones and DNS Records. It features a pixel-faithful AWS Console UI with full CRUD operations, search, filtering, pagination, notifications, and session management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (TypeScript), Tailwind CSS |
| **Backend** | FastAPI (Python 3.10+) |
| **Database** | SQLite |
| **Auth** | JWT (stateless, mocked IAM) |

## Features

### Authentication
- Sign in / Sign up
- Session persistence via JWT stored in `localStorage`
- Demo account: `demo@route53.example` / `DemoPass123!`
- Token validation on every page load

### Hosted Zones
- View all hosted zones in an AWS-style sortable table
- Search by domain name or description
- Create hosted zones (Public or Private)
- Edit zone name and description
- Delete zones (with cascade to DNS records)
- Bulk delete with multi-select checkboxes
- Pagination with configurable page size

### DNS Records
- View all records for a hosted zone
- Support for: **A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA**
- Search by name or value
- Filter by record type
- Create/Edit/Delete records
- Bulk delete with multi-select
- Per-type validation (server-side)
- Per-type UI hints and placeholders

### Route53 UX
- AWS dark sidebar navigation
- AWS-style top header with user avatar
- AWS color palette (orange, dark navy, blue links)
- Modal dialogs with keyboard (Escape) support
- Toast notifications (success/error/info)
- Loading spinners and empty states
- Breadcrumb navigation
- Mocked sections: Health Checks, Traffic Policies, Resolver, Domains, Profiles

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Backend

```bash
cd backend

# Create a virtual environment (optional but recommended)
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env if needed

# Start the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL if backend runs on a different port

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js)                     │
│  ┌──────────────┐  ┌───────────────────────────────────┐│
│  │ Auth Pages   │  │ Dashboard (requires auth)         ││
│  │ /login       │  │ ├── /dashboard                    ││
│  │ /register    │  │ ├── /hosted-zones                 ││
│  └──────────────┘  │ │    └── /[zoneId]/records        ││
│                    │ ├── /health-checks (mocked)       ││
│                    │ ├── /traffic-policies (mocked)    ││
│                    │ └── /resolver (mocked)            ││
│                    └───────────────────────────────────┘│
└────────────────────────────┬────────────────────────────┘
                             │ HTTP + JWT Bearer
┌────────────────────────────▼────────────────────────────┐
│                    FastAPI Backend                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/auth      (register, login, logout, me)    │   │
│  │  /api/hosted-zones    (CRUD + search + pagination)│   │
│  │  /api/hosted-zones/{id}/records  (CRUD + search) │   │
│  │  /api/health                                     │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────┘
                             │ SQLite
┌────────────────────────────▼────────────────────────────┐
│                    SQLite Database                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   users      │  │hosted_zones  │  │  dns_records  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Random hex ID |
| `email` | TEXT UNIQUE | User email |
| `display_name` | TEXT | Display name |
| `password_hash` | TEXT | SHA-256 hash |
| `created_at` | TEXT | ISO timestamp |

### `hosted_zones`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Random hex ID |
| `name` | TEXT UNIQUE | Domain name (e.g., example.com) |
| `private` | INTEGER | 0=public, 1=private |
| `description` | TEXT | Optional description |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |

### `dns_records`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Random hex ID |
| `zone_id` | TEXT FK | References `hosted_zones(id)` ON DELETE CASCADE |
| `name` | TEXT | Record name |
| `type` | TEXT | A/AAAA/CNAME/TXT/MX/NS/PTR/SRV/CAA |
| `ttl` | INTEGER | Time-to-live in seconds |
| `value` | TEXT | Newline-separated values |
| `comment` | TEXT | Optional comment |
| `created_at` | TEXT | ISO timestamp |
| `updated_at` | TEXT | ISO timestamp |

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Sign in → returns JWT |
| `POST` | `/api/auth/logout` | Sign out (client-side token removal) |
| `GET` | `/api/auth/me` | Get current user |

### Hosted Zones

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hosted-zones` | List zones (search, page, page_size) |
| `POST` | `/api/hosted-zones` | Create zone |
| `GET` | `/api/hosted-zones/{id}` | Get zone by ID |
| `PUT` | `/api/hosted-zones/{id}` | Update zone |
| `DELETE` | `/api/hosted-zones/{id}` | Delete zone |

### DNS Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/hosted-zones/{id}/records` | List records (search, type, page, page_size) |
| `POST` | `/api/hosted-zones/{id}/records` | Create record |
| `GET` | `/api/hosted-zones/{id}/records/{rid}` | Get record |
| `PUT` | `/api/hosted-zones/{id}/records/{rid}` | Update record |
| `DELETE` | `/api/hosted-zones/{id}/records/{rid}` | Delete record |

All authenticated endpoints require: `Authorization: Bearer <token>`

Interactive API docs at: `http://localhost:8000/docs`

---

## Testing

### Backend Tests

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests/ -v
```

22 tests covering:
- Authentication flow (register, login, logout, /me)
- Database initialization and FK cascade
- Hosted zones CRUD, search, pagination, validation
- DNS records CRUD for all 9 record types
- Per-type value validation (A, MX, SRV, CAA, etc.)
- Authorization guards

### Frontend E2E Tests (Playwright)

```bash
cd frontend
npm install
npx playwright install chromium
npx playwright test
```

Covers:
- Login/logout flow
- Hosted zones list, create, edit, delete
- DNS records create, edit, delete, filter

---

## Deployment

### Docker (Recommended)

```bash
# Backend
docker build -t route53-backend ./backend
docker run -p 8000:8000 -e ROUTE53_SECRET_KEY=your-secret route53-backend

# Frontend (build and serve)
cd frontend
npm run build
npm start
```

### Environment Variables

**Backend** (`backend/.env`):
```
ROUTE53_DATABASE_PATH=route53.db
ROUTE53_SECRET_KEY=your-production-secret-key-here
ROUTE53_TOKEN_EXPIRE_MINUTES=480
ROUTE53_SEED_PASSWORD=DemoPass123!
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production Deployment

- **Backend**: Deploy to Railway, Render, or any VPS. Use a bind-mounted volume for `route53.db`.
- **Frontend**: Deploy to Vercel (`vercel deploy`) or any Node.js host.
- Set `NEXT_PUBLIC_API_URL` to your backend's public URL.
- Set a strong `ROUTE53_SECRET_KEY` in production.

---

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app factory + lifespan
│   │   ├── auth.py          # JWT helpers + auth dependency
│   │   ├── db.py            # SQLite schema + connection factory
│   │   ├── models.py        # Domain dataclasses
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── core/
│   │   │   └── config.py    # Settings from env vars
│   │   └── routers/
│   │       ├── auth.py      # Auth endpoints
│   │       ├── hosted_zones.py  # Hosted zone endpoints
│   │       └── dns_records.py   # DNS record endpoints
│   ├── tests/               # pytest test suite
│   ├── requirements.txt
│   └── requirements-dev.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx          # Root layout
        │   ├── page.tsx            # Redirects to /login
        │   ├── login/              # Auth pages
        │   ├── register/
        │   └── (dashboard)/        # Auth-guarded layout
        │       ├── layout.tsx      # Header + sidebar + toast
        │       ├── dashboard/
        │       ├── hosted-zones/
        │       │   ├── page.tsx    # Zones list + CRUD
        │       │   └── [zoneId]/records/page.tsx  # Records CRUD
        │       ├── health-checks/  # Mocked sections
        │       ├── traffic-policies/
        │       ├── resolver/
        │       ├── domains/
        │       └── profiles/
        ├── components/
        │   ├── AwsHeader.tsx
        │   ├── AwsSidebar.tsx
        │   ├── Modal.tsx
        │   ├── Toast.tsx
        │   ├── Pagination.tsx
        │   ├── LoadingSpinner.tsx
        │   └── ComingSoon.tsx
        └── lib/
            ├── api.ts      # API client + types
            └── auth.ts     # JWT session management
```

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | `demo@route53.example` |
| Password | `DemoPass123!` |
