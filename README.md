<!-- prettier-ignore -->
<div align="center">

<img src="./frontend/public/logo.png" alt="TaskFlow logo" align="center" height="64" />

# TaskFlow

Multi-tenant project & task management platform with role-based access control, resource sharing, and team collaboration.

![Node.js](https://img.shields.io/badge/Node.js->=20-3c873a?style=flat-square)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Multi-Tenancy](#multi-tenancy) • [Roles & Permissions](#roles--permissions)

</div>

---

TaskFlow gives teams a clear view of every project, task, and deadline. It supports full multi-tenancy — every project, task, and label is scoped to a workspace. Users can belong to multiple workspaces and switch between them instantly.

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Tenancy** | Workspace isolation — every resource is scoped to a tenant |
| **Workspace Switcher** | Switch between workspaces; tokens re-issued with new tenant context |
| **Invite Flow** | Invite members by email with role assignment; one-time accept link |
| **Per-Resource Sharing** | Share projects/tasks with team members or external emails (VIEW / EDIT / MANAGE) |
| **RBAC** | Five roles (Owner, Admin, Manager, Member, Guest) with granular permissions |
| **Task Workflow** | 4-stage linear workflow: TODO → IN_PROGRESS → IN_REVIEW → DONE |
| **Subtasks** | Add, toggle, and delete subtasks within tasks |
| **Labels** | Tenant-scoped color labels for task categorization |
| **Comments** | Task-level commenting |
| **File Attachments** | Upload and manage file attachments on tasks |
| **Dashboard** | Summary stats, status distribution, completion trends, team workload |
| **Activity Logs** | Full audit trail of all changes with entity-level history |
| **Audit Log** | Tenant-scoped audit trail with actor, action, resource, and ALLOW/DENY decision |
| **Notifications** | In-app notifications for assignments, comments, due dates, status changes |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, shadcn |
| Backend | Express 4, TypeScript, Zod validation |
| Database | PostgreSQL 16, Prisma 5 ORM |
| Auth | JWT (15 min access + 7 day refresh), bcrypt |
| Testing | Vitest |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [PostgreSQL](https://www.postgresql.org/) 16+

### 1. Clone and install

```bash
git clone <repository-url>
cd TaskFlow

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET=<random-string>
JWT_REFRESH_SECRET=<another-random-string>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

```bash
# Frontend
cp frontend/.env.example frontend/.env.local
```

Verify `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start development servers

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd frontend && npm run dev
```

> [!NOTE]
> The seed script creates demo accounts with password `Password123` across all five roles (Owner, Admin, Manager, Member, Guest). Run `npm run db:seed` from the `backend/` directory to re-seed.

## Multi-Tenancy

Every user gets a personal workspace on registration. Users can belong to multiple workspaces via invitations.

- **JWT carries `tenantId`** — all API queries are automatically scoped to the active workspace
- **Workspace Switcher** — select a different workspace; tokens are re-issued with new tenant context
- **Invite Flow** — admins/managers invite members by email with a role; one-time accept link
- **Per-Resource Sharing** — share individual projects/tasks with specific access levels (VIEW/EDIT/MANAGE)

## Roles & Permissions

| Action | Owner | Admin | Manager | Member | Guest |
|--------|:-----:|:-----:|:-------:|:------:|:-----:|
| Manage workspace settings | Yes | | | | |
| Manage members & roles | Yes | Yes | | | |
| View workspace | Yes | Yes | Yes | Yes | Yes |
| Create projects | Yes | Yes | Yes | | |
| Manage all project tasks | Yes | Yes | Yes | | |
| Manage own tasks | Yes | Yes | Yes | Yes | |
| Change task status | Yes | Yes | Yes | Assigned only | |
| Add comments | Yes | Yes | Yes | Yes | |
| Manage labels | Yes | Yes | Yes | | |
| View dashboard | Yes | Yes | Yes | Scoped | |
| Share resources | Yes | Yes | Yes | | |
| View audit log | Yes | Yes | Yes | | |
| View shared resource | | | | | Via share |

### Task Status Workflow

```
TODO → IN_PROGRESS → IN_REVIEW → DONE
```

Members and Managers must follow linear progression (no skip/reverse). Admins and Owners can skip or reverse stages. Every status change is logged to the audit trail.
