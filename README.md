# AWS Route53 Clone

A full-stack functional clone of the AWS Route53 management console, built as a Scaler SDE assignment.

## Overview

This application replicates the AWS Route53 user experience for managing DNS Hosted Zones and DNS Records. It features a pixel-faithful AWS Console UI with full CRUD operations, search, filtering, pagination, notifications, and session management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (TypeScript), Tailwind CSS |
| **Backend** | FastAPI (Python 3.10+) |
| **Database** | SQLite (WAL mode, Foreign Key Cascades) |
| **Auth** | JWT (stateless, mocked IAM) |

## Features

### Authentication
- Sign in / Sign up
- Session persistence via JWT stored in `localStorage`
- Demo account: `demo@route53.example` / `DemoPass123!`
- Token validation on every page load and API request

### Hosted Zones
- View all hosted zones in an AWS-style sortable table
- Search by domain name or description
- Create hosted zones (Public or Private)
- Edit zone name and description
- Delete zones (with cascade to DNS records)
- Bulk delete with multi-select checkboxes
- Pagination with configurable page size
- Export hosted zones list as JSON

### DNS Records
- View all records for a hosted zone
- Support for all 9 record types: **A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA**
- Search by name or value
- Filter by record type
- Create/Edit/Delete records
- Bulk delete with multi-select checkboxes
- Per-type validation (server-side and client-side)
- Per-type UI hints and placeholders

### Route53 UX
- AWS dark sidebar navigation
- AWS-style top header with user avatar and breadcrumbs
- AWS color palette (orange, dark navy, blue links)
- Modal dialogs with keyboard (`Escape`) support
- Toast notifications (success/error/info)
- Loading spinners and empty states
- Mocked sections: Dashboard, Health Checks, Traffic Policies, Resolver, Domains, IP Routing, Policy Records, Profiles

### Bonus Features Implemented
- **BIND Zone File Export**: Download standard BIND `.zone` files for any hosted zone
- **BIND Zone File Import**: Parse and import standard BIND zone files directly
- **JSON Export**: Export hosted zones and records in JSON format
- **Keyboard Shortcuts**:
  - `/` : Focus search bar
  - `c` : Open Create modal
  - `r` : Refresh table list
  - `?` : Open Keyboard Shortcuts cheat sheet
  - `Esc` : Close active modal
- **Bulk Operations**: Multi-select bulk deletion for hosted zones and DNS records

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Backend

```bash
cd backend

# Create virtual environment (optional)
python -m venv .venv
# Activate:
# Windows: .\.venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt

# Start the server
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive API documentation: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run production server
npm run build
npm run start
```

The application will be available at `http://localhost:3000`

---

## Docker & Container Deployment

Run both backend and frontend with Docker Compose:

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- SQLite volume persisted under `sqlite_data` volume

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
                             │ SQLite (WAL + Foreign Keys)
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
| `password_hash` | TEXT | SHA-256 salted hash |
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
| `name` | TEXT | Record name (@ or subdomain) |
| `type` | TEXT | A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA |
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

---

## Testing

### Backend Unit & Integration Tests (pytest)

```bash
cd backend
python -m pytest tests/ -v
```

22 tests covering:
- Authentication flow (register, login, logout, /me)
- Database initialization and Foreign Key cascade
- Hosted zones CRUD, search, pagination, duplicate validation
- DNS records CRUD for all 9 record types
- Per-type value validation (A, AAAA, MX, SRV, CAA, TXT, etc.)
- Authorization guards

### End-to-End API Integration Suite

```bash
cd frontend
npm run test:e2e
```

57 assertions covering:
- Full API integration flow
- Demo user authentication and session validation
- Hosted zone creation, duplicate checks, update, and search
- DNS record creation for all 9 types and type-specific validations
- Cascade deletion verification

---

## Production Deployment Guide

### Option 1: Vercel (Frontend) + Render/Railway (Backend)
1. **Backend**:
   - Deploy `backend/` as a Python web service on [Render](https://render.com) or [Railway](https://railway.app).
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set environment variables:
     - `ROUTE53_SECRET_KEY`: `<strong-secret>`
     - `ROUTE53_DATABASE_PATH`: `route53.db` (or mount a persistent disk)
2. **Frontend**:
   - Deploy `frontend/` on [Vercel](https://vercel.com).
   - Root Directory: `frontend`
   - Environment Variable: `NEXT_PUBLIC_API_URL` set to the backend Render/Railway URL.

### Option 2: Docker Compose on VPS / EC2
1. Clone the repository on your server.
2. Run `docker-compose up -d --build`.

---

## Demo Credentials

| Field | Value |
|-------|-------|
| Email | `demo@route53.example` |
| Password | `DemoPass123!` |
