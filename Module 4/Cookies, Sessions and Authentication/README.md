# LU48 — Session Authentication

Session-based authentication system built with Express and Prisma, using signed HTTP cookies for opaque session transport and server-side session management.

---

## Features & Security Contract

1. **Opaque Claim Ticket**:
   - Cookie name: `sid`.
   - The cookie value contains only a cryptographically unpredictable session ID (`crypto.randomUUID()`).
   - No emails, passwords, hashes, or sensitive user fields ever touch browser storage.
2. **Centralized Cookie Flags**:
   - `httpOnly: true`: Prevents client-side scripts from accessing the cookie via `document.cookie` (XSS mitigation).
   - `sameSite: 'lax'`: Mitigates cross-site request forgery (CSRF) while permitting normal top-level navigations.
   - `secure`: Governed by `COOKIE_SECURE` (`false` for local HTTP testing, `true` in production over HTTPS).
   - `signed: true`: Tamper-evident signature using `COOKIE_SECRET`.
   - `path: '/'`: Cookie scope matching set and clear operations.
   - `maxAge`: Synchronized with server session TTL (`SESSION_TTL_MS`).
3. **Server-Side Session Store**:
   - Maps `sessionId` -> `{ userId, expiresAt }`.
   - Lazy eviction of expired sessions during reads.
   - *Architectural Note*: The provided in-memory `Map` store is suitable for single-process local development and learning. Production multi-process environments require a distributed expiring store (such as Redis) with atomic TTL.
4. **Generic Authentication Failures**:
   - Missing cookies, invalid signatures, expired sessions, wrong passwords, and unknown emails all return identical `401 AUTH_REQUIRED` error responses to prevent user enumeration.

---

## Setup & Run

```bash
# 1. Configure environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Setup database and seed demo user
npm run setup

# 4. Start the server
npm run dev
```

Default demo account: `sam@example.com` / `SessionDemo!48`.

---

## API Endpoints

### 1. Login (`POST /auth/login`)
- **Body**:
  ```json
  {
    "email": "sam@example.com",
    "password": "SessionDemo!48"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "data": {
      "id": 1,
      "name": "Sam",
      "email": "sam@example.com",
      "createdAt": "..."
    }
  }
  ```
- **Header**: `Set-Cookie: sid=s%3A...; Path=/; HttpOnly; SameSite=Lax`

### 2. Protected Identity (`GET /auth/me`)
- **Header**: Requires signed `sid` cookie.
- **Response** (`200 OK`):
  ```json
  {
    "data": {
      "id": 1,
      "name": "Sam",
      "email": "sam@example.com",
      "createdAt": "..."
    }
  }
  ```
- Returns `401 Unauthorized` if cookie is missing, tampered, expired, or session was destroyed.

### 3. Logout (`POST /auth/logout`)
- **Header**: Requires signed `sid` cookie.
- **Response** (`204 No Content`):
  - Revokes session from server store.
  - Clears `sid` cookie with matching scope and signing flags.
  - Idempotent: repeated requests safely return `204`.

---

## Verification with cURL

```bash
# 1. Login and save cookie jar
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sam@example.com","password":"SessionDemo!48"}' \
  -c cookies.txt

# 2. Access protected route with cookie
curl -i http://localhost:3000/auth/me -b cookies.txt

# 3. Logout
curl -i -X POST http://localhost:3000/auth/logout -b cookies.txt -c cookies.txt

# 4. Verify old cookie is revoked (returns 401)
curl -i http://localhost:3000/auth/me -b cookies.txt
```
