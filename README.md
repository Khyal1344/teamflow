# TeamFlow — Team Task Collaboration System

A full-stack collaborative task management system built with React, Node.js, Express, and MongoDB.

## Live Demo
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router v6, Axios, React Hot Toast |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT + bcrypt |
| Styling | Custom CSS |

---

## Project Structure

```
teamflow/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── auth.controller.js       # Register, Login, GetMe
│   │   │   ├── workspace.controller.js  # Workspace CRUD + members
│   │   │   ├── task.controller.js       # Task CRUD + search + filters
│   │   │   └── activity.controller.js   # Activity log fetching
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js       # JWT protect, role checks
│   │   │   └── error.middleware.js      # Global error handler
│   │   ├── models/
│   │   │   ├── User.js                  # User schema + bcrypt hooks
│   │   │   ├── Workspace.js             # Workspace + embedded members
│   │   │   ├── Task.js                  # Task schema + 6 indexes
│   │   │   └── ActivityLog.js           # Activity log schema
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── workspace.routes.js
│   │   │   ├── task.routes.js
│   │   │   └── activity.routes.js
│   │   └── utils/
│   │       ├── activityLogger.js        # Fire-and-forget log writer
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                         # Axios API layer
│   │   ├── components/
│   │   │   ├── common/                  # ProtectedRoute
│   │   │   ├── layout/                  # Sidebar Layout
│   │   │   └── workspace/               # ActivityLog component
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Global auth state
│   │   ├── hooks/
│   │   │   └── useTaskPolling.js        # 30s focus-aware polling
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Workspaces.jsx
│   │       ├── WorkspaceDetail.jsx
│   │       ├── Tasks.jsx
│   │       └── NotFound.jsx
│   └── package.json
├── BUG_REPORT.md
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account (free) or local MongoDB

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET in .env
npm install
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | JWT signing secret | — |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `10` |

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Workspaces
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/workspaces` | Get my workspaces | Member |
| POST | `/api/workspaces` | Create workspace | Member |
| GET | `/api/workspaces/:id` | Get workspace | Member |
| PUT | `/api/workspaces/:id` | Update workspace | Admin |
| DELETE | `/api/workspaces/:id` | Delete workspace | Admin |
| GET | `/api/workspaces/:id/members` | Get members | Member |
| POST | `/api/workspaces/:id/members` | Invite member | Admin |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member | Admin |
| GET | `/api/workspaces/:id/activity` | Get activity logs | Member |

### Tasks
| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/workspaces/:id/tasks` | List + search + filter | Member |
| POST | `/api/workspaces/:id/tasks` | Create task | Admin |
| GET | `/api/workspaces/:id/tasks/:taskId` | Get task | Member |
| PUT | `/api/workspaces/:id/tasks/:taskId` | Update task | Member |
| DELETE | `/api/workspaces/:id/tasks/:taskId` | Delete task | Admin |
| PATCH | `/api/workspaces/:id/tasks/:taskId/status` | Update status | Member |
| PATCH | `/api/workspaces/:id/tasks/:taskId/assign` | Assign task | Admin |

### Query Parameters for GET /tasks
| Param | Description | Example |
|---|---|---|
| `search` | Full-text search | `?search=homepage` |
| `status` | Filter by status | `?status=todo` |
| `priority` | Filter by priority | `?priority=high` |
| `page` | Page number | `?page=2` |
| `limit` | Results per page (max 50) | `?limit=20` |
| `sortBy` | Sort field | `?sortBy=dueDate` |
| `sortOrder` | `asc` or `desc` | `?sortOrder=asc` |

---

## Architecture Decisions

### 1. Efficient Search (Req 1)
- MongoDB **text index** on `title` + `description` with weights (title=3, description=1)
- **6 compound indexes** on Task model scoped by `workspaceId` first
- All queries paginated (default 20, max 50 per page)
- Frontend **debounces** search input at 300ms to reduce API calls
- `Promise.all` runs count and find queries in parallel

### 2. Race Condition Prevention (Req 2)
- Status updates use `findOneAndUpdate` — a single atomic MongoDB operation
- No read-then-write pattern — eliminates race conditions at the DB level
- Scoped filter `{ _id, workspace }` prevents cross-workspace updates

### 3. Activity Logs (Req 3)
- Separate `ActivityLog` collection — append-only, never updated
- `logActivity()` is fire-and-forget — logging failures never break main operations
- Indexed by `{ workspace, createdAt: -1 }` for fast feed queries
- Tracks: task created/updated/deleted/status changed, member invited/removed

### 4. Overdue Tasks (Req 4)
- Handled on the **frontend** — compare `task.dueDate` to `new Date()`
- Red left border + overdue banner for visual highlighting
- No cron job needed — avoids timezone complexity and extra DB writes
- Backend sends raw ISO dates; frontend formats in user's local timezone

### 5. API Rate Limiting (Req 5)
- `express-rate-limit` on `/api/auth/*` only
- Max 10 requests per 15 minutes per IP
- Returns `429 Too Many Requests` with clear message

### 6. Real-Time Updates (Ambiguous Req)
- **Decision: Focus-aware polling** every 30 seconds
- Custom `useTaskPolling` hook using Page Visibility API
- Polling pauses when tab is hidden — saves resources
- Fires immediately when tab becomes active again
- Chosen over WebSockets for simplicity — Socket.io can be added later

---

## Debugging Requirement

See `BUG_REPORT.md` for full details.

**Bug**: Missing `await` in `activityLogger.js` caused silent log failures.

```js
// ❌ BUGGY
const log = ActivityLog.create({...}); // returns Promise, not document

// ✅ FIXED
await ActivityLog.create({...}); // waits for DB write to complete
```

---

## Assumptions

- Workspace invitations work by email — the user must already be registered
- All dates stored in UTC; frontend displays in user's local timezone
- File uploads are out of scope
- A user can belong to multiple workspaces with different roles in each

---

## Scalability Considerations

- All task queries scoped by `workspaceId` — compound index prefix ensures no full collection scan even at 100k+ tasks
- Pagination enforced on all list endpoints
- ActivityLogs could be archived after 90 days in production
- Redis caching for workspace membership checks at scale
- Read replicas for heavy task query workloads
- Socket.io for true real-time at scale

---

## Improvements with More Time

- ✅ Refresh token rotation (currently long-lived JWTs)
- ✅ Socket.io real-time updates
- ✅ Email-based workspace invitations with confirmation
- ✅ File attachments on tasks
- ✅ Unit and integration tests (Jest + Supertest)
- ✅ Docker Compose setup
- ✅ Deployment (Railway / Render)
- ✅ Redis caching
- ✅ Dark mode
- ✅ Mobile responsive improvements
