# Security & Access Document

**Project Name:** Multi-Container Cloud Application (Todo Platform)  
**Document Version:** 1.0.0  
**Status:** Approved Security Specification  
**Scope:** Application Perimeter, Container Network, System Access & Resiliency  

---

## 1. Authentication & Access Strategy

### V1 Application Access Scope (Unauthenticated Public REST API)
Per the architectural requirements, the core Todo API is an **unauthenticated public microservice** designed for open task management and DevOps demonstration. Because authentication credentials are not required in V1, perimeter defenses, rate limiting, and input sanitization serve as the primary defensive layers:
- **Rate Limiting:** Nginx and Express rate-limit client IPs to prevent DoS flooding (e.g., maximum 100 requests per minute per IP).
- **CORS Policy:** Strict CORS headers restrict which frontend origins can execute cross-domain API calls.
- **Payload Size Limits:** Requests are capped at 100KB to prevent memory exhaustion and buffer overflows.

### V2 Authentication Roadmap (Future Ready)
When migrating to authenticated multi-tenancy in future iterations:
- **Method:** Stateless JSON Web Tokens (JWT) signed via HMAC-SHA256 (`HS256`) or RSA (`RS256`).
- **Header:** `Authorization: Bearer <token>`
- **Token Expiry:** 15-minute Access Token + 7-day Refresh Token stored in an `httpOnly`, `Secure`, `SameSite=Strict` cookie.

### Infrastructure & Server Authentication
- **SSH Key Pair Only:** Password authentication is explicitly disabled in `/etc/ssh/sshd_config` (`PasswordAuthentication no`).
- **Root Login Disabled:** Direct root SSH access is blocked (`PermitRootLogin no`); administrative operations require `sudo` privileges via a dedicated `deployer` user.
- **Docker Socket Isolation:** The host Docker socket (`/var/run/docker.sock`) is never mounted inside web-facing containers (preventing container-to-host privilege escalation).

---

## 2. User Roles & Permission Matrix

| Role | Environment | Permissions | Blocked Actions |
| :--- | :--- | :--- | :--- |
| **Public Guest / API Consumer** | Web / API (Port 80/443) | Can read, create, update, and delete todos; ping `/health`. | Direct database access, executing shell commands, administrative endpoints. |
| **CI/CD Automation Runner** | GitHub Actions | Can pull code, build images, push to Docker Hub, SSH into remote host via dedicated deploy key, run `docker compose pull` & `up`. | Direct root access, deleting persistent database volumes, modifying cloud firewall rules. |
| **System Administrator (DevOps)** | Remote Host (SSH:22) | Full system administration via `sudo`, Docker daemon management, viewing container logs, running backup scripts. | Storing unencrypted production credentials in public repositories. |

---

## 3. Database Security & Data Protection Rules

### Network & Port Isolation
- **No External Port Binding:** MongoDB container port `27017` is **strictly not published** to the host in production (`expose: ["27017"]` is used instead of `ports: ["27017:27017"]`). Only containers on `todo_network` can communicate with MongoDB.
- **NoSQL Injection Defense:** Express middlewares sanitize request parameters to strip MongoDB query operators (e.g., `$gt`, `$ne`, `$where`), preventing query injection attacks.
- **Schema Validation & Type Casting:** Mongoose enforces strict schema casting. Any unexpected fields submitted in JSON payloads are automatically stripped.

### Data Volume Security & Persistence
- **Host Isolation:** Data resides in an isolated Docker named volume (`mongodb_data`).
- **Permissions:** The volume directory `/data/db` inside the container is owned by the container's internal `mongodb` service account (`uid: 999`), preventing unauthorized file modification.

---

## 4. Comprehensive Error Handling Guide

All API responses follow a uniform JSON structure. In production (`NODE_ENV=production`), stack traces and internal system details are never leaked to the client.

### Standard Response Schemas

#### Standard Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Standard Error Response:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested todo item with ID 654321abcdef1234567890ab was not found.",
    "details": [],
    "timestamp": "2026-11-13T00:15:00.000Z"
  }
}
```

---

### Major Failure Points & Defined System Responses

| Scenario | HTTP Status | Error Code | Client Response Message | System Action / Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **Missing required `title`** | `400 Bad Request` | `VALIDATION_ERROR` | `"Field 'title' is required and must not be empty."` | Validation middleware rejects request before touching database. |
| **Malformed MongoDB `id`** | `400 Bad Request` | `INVALID_ID_FORMAT` | `"The provided ID is not a valid 24-character hexadecimal identifier."` | Regex/Mongoose ObjectId validator catches input. |
| **Todo ID does not exist** | `404 Not Found` | `TODO_NOT_FOUND` | `"No todo item found matching the provided ID."` | Controller returns early with 404. |
| **Payload exceeds size limit** | `413 Payload Too Large` | `PAYLOAD_TOO_LARGE` | `"Request payload exceeds the maximum permitted limit of 100KB."` | Express `body-parser` terminates request immediately. |
| **Rate limit exceeded** | `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | `"Too many requests. Please retry in 60 seconds."` | Nginx / Express rate limiter blocks client IP for 60s. |
| **MongoDB connection lost** | `503 Service Unavailable` | `DATABASE_UNAVAILABLE` | `"Service temporarily unavailable. Our database is reconnecting."` | API triggers automatic reconnection loop; returns 503 instead of hanging. |
| **API container restarting** | `502 Bad Gateway` | `UPSTREAM_UNAVAILABLE` | (Nginx custom HTML/JSON 502 fallback page) | Nginx returns friendly JSON response while Docker restarts API container. |
| **Unexpected runtime bug** | `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | `"An unexpected error occurred. Please try again later."` | Global error middleware logs full error to container stdout; returns sanitized response. |

---

## 5. Edge Cases & System Resiliency Matrix

| Category | Edge Case Scenario | Expected Behavior & Architectural Defense |
| :--- | :--- | :--- |
| **Input** | User submits title with only spaces (`"   "`) | `title.trim()` is applied. If length is 0, validation triggers `400 Bad Request`. |
| **Input** | User attempts XSS injection in title (`<script>alert(1)</script>`) | Input is escaped and stored as plaintext string; frontend renders via `textContent` (never `innerHTML`). |
| **Input** | Extremely long title (> 500 characters) | Validation schema rejects titles over 200 characters with `400 Bad Request`. |
| **Concurrency** | Rapid double-click on "Create Todo" button | Client disables button during flight; database creates separate records or applies idempotency key. |
| **Network** | Client on high latency connection (mobile 3G) | Nginx keeps connection alive with generous timeouts (`keepalive_timeout 65s`); client displays visual loading skeleton. |
| **Lifecycle** | Host server restarts unexpectedly | Docker daemon starts on boot; containers with `restart: unless-stopped` start automatically and reconnect. |
| **Lifecycle** | MongoDB container takes 10s to boot while API boots in 2s | Express API implements exponential backoff retry loop (`connectWithRetry`) until MongoDB is ready; requests during boot return 503. |
| **Storage** | Database disk volume becomes 95% full | MongoDB logs warning; volume monitoring alert fires; persistent volume retains historical data without corruption. |
| **Process** | Node.js experiences an unhandled rejection | Global process listeners (`process.on('unhandledRejection')`) log error and initiate graceful shutdown (`SIGTERM`) allowing active requests to finish. |
