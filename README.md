# RentLock Property Management — Backend API

Enterprise-grade REST API backend for the RentLock Real Estate & Property Management platform.

Built with **Node.js, Express, TypeScript, JWT Authentication, Bcrypt, Zod Validation, Role-Based Access Control (RBAC), Prisma ORM, and MySQL**.

---

## 🛠 Technology Stack
* **Runtime:** Node.js (v20+ LTS / v22)
* **Framework:** Express.js (v4.21+)
* **Language:** TypeScript (v5.8+)
* **Database:** MySQL (v8.0+)
* **ORM:** Prisma ORM (v5.22+)
* **Authentication:** JWT Bearer tokens (`jsonwebtoken`)
* **Password Hashing:** Bcrypt (`bcryptjs` with 12 salt rounds)
* **Data Validation:** Zod (`zod`)
* **Security:** Helmet, CORS, Morgan

---

## 📁 Layered Architecture & Folder Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # Database models, relations & MySQL indexes
│   └── seed.ts                    # Demo data seeder for all 4 personas & modules
├── src/
│   ├── config/
│   │   ├── env.ts                 # Type-safe validated environment config (Zod)
│   │   ├── database.ts            # Prisma client singleton
│   │   └── constants.ts           # Roles, default RBAC permissions, limits
│   ├── types/
│   │   ├── express.d.ts           # Express request augmentation (req.user, req.permissions)
│   │   └── index.ts               # Shared API interfaces & pagination types
│   ├── utils/
│   │   ├── response.ts            # Standardized JSON response helpers (sendSuccess, sendPaginated)
│   │   ├── password.ts            # Bcrypt hash and verify
│   │   └── token.ts               # JWT sign and verify helpers
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # Bearer token verification & user context loader
│   │   ├── rbac.middleware.ts     # Role-based & granular permission checks
│   │   ├── validate.middleware.ts # Generic Zod validator (body, query, params)
│   │   └── error.middleware.ts    # Global centralized error handler
│   ├── validators/                # Strict Zod schemas for all endpoints
│   ├── services/                  # Pure business logic & database transactions
│   ├── controllers/               # HTTP request/response orchestration
│   ├── routes/                    # Modular routes mounted under /api/v1
│   ├── app.ts                     # Express application configuration
│   └── server.ts                  # Server entry point & graceful shutdown
├── .env.example                   # Environment configuration template
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start Guide

### 1. Configure Environment
```bash
cd backend
cp .env.example .env
```
Edit `.env` and set your MySQL database connection:
```env
DATABASE_URL="mysql://root:password@localhost:3306/rentlock_db?schema=public"
PORT=5000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client & Run Database Migrations
```bash
# Generate Prisma Client types
npm run prisma:generate

# Push schema directly to MySQL database
npm run prisma:push

# (Optional) Seed standard demo accounts and realistic portfolio data
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

The server will start at:
* **Base URL:** `http://localhost:5000/api/v1`
* **Health Check:** `http://localhost:5000/health`

---

## 🔑 Demo Login Accounts

| Persona | Email | Password | Scope & Default Access |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@rentlock.com` | `demo123` | Full portfolio, all properties, all permissions |
| **Manager** | `sarah.jenkins@rentlock.com` | `demo123` | Assigned properties, tenant onboarding, $1,000 cap |
| **Owner** | `owner@rentlock.com` | `demo123` | Owned properties, financial disbursements, tax docs |
| **Tenant** | `rebecca@rentlock.com` | `demo123` | Unit A-204, rent payments, maintenance requests |

---

## 📡 API Contract & Endpoints Overview

All endpoints are prefixed with `/api/v1`:

* `POST   /api/v1/auth/login` — Authenticate and receive JWT tokens
* `GET    /api/v1/auth/me` — Current profile and effective permissions
* `POST   /api/v1/auth/logout` — Terminate session
* `GET    /api/v1/properties` — List properties roster
* `POST   /api/v1/properties` — Create new property (requires `canAddProperties`)
* `GET    /api/v1/units` — List building units & occupancy
* `GET    /api/v1/tenants` — Resident directory (requires `canViewTenants`)
* `POST   /api/v1/tenants` — Onboard new resident (requires `canAddTenants`)
* `GET    /api/v1/leases` — Lease contracts list
* `PATCH  /api/v1/leases/:id/sign` — Countersign and activate lease
* `GET    /api/v1/invoices` — Rent billing ledger
* `POST   /api/v1/invoices/:id/pay` — Record rent collection & issue receipt
* `GET    /api/v1/expenses` — CapEx & OpEx expenses
* `GET    /api/v1/maintenance` — Work order tickets
* `PATCH  /api/v1/maintenance/:id/triage` — Manager triage & cost estimation
* `PATCH  /api/v1/maintenance/:id/approve` — Admin spending cap authorization
* `GET    /api/v1/operations/vendors` — Contractors directory & COI status
* `GET    /api/v1/operations/parking` — Assigned & vacant parking stalls
* `GET    /api/v1/operations/visitors` — Active digital visitor passes
* `GET    /api/v1/portal/owner/overview` — NOI and cash reserve summary
* `GET    /api/v1/portal/tenant/balance` — Resident household balance & lease
* `GET    /api/v1/portal/manager/overview` — Turnovers & open work orders
* `GET    /api/v1/reports/summary` — Executive portfolio KPIs
* `GET    /api/v1/search?q=...` — Universal global search

For the complete schema definitions and Zod validation criteria, see:
* [API_CONTRACT.md](../docs/API_CONTRACT.md)
* [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
* [BUSINESS_RULES.md](../docs/BUSINESS_RULES.md)
* [PROJECT_OVERVIEW.md](../docs/PROJECT_OVERVIEW.md)
