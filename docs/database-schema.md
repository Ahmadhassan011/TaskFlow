# Database Schema

**Database**: PostgreSQL 16
**ORM**: Prisma 5

---

## Enums

### Role
Tenant-level role assigned to a user via `TenantMembership`.

| Value | Description |
|-------|-------------|
| `OWNER` | Full control — can delete the workspace, manage billing, all permissions |
| `ADMIN` | Can manage members, roles, and all resources |
| `MANAGER` | Can manage projects, tasks, and labels |
| `MEMBER` | Default role — can work on assigned tasks, comment, view |
| `GUEST` | Read-only access to specific shared resources |

### ProjectStatus

`ACTIVE` | `COMPLETED` | `ON_HOLD`

### TaskStatus

`TODO` → `IN_PROGRESS` → `IN_REVIEW` → `DONE` (forward only, skips allowed)

### Priority

`LOW` | `MEDIUM` | `HIGH` | `URGENT`

### MembershipStatus

`ACTIVE` | `INVITED`

### ShareTarget

`USER` | `EMAIL`

### ShareAccess

`VIEW` | `EDIT` | `MANAGE`

### AuditDecision

`ALLOW` | `DENY`

---

## Tables

### User

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| name | VARCHAR(100) | NOT NULL |
| password | VARCHAR(255) | NOT NULL (bcrypt hash) |
| role | ENUM | NOT NULL, default MEMBER, indexed |
| isActive | BOOLEAN | NOT NULL, default true |
| isVerified | BOOLEAN | NOT NULL, default false |
| avatar | VARCHAR(255) | NULLABLE |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### Tenant

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR | NOT NULL |
| slug | VARCHAR | UNIQUE, NOT NULL |
| ownerId | UUID | FK → User.id, indexed |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### TenantMembership

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| role | ENUM | NOT NULL, default MEMBER |
| status | ENUM | NOT NULL, default ACTIVE |
| invitedById | UUID | FK → User.id, NULLABLE |
| joinedAt | TIMESTAMP | default NOW() |
| userId | UUID | FK → User.id, ON DELETE CASCADE |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |

**Unique constraint**: (userId, tenantId)

### Invitation

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| email | VARCHAR | NOT NULL, indexed |
| role | ENUM | NOT NULL, default MEMBER |
| token | VARCHAR | UNIQUE, NOT NULL |
| expiresAt | TIMESTAMP | NOT NULL |
| acceptedAt | TIMESTAMP | NULLABLE |
| invitedById | UUID | FK → User.id, ON DELETE CASCADE |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW() |

### ResourceShare

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| resourceType | VARCHAR | NOT NULL (PROJECT \| TASK) |
| resourceId | UUID | NOT NULL |
| targetType | ENUM | NOT NULL, default USER |
| userId | UUID | FK → User.id, NULLABLE, indexed |
| email | VARCHAR | NULLABLE |
| access | ENUM | NOT NULL, default VIEW |
| createdById | UUID | FK → User.id, ON DELETE CASCADE |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE |
| createdAt | TIMESTAMP | default NOW() |

**Composite index**: (tenantId, resourceType, resourceId)

### AuditLog

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| actorId | UUID | FK → User.id, indexed |
| actorRole | ENUM | NOT NULL |
| action | VARCHAR | NOT NULL |
| resourceType | VARCHAR | NULLABLE |
| resourceId | VARCHAR | NULLABLE |
| decision | ENUM | NOT NULL |
| reason | VARCHAR | NULLABLE |
| ipAddress | VARCHAR | NULLABLE |
| createdAt | TIMESTAMP | default NOW(), indexed |

### Project

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| slug | VARCHAR(200) | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| status | ENUM | NOT NULL, default ACTIVE, indexed |
| startDate | DATETIME | NOT NULL |
| endDate | DATETIME | NULLABLE |
| ownerId | UUID | FK → User.id, indexed |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### ProjectMember

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| role | VARCHAR | NOT NULL, default "member" |
| joinedAt | TIMESTAMP | default NOW() |
| userId | UUID | FK → User.id, ON DELETE CASCADE |
| projectId | UUID | FK → Project.id, ON DELETE CASCADE, indexed |

**Unique constraint**: (userId, projectId)

### Task

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| title | VARCHAR(200) | NOT NULL |
| description | TEXT | NULLABLE |
| status | ENUM | NOT NULL, default TODO, indexed |
| priority | ENUM | NOT NULL, default MEDIUM |
| dueDate | DATETIME | NULLABLE, indexed |
| projectId | UUID | FK → Project.id, ON DELETE CASCADE, indexed |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| assigneeId | UUID | FK → User.id, ON DELETE SET NULL, NULLABLE, indexed |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### Subtask

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| title | VARCHAR(200) | NOT NULL |
| isCompleted | BOOLEAN | NOT NULL, default false |
| taskId | UUID | FK → Task.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### Comment

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| content | TEXT | NOT NULL |
| taskId | UUID | FK → Task.id, ON DELETE CASCADE, indexed |
| authorId | UUID | FK → User.id, ON DELETE CASCADE |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

