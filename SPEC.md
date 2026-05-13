# Project Specification — Subscription Platform

> **Stack:** TypeScript · Node.js · Express · PostgreSQL · Prisma ORM  
> **Purpose:** Spec-driven development context. Use this file as the source of truth when implementing features, writing tests, and reviewing code.

---

## 1. Project Overview

A multi-tenant **Subscription Platform** consisting of two surfaces:

| Surface | Description |
|---|---|
| **Admin Website** | Internal dashboard for managing clients, plans, subscriptions, billing, and reporting |
| **Client Website** | Public-facing portal where end-users register, browse plans, subscribe, and manage their account |

---

## 2. Architecture

### 2.1 System Overview

The backend is a **single Express application** — one deployable service that exposes a REST API consumed by two separate frontend applications (out of scope for this spec).

```
┌──────────────────────────────────────────────────────────┐
│                     Backend (this repo)                   │
│                                                           │
│  Express · TypeScript · Prisma                            │
│                                                           │
│  /api/v1/auth/*          → Auth module                    │
│  /api/v1/client/*        → Client module                  │
│  /api/v1/subscription/*  → Subscription module            │
│  /api/v1/admin/*         → Admin module                   │
│                                                           │
└───────────────────────────┬──────────────────────────────┘
                            │ Prisma ORM
              ┌─────────────▼─────────────┐
              │       PostgreSQL DB         │
              └────────────────────────────┘
```

### 2.2 Source Layout

```
.
├── prisma/
│   ├── schema.prisma             # Single source of truth for DB schema
│   ├── migrations/               # Auto-generated Prisma migration history
│   └── seed.ts                   # Dev seed data
│
├── src/
│   ├── index.ts                  # Server bootstrap (listen)
│   ├── app.ts                    # Express app factory (middleware, routers)
│   │
│   ├── subscription/             # Module: serves the Subscription frontend
│   │   ├── controllers/          # Handles requests for subscription-facing routes
│   │   ├── routes/               # Express routers scoped to /api/v1/subscription
│   │   └── services/             # Business logic exclusive to subscription surface
│   │
│   ├── client/                   # Module: serves the Client frontend
│   │   ├── controllers/          # Handles requests for client-facing routes
│   │   ├── routes/               # Express routers scoped to /api/v1/client
│   │   └── services/             # Business logic exclusive to client surface
│   │
│   └── shared/                   # Shared module — only for logic used by BOTH modules
│       ├── config/               # env.ts — Zod-parsed typed env vars
│       ├── middlewares/          # authenticate, authorize, errorHandler, rateLimiter
│       ├── routes/               # Root router, /health endpoint
│       ├── services/             # Mailer, payment gateway adapter, token service
│       ├── utils/                # date, crypto, pagination, response helpers
│       └── validations/          # Zod schemas reused across both modules
│
├── prisma.config.ts              # PrismaClient singleton export
├── tsconfig.json
└── package.json
```

### 2.3 Module Responsibilities

| Module | Serves | Owns |
|---|---|---|
| `subscription` | **Subscription frontend** (ADMIN / SUPER_ADMIN role) | Plan CRUD, subscription management, billing, invoices, user management, dashboard stats |
| `client` | **Client frontend** (USER role) | Registration, login, profile, plan browsing, own subscription & invoice view |
| `shared` | **Both modules** | Auth middleware, JWT/token logic, error handler, mailer, payment gateway adapter, pagination utils, shared Zod schemas |

> **Rule:** A service or utility only moves into `shared/` when it is genuinely needed by both `subscription/` and `client/`. If it is used by only one module, it stays inside that module's `services/` or `utils/`.

### 2.4 Auth Routing Convention

Both modules share the same auth mechanism but have separate login flows:

| Route | Module | Role issued |
|---|---|---|
| `POST /api/v1/client/auth/register` | `client` | `USER` |
| `POST /api/v1/client/auth/login` | `client` | `USER` |
| `POST /api/v1/subscription/auth/login` | `subscription` | `ADMIN` / `SUPER_ADMIN` |
| `POST /api/v1/shared/auth/refresh` | `shared` | — (rotates token) |
| `POST /api/v1/shared/auth/logout` | `shared` | — (revokes token) |

