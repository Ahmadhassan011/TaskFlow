# API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `register`, `login`, `refresh`, `verify-email`, `forgot-password`, and `reset-password` require an `Authorization: Bearer <accessToken>` header.

---

## Roles

| Role | Description |
|------|-------------|
| `OWNER` | Full control — delete workspace, transfer ownership, all permissions |
| `ADMIN` | Manage members, roles, users, and all resources |
| `MANAGER` | Create/update/delete projects and tasks, manage labels |
| `MEMBER` | Default — work on assigned tasks, comment, view |
| `GUEST` | Read-only access to specific shared resources |

---

## Permissions

Every protected endpoint maps to a permission string. The `authorize` middleware checks RBAC (role grants) then ReBAC (per-resource `ResourceShare`) before allowing access. All decisions are logged to `AuditLog`.

| Permission | Owner | Admin | Manager | Member | Guest |
|------------|:-----:|:-----:|:-------:|:------:|:-----:|
| `tenant:read` | ✓ | ✓ | | | |
| `tenant:update` | ✓ | ✓ | | | |
| `tenant:delete` | ✓ | | | | |
| `tenant:transfer` | ✓ | | | | |
| `members:read` | ✓ | ✓ | ✓ | | |
| `members:manage` | ✓ | ✓ | | | |
| `members:invite` | ✓ | ✓ | | | |
| `roles:manage` | ✓ | ✓ | | | |
| `users:create` | ✓ | ✓ | | | |
| `users:read` | ✓ | ✓ | | | |
| `users:update` | ✓ | ✓ | | | |
| `users:delete` | ✓ | ✓ | | | |
| `projects:create` | ✓ | ✓ | ✓ | | |
| `projects:read:all` | ✓ | ✓ | | | |
| `projects:read:assigned` | ✓ | ✓ | ✓ | ✓ | ✓* |
| `projects:update` | ✓ | ✓ | ✓ | | |
| `projects:delete` | ✓ | ✓ | ✓ | | |
| `projects:members:manage` | ✓ | ✓ | ✓ | | |
| `tasks:create` | ✓ | ✓ | ✓ | ✓ | |
| `tasks:read` | ✓ | ✓ | ✓ | ✓ | ✓* |
| `tasks:update` | ✓ | ✓ | ✓ | ✓ | |
| `tasks:delete` | ✓ | ✓ | ✓ | | |
| `tasks:status:change` | ✓ | ✓ | ✓ | ✓ | |
| `labels:create` | ✓ | ✓ | ✓ | | |
| `labels:update` | ✓ | ✓ | ✓ | | |
| `labels:delete` | ✓ | ✓ | ✓ | | |
| `dashboard:view:all` | ✓ | ✓ | ✓ | | |
| `dashboard:view:own` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `dashboard:workload:view` | ✓ | ✓ | ✓ | | |
| `shares:manage` | ✓ | ✓ | ✓ | | |
| `shares:read` | ✓ | ✓ | ✓ | ✓ | |
| `audit:read` | ✓ | ✓ | | | |

\* Via per-resource `ResourceShare` (ReBAC) only — not role-granted.

---

## Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register a new account | Public |
| POST | `/auth/login` | Login with email and password | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/switch-tenant` | Re-issue tokens scoped to a different workspace | Access token |
| GET | `/auth/profile` | Get current user profile | Access token |
| PUT | `/auth/profile` | Update current user profile | Access token |
| PUT | `/auth/password` | Change password | Access token |
| POST | `/auth/forgot-password` | Request password reset | Public |
| POST | `/auth/reset-password` | Reset password with token | Public |
| GET | `/auth/verify-email/:token` | Verify email address | Public |
| POST | `/auth/logout` | Invalidate refresh token | Refresh token |
| DELETE | `/auth/account` | Delete own account (requires password) | Access token |

---

## Tenants (Workspaces)

All routes under `/api/tenants` are authenticated. The active tenant is resolved from the `X-Tenant-Id` header (or the `tenantId` embedded in the JWT).

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/tenants` | List workspaces the caller belongs to | Authenticated |
| GET | `/tenants/:id` | Get workspace details + member count | `tenant:read` |
| PATCH | `/tenants/:id` | Rename workspace | `tenant:update` |
| DELETE | `/tenants/:id` | Delete workspace (OWNER only) | `tenant:delete` |
| GET | `/tenants/:id/members` | List workspace members (paginated) | `members:read` |
| PATCH | `/tenants/:id/members/:userId` | Change member's workspace role | `roles:manage` |
| DELETE | `/tenants/:id/members/:userId` | Remove member from workspace | `members:manage` |
| POST | `/tenants/:id/invites` | Invite a user by email | `members:invite` |
| GET | `/tenants/:id/invites` | List pending invitations | `members:read` |
| POST | `/tenants/invites/accept` | Accept an invitation (body: `{ token }`) | Authenticated |
| GET | `/tenants/:id/audit-logs` | Query audit trail (paginated, filterable) | `audit:read` |
| GET | `/tenants/:id/shares` | List resource shares | `shares:read` |
| POST | `/tenants/:id/shares` | Share a project or task with a user/email | `shares:manage` |
| DELETE | `/tenants/:id/shares/:shareId` | Revoke a resource share | `shares:manage` |

