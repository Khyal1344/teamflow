# TeamFlow — Team Task Collaboration System

A full-stack collaborative task management system built with React, Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT + bcrypt |

---

## Project Structure

```
teamflow/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connection
│   │   ├── models/        # Mongoose schemas (User, Workspace, Task, ActivityLog)
│   │   ├── routes/        # Express route definitions
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth guard, error handler
│   │   └── utils/         # Activity logger
│   ├── server.js
│   ├── .env.example
│   └── package.json
└── frontend/              # Added Day 5
```

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- MongoDB running locally or a MongoDB Atlas URI

### Backend

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on http://localhost:5000
```

### Frontend (Day 5+)

```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/teamflow` |
| `JWT_SECRET` | Secret key for signing JWTs | — |
| `JWT_EXPIRES_IN` | JWT expiry duration | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `10` |

---

## Architecture Decisions

### Schema Design

**Workspace members as embedded array**
Members are stored as an array inside the Workspace document (`[{ user, role, joinedAt }]`) rather than a separate collection. Rationale: workspaces rarely exceed hundreds of members, reads dominate writes, and embedding avoids a join on every permission check.

**ActivityLog as a separate collection**
Logs are append-only and can grow very large. Keeping them separate prevents workspace documents from bloating and allows independent indexing strategies.

**Task fields**
Every task stores `workspace`, `createdBy`, and `assignedTo` as ObjectId refs. This supports efficient filtering without embedding user data that could go stale.

### Indexing Strategy (Req 1 — Efficient Search)

| Index | Purpose |
|---|---|
| `Task: { title: 'text', description: 'text' }` | Full-text search across tasks |
| `Task: { workspace: 1, status: 1 }` | Filter by workspace + status |
| `Task: { workspace: 1, priority: 1 }` | Filter by workspace + priority |
| `Task: { workspace: 1, assignedTo: 1 }` | Filter by assignee |
| `Task: { workspace: 1, dueDate: 1 }` | Sort/filter by due date |
| `Task: { workspace: 1, createdAt: -1 }` | Default sort (newest first) |
| `ActivityLog: { workspace: 1, createdAt: -1 }` | Activity feed |
| `Workspace: { members.user: 1 }` | All workspaces for a user |

All queries are scoped by `workspaceId` first, keeping result sets small even at 100k+ tasks.

Search results are paginated (default 20 per page). The frontend debounces the search input at 300ms.

### Race Condition Prevention (Req 2)

Task status updates use MongoDB's `findOneAndUpdate` with a conditional filter:

```js
Task.findOneAndUpdate(
  { _id: taskId, workspace: workspaceId },  // scoped filter
  { $set: { status: newStatus } },
  { new: true, runValidators: true }
)
```

This is a single atomic database operation. Two concurrent requests cannot both "read then write" — one will complete and the other will receive the updated document. No optimistic locking needed for this use case.

### Overdue Tasks (Req 4)

Overdue detection is handled on the **frontend** by comparing `task.dueDate` to `new Date()`. This avoids cron jobs, extra writes, and timezone complexity. The backend sends raw `dueDate` in ISO format; the frontend applies a CSS class when `dueDate < now && status !== 'completed'`.

### Real-Time Updates (Ambiguous Requirement)

**Decision: Polling with a focus-aware hook**
The frontend polls the task list every 30 seconds using a custom `useTaskPolling` hook. Polling pauses when the browser tab is not focused (using the Page Visibility API), reducing unnecessary requests.

**Rationale**: Polling is simpler to implement, debug, and deploy than WebSockets. For a task management tool, 30-second staleness is acceptable. Socket.io can be added later without changing the API contract.

### Activity Logging (Req 3)

A `logActivity()` utility wraps every `ActivityLog.create()` call in try/catch. Logging failures are swallowed and printed to the console — they must never fail the primary operation (e.g. creating a task should succeed even if the log write fails).

### API Rate Limiting (Req 5)

`express-rate-limit` is applied exclusively to `/api/auth/*` routes: max 10 requests per 15 minutes per IP. This prevents brute-force login attacks without affecting other endpoints.

---

## Assumptions

- Workspace membership is managed manually (no email invitation flow with email delivery — invites are accepted via API with a known user email)
- Timezones: all dates stored in UTC; the frontend formats them in the user's local timezone
- File uploads are out of scope for this version
- A user can belong to multiple workspaces with different roles in each

---

## Scalability Considerations

- All task queries are scoped by `workspaceId` — a compound index prefix ensures MongoDB never does a full collection scan
- Pagination is enforced on all list endpoints (max 50 per page)
- ActivityLogs could be archived to cold storage after 90 days in production
- For very high scale: Redis cache for workspace membership checks; read replicas for task queries

---

## Improvements with More Time

- Refresh token rotation (currently using long-lived JWTs)
- Socket.io for true real-time collaboration
- Email-based workspace invitations
- File attachments on tasks
- Unit and integration tests (Jest + Supertest)
- Docker Compose setup
- Deployment (Railway / Render)
- Redis caching for frequently-read workspace data