Token signing, refresh rotation, and revocation live in `shared/services/token.service.ts` since both modules need them.

---

## 3. API Design

### 5.1 Base URL Structure

```
/api/v1/client/...          # Client module  — serves Client frontend (USER role)
/api/v1/subscription/...    # Subscription module — serves Subscription frontend (ADMIN role)
/api/v1/shared/...          # Shared module  — endpoints used by both frontends
```

### 5.2 Client Module Endpoints (`/api/v1/client`)

Consumed exclusively by the **Client frontend**. All authenticated routes require `USER` role.

#### Auth (Client)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/client/auth/register` | Public | Register new user |
| `POST` | `/api/v1/client/auth/login` | Public | Login → `accessToken` + `refreshToken` |
| `POST` | `/api/v1/client/auth/verify-email` | Public | Verify email with token |
| `POST` | `/api/v1/client/auth/forgot-password` | Public | Send password reset email |
| `POST` | `/api/v1/client/auth/reset-password` | Public | Reset password with token |

#### Profile
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/client/me` | USER | Get own profile |
| `PUT` | `/api/v1/client/me` | USER | Update profile |
| `PUT` | `/api/v1/client/me/password` | USER | Change password |

#### Plans (read-only view for clients)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/client/plans` | Public | List all active plans |
| `GET` | `/api/v1/client/plans/:id` | Public | Plan detail |

#### My Subscription
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/client/subscription` | USER | Get own active subscription |
| `POST` | `/api/v1/client/subscription` | USER | Subscribe to a plan |
| `POST` | `/api/v1/client/subscription/cancel` | USER | Cancel own subscription |
| `POST` | `/api/v1/client/subscription/upgrade` | USER | Upgrade / downgrade plan |
| `GET` | `/api/v1/client/invoices` | USER | List own invoices |
| `GET` | `/api/v1/client/invoices/:id` | USER | Own invoice detail |

---

### 5.3 Subscription Module Endpoints (`/api/v1/subscription`)

Consumed exclusively by the **Subscription frontend**. All routes require `ADMIN` or `SUPER_ADMIN` role unless noted.

#### Auth (Admin)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/subscription/auth/login` | Public | Admin login → `accessToken` + `refreshToken` |

#### User Management
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscription/users` | ADMIN | List all users (paginated, filterable) |
| `GET` | `/api/v1/subscription/users/:id` | ADMIN | User detail |
| `PATCH` | `/api/v1/subscription/users/:id/status` | ADMIN | Activate / deactivate user |

#### Plan Management
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscription/plans` | ADMIN | List all plans (incl. inactive) |
| `POST` | `/api/v1/subscription/plans` | ADMIN | Create plan |
| `PUT` | `/api/v1/subscription/plans/:id` | ADMIN | Update plan |
| `DELETE` | `/api/v1/subscription/plans/:id` | SUPER_ADMIN | Deactivate plan |

#### Subscription Management
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscription/subscriptions` | ADMIN | List all subscriptions |
| `GET` | `/api/v1/subscription/subscriptions/:id` | ADMIN | Subscription detail |
| `PATCH` | `/api/v1/subscription/subscriptions/:id/status` | ADMIN | Manual status override |

#### Invoice & Billing
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscription/invoices` | ADMIN | List all invoices |
| `GET` | `/api/v1/subscription/invoices/:id` | ADMIN | Invoice detail |
| `POST` | `/api/v1/subscription/invoices/:id/mark-paid` | ADMIN | Manually mark invoice as paid |

#### Dashboard
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/subscription/dashboard` | ADMIN | Summary stats (MRR, active users, churn, etc.) |

---

### 5.4 Shared Module Endpoints (`/api/v1/shared`)

Consumed by **both frontends** — logic that applies regardless of role.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/shared/auth/refresh` | Refresh token | Rotate access + refresh token |
| `POST` | `/api/v1/shared/auth/logout` | Refresh token | Revoke refresh token |
| `GET` | `/api/v1/shared/health` | Public | Health check |

### 5.5 Standard Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {              // optional, for paginated results
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [ ... ]  // optional field-level errors
  }
}
```

### 5.6 HTTP Status Codes

| Situation | Code |
|---|---|
| Success (read) | `200` |
| Created | `201` |
| No content | `204` |
| Bad request / validation | `400` |
| Unauthenticated | `401` |
| Forbidden | `403` |
| Not found | `404` |
| Conflict (e.g. duplicate email) | `409` |
| Server error | `500` |

---

## 4. Authentication & Authorization

### 6.1 Strategy

- **Access Token:** JWT, short-lived (`15m`), signed with `JWT_SECRET`
- **Refresh Token:** Opaque random token, long-lived (`7d`), stored hashed in `refresh_tokens` table
- **Rotation:** New refresh token issued on every `/shared/auth/refresh` call; old one revoked
- **Separation:** `client` and `subscription` modules each have their own login endpoint that issue tokens scoped to their respective role. Token signing/verification logic lives in `shared/services/token.service.ts`

### 6.2 Token Payload

```typescript
interface JWTPayload {
  sub: string;       // user.id (uuid)
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  iat: number;
  exp: number;
}
```

### 6.3 Middleware Stack

```
Request → rateLimiter → authenticate → authorize(role) → validate(schema) → controller
```

---

## 5. Environment Variables

```env
# App
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/subscription_db

# JWT
JWT_SECRET=your_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Mail
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM=noreply@example.com

# Payment Gateway (e.g. Midtrans)
PAYMENT_GATEWAY=midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
```

---

## 6. Service Layer Conventions

Each service class is instantiated as a singleton and receives a Prisma client via constructor injection.

```typescript
// Example pattern
export class SubscriptionService {
  constructor(private readonly prisma: PrismaClient) {}

  async subscribe(userId: string, planId: string): Promise<Subscription> {
    // 1. Validate user has no active subscription
    // 2. Fetch plan (throw if not found / inactive)
    // 3. Create subscription record
    // 4. Generate first invoice
    // 5. Return subscription
  }
}
```

### 8.1 Error Handling

Throw typed application errors that the global error handler converts to the standard response envelope:

```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

// Usage
throw new AppError('PLAN_NOT_FOUND', 'The requested plan does not exist.', 404);
```

---

## 7. Validation

Use **Zod** for all request body/query/param validation. Define schemas in `src/shared/validations/`.

```typescript
// src/shared/validations/auth.validation.ts
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
    full_name: z.string().min(2).max(255),
    phone: z.string().optional(),
  }),
});
```

---

## 8. Subscription Lifecycle State Machine

```
[New User]
     │
     ▼
  TRIAL ──(trial expires)──► ACTIVE ──(billing fails)──► PAST_DUE
     │                          │                              │
     │                    (user cancels)               (payment retried)
     │                          │                              │
     └──────────────────► CANCELLED                      ACTIVE / EXPIRED
```

**Rules:**
- A user can only have **one** active/trial subscription at a time
- Cancellation is effective at `current_period_end` (no immediate termination)
- Upgrade/downgrade creates a new subscription record; old one is set to `CANCELLED` with prorated invoice adjustment
- `EXPIRED` is set by a cron job when `current_period_end` passes without successful payment

---

## 9. Folder Conventions & File Naming

```
src/{module}/
  controllers/
    {resource}.controller.ts       # e.g. subscription.controller.ts
  routes/
    {resource}.routes.ts           # e.g. subscription.routes.ts
  services/
    {resource}.service.ts          # e.g. subscription.service.ts
```

- Files: `kebab-case`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Prisma model fields: `snake_case` (mapped from camelCase via `@map`)
- Enum values: `SCREAMING_SNAKE_CASE`

---

## 10. Testing Strategy

| Layer | Tool | Coverage Target |
|---|---|---|
| Unit (services) | Vitest + prisma-mock | ≥ 80% |
| Integration (routes) | Supertest + test DB | All happy & error paths |
| E2E | Supertest against running server | Critical flows only |

Test files mirror source: `src/subscription/services/__tests__/subscription.service.test.ts`

---

## 11. Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  }
}
```

---