---

## Projects

All routes scoped to the active tenant via `X-Tenant-Id`.

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/projects` | List projects (paginated, filterable by status/search) | `projects:read:all` or `projects:read:assigned` |
| POST | `/projects` | Create project | `projects:create` |
| GET | `/projects/:id` | Get project details + members | `projects:read:all` or `projects:read:assigned` |
| PUT | `/projects/:id` | Update project | `projects:update` |
| DELETE | `/projects/:id` | Delete project | `projects:delete` |
| POST | `/projects/:id/members` | Add member to project | `projects:members:manage` |
| PUT | `/projects/:id/members/:memberId` | Update project member role | `projects:members:manage` |
| DELETE | `/projects/:id/members/:memberId` | Remove member from project | `projects:members:manage` |

---

## Tasks

All routes scoped to the active tenant via `X-Tenant-Id`.

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/tasks` | List tasks (paginated, filterable by status/priority/assignee/project/search) | `tasks:read` |
| POST | `/tasks` | Create task | `tasks:create` |
| GET | `/tasks/:id` | Get task details | `tasks:read` |
| PUT | `/tasks/:id` | Update task | `tasks:update` |
| PATCH | `/tasks/:id/status` | Update task status (forward only) | `tasks:status:change` |
| DELETE | `/tasks/:id` | Delete task | `tasks:delete` |
| POST | `/tasks/:taskId/subtasks` | Add subtask | `tasks:update` |
| PATCH | `/tasks/:taskId/subtasks/:subtaskId` | Toggle subtask completion | `tasks:update` |
| DELETE | `/tasks/:taskId/subtasks/:subtaskId` | Delete subtask | `tasks:update` |

---

## Labels

All routes scoped to the active tenant via `X-Tenant-Id`.

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/projects/:projectId/labels` | List project labels (paginated) | Authenticated |
| POST | `/projects/:projectId/labels` | Create label | `labels:create` |
| PUT | `/projects/:projectId/labels/:labelId` | Update label | `labels:update` |
| DELETE | `/projects/:projectId/labels/:labelId` | Delete label | `labels:delete` |

---

## Comments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tasks/:taskId/comments` | List task comments (paginated) | Access token |
| POST | `/tasks/:taskId/comments` | Add comment | Access token |
| PUT | `/tasks/:taskId/comments/:commentId` | Update comment | Author only |
| DELETE | `/tasks/:taskId/comments/:commentId` | Delete comment | Author or Admin+ |

---

## Dashboard

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/dashboard/stats` | Summary statistics (task counts, overdue, etc.) | `dashboard:view:all` or `dashboard:view:own` |
| GET | `/dashboard/trend` | Task completion trend (time series) | `dashboard:view:all` or `dashboard:view:own` |

---

## Activity Log

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/activity/entity/:type/:id` | Get activity for entity (TASK, PROJECT, COMMENT) | `tasks:read` / `projects:read:all` |
| GET | `/activity/user/:userId` | Get user's activity history | `members:read` |
| GET | `/activity/me` | Get current user's activity | Authenticated |

---

## Interactive API Docs

Swagger UI available at: **http://localhost:5000/api/docs**

---

## Validation Rules

### Auth
- **Register**: email (valid format, unique), password (min 8, 1 uppercase, 1 number), name (2–100 chars)
- **Login**: email (valid format), password (required)
- **Switch Tenant**: tenantId (required, must be a workspace the caller belongs to)
- **Change Password**: currentPassword (required), newPassword (min 8, 1 uppercase, 1 number)
- **Forgot Password**: email (valid format, required)
- **Reset Password**: token (required), password (min 8, 1 uppercase, 1 number)
- **Delete Account**: password (required, confirms identity)

### Tenants
- **Create**: name (2–100 chars, required) — auto-generates slug
- **Update**: name (2–100 chars, optional)
- **Invite**: email (valid format, required), role (enum, default MEMBER)
- **Update Member Role**: role (enum, required)
- **Create Share**: resourceType (`PROJECT` | `TASK`), resourceId (required), targetType (`USER` | `EMAIL`), target (userId or email), access (`VIEW` | `EDIT` | `MANAGE`)

### Projects
- **Create**: name (2–200 chars, required), description (max 2000), startDate, endDate (must be after startDate)
- **Update**: any of name, description, status, startDate, endDate

### Tasks
- **Create**: title (2–200 chars, required), description (max 5000), priority (enum), dueDate (future), assigneeId (valid tenant member)
- **Status transitions**: `TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE` (forward only, skips allowed)

### Subtasks
- **Create**: title (1–200 chars, required)

### Labels
- **Create**: name (1–50 chars, required, unique per project), color (hex, default `#3B82F6`)

### Comments
- **Create**: content (1–2000 chars, required)

---

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Authorization Error

```json
{
  "error": "Insufficient permissions",
  "reason": "no-role-permission"
}
```

`reason` is one of: `unauthenticated`, `no-role-permission`, `resource-share` (share not sufficient).

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |
