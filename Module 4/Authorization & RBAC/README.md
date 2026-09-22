# LU53 — Authorization & RBAC

This project implements Role-Based Access Control (RBAC) and object-level ownership checks for an Express API, closing Broken Object Level Authorization (IDOR) vulnerabilities.

---

## Architecture & Concepts

1. **Authentication vs. Authorization**:
   - `requireAuth` verifies the JWT Bearer token and establishes identity: `req.user = { id, role }`. Missing or invalid tokens result in `401 UNAUTHENTICATED`.
   - `requireRole(...allowedRoles)` acts as a middleware gate: verifies whether `req.user.role` is included in the permitted list. Role mismatches result in `403 FORBIDDEN`.
2. **Ownership Checks & IDOR Closure**:
   - Generic roles answer "can this user edit posts?" but cannot answer "can this user edit *this specific post*?".
   - In `PATCH /posts/:id` and `DELETE /posts/:id`, the resource is retrieved from storage first (returning `404 NOT_FOUND` if absent).
   - The ownership condition `post.authorId === req.user.id` or elevated role `['moderator', 'admin'].includes(req.user.role)` must evaluate to true.
   - If a normal member attempts to modify another user's post, the server rejects the request with `403 FORBIDDEN`.
3. **Admin & Moderation Gates**:
   - `DELETE /users/:id` is gated with `requireRole('admin')`.
   - `POST /posts/:id/hide` is gated with `requireRole('moderator', 'admin')`.

---

## Project Structure

```
.
├── src/
│   ├── app.js                 # Express application with routes and admin delete
│   ├── data.js                # In-memory store (member, moderator, admin users & posts)
│   ├── middleware/
│   │   ├── requireAuth.js     # Verifies JWT and attaches req.user
│   │   └── requireRole.js     # Factory returning role-checking middleware
│   └── routes/
│       └── posts.js           # Posts router with ownership checks and /hide route
├── tests/
│   └── run.js                 # Test suite verifying all 9 scenarios
├── package.json
└── README.md
```

---

## Setup & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test
```

Expected output:
```
Results: 12 passed, 0 failed
```