### Label

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | VARCHAR(50) | NOT NULL |
| color | VARCHAR(7) | NOT NULL, default "#3B82F6" |
| projectId | UUID | FK → Project.id, ON DELETE CASCADE, indexed |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW() |
| updatedAt | TIMESTAMP | auto-updated |

**Unique constraint**: (name, projectId)

### TaskLabel (Join Table)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| taskId | UUID | FK → Task.id, ON DELETE CASCADE |
| labelId | UUID | FK → Label.id, ON DELETE CASCADE |

**Unique constraint**: (taskId, labelId)

### RefreshToken

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| token | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| expiresAt | TIMESTAMP | NOT NULL |
| createdAt | TIMESTAMP | default NOW() |
| userId | UUID | FK → User.id, ON DELETE CASCADE, indexed |

### PasswordResetToken

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| token | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| expiresAt | TIMESTAMP | NOT NULL |
| used | BOOLEAN | NOT NULL, default false |
| createdAt | TIMESTAMP | default NOW() |
| userId | UUID | FK → User.id, ON DELETE CASCADE, indexed |

### EmailVerificationToken

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| token | VARCHAR(255) | UNIQUE, NOT NULL, indexed |
| expiresAt | TIMESTAMP | NOT NULL |
| createdAt | TIMESTAMP | default NOW() |
| userId | UUID | FK → User.id, ON DELETE CASCADE, indexed |

### ActivityLog

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| action | VARCHAR | NOT NULL |
| entityType | VARCHAR | NOT NULL |
| entityId | VARCHAR | NOT NULL |
| changes | JSONB | NULLABLE |
| ipAddress | VARCHAR | NULLABLE |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| userId | UUID | FK → User.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW(), indexed |

**Composite indexes**: (entityType, entityId), (userId), (tenantId), (createdAt)

### Notification

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | VARCHAR | NOT NULL (ASSIGNED, COMMENTED, DUE_SOON, STATUS_CHANGED) |
| message | VARCHAR | NOT NULL |
| read | BOOLEAN | NOT NULL, default false |
| link | VARCHAR | NULLABLE |
| tenantId | UUID | FK → Tenant.id, ON DELETE CASCADE, indexed |
| userId | UUID | FK → User.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW(), indexed |

**Composite index**: (userId, read)

### Attachment

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| filename | VARCHAR | NOT NULL |
| originalName | VARCHAR | NOT NULL |
| mimeType | VARCHAR | NOT NULL |
| size | INT | NOT NULL |
| taskId | UUID | FK → Task.id, ON DELETE CASCADE, indexed |
| uploadedById | UUID | FK → User.id, ON DELETE CASCADE, indexed |
| createdAt | TIMESTAMP | default NOW() |

---

## Relationships

```
User ──< Tenant (owner)
User ──< TenantMembership ──> Tenant
User ──< Invitation (invitedBy)
User ──< ResourceShare (createdBy)
User ──< AuditLog (actor)
Tenant ──< TenantMembership
Tenant ──< Invitation
Tenant ──< ResourceShare
Tenant ──< AuditLog
Tenant ──< Project
Tenant ──< Task
Tenant ──< Label
Tenant ──< ActivityLog
Tenant ──< Notification
Project ──< ProjectMember ──> User
Project ──< Task
Project ──< Label
Task ──< Subtask
Task ──< Comment
Task ──< TaskLabel ──> Label
Task ──< Attachment
User ──< RefreshToken
User ──< PasswordResetToken
User ──< EmailVerificationToken
User ──< ActivityLog
User ──< Notification
User ──< Attachment (uploadedBy)
```

---

## Indexes

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| User | email | Fast login lookup |
| User | role | Role-based queries |
| Tenant | ownerId | Owner's workspaces |
| TenantMembership | tenantId | Members of a workspace |
| Invitation | tenantId, email | Pending invites lookup |
| ResourceShare | tenantId, resourceType, resourceId | Shares on a resource |
| ResourceShare | userId | User's shares |
| AuditLog | tenantId | Workspace audit trail |
| AuditLog | actorId | Actor's actions |
| AuditLog | createdAt | Time-based audit queries |
| Project | ownerId, tenantId | Owner's projects, workspace projects |
| Project | status | Filter by status |
| ProjectMember | projectId | Members of a project |
| Task | projectId, tenantId | Tasks in a project, workspace tasks |
| Task | assigneeId | Assigned tasks |
| Task | status | Filter by status |
| Task | dueDate | Deadline queries |
| Subtask | taskId | Subtasks of a task |
| Comment | taskId | Comments on a task |
| Label | projectId, tenantId | Labels in a project, workspace labels |
| ActivityLog | entityType, entityId | Entity activity lookup |
| ActivityLog | userId, tenantId | User's / workspace activity |
| ActivityLog | createdAt | Time-based queries |
| Notification | userId, read | Unread notifications |
| Notification | tenantId, createdAt | Workspace notifications |
| RefreshToken | token, userId | Token lookup |
| PasswordResetToken | token, userId | Token lookup |
| EmailVerificationToken | token, userId | Token lookup |
| Attachment | taskId, uploadedById | File lookups |
