# Demo Apps Design — ELK Centralized Logging

**Goal:** Three real microservices (Node.js, Spring Boot, Laravel) that communicate in a chain, generate structured JSON logs, and ship them through the existing ELK pipeline so logs are visible in Kibana with cross-service correlation.

**Article angle:** One `correlationId` — one Kibana query — full request trace across three languages.

---

## Architecture

```
[HTTP Client]
    │
    ▼
notification-api  (Node.js/Express  :3000)   → /var/log/apps/notification-api/app-*.log
    │  calls GET /validate?userId=
    ▼
auth-service      (Spring Boot      :8080)   → /var/log/apps/auth-service/application.log
    │  calls GET /subscription?userId=
    ▼
billing-api       (Laravel          :8000)   → /var/log/apps/billing-api/elk.log
```

Each service propagates `X-Correlation-ID` on every outbound call. Filebeat already watches the three log paths. Logstash routes by service tag to separate Elasticsearch indices.

---

## Services

### notification-api (Node.js / Express)

Reuses existing `nodejs/logger.js` and `nodejs/middleware/requestLogger.js`.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/notify` | Triggers the full chain. Accepts `{ userId }` in body. |
| `GET`  | `/health` | Always 200. Logs INFO. |

**Scenario triggers (query params on `/notify`):**

| Param | Behavior | Log produced |
|-------|----------|-------------|
| `?slow=true` | Adds 2 000 ms delay before calling auth-service | WARN: "Slow request detected" from requestLogger |
| `?fail=true` | Returns 500 without calling downstream | ERROR: "Forced failure" |
| `userId=banned` | Passes through; auth-service returns 403 | ERROR: "Auth rejected: user banned" |
| `userId=unknown` | Passes through; auth-service returns 401 | ERROR: "Auth failed: unknown user" |
| `userId=suspended` | Auth succeeds; billing returns suspended | WARN: "Billing suspended for user" |
| _(none / normal)_ | Full happy-path chain | INFO at each hop |

**Log fields emitted:** `correlationId`, `userId`, `method`, `url`, `statusCode`, `duration_ms`, `clientIp`, `application=notification-api`, `environment`, `service=nodejs`.

**Files:**
```
apps/notification-api/
├── package.json
├── Dockerfile
├── src/
│   ├── index.js          # Express app + /notify + /health
│   └── authClient.js     # HTTP client to auth-service (propagates X-Correlation-ID)
```

Logger and middleware are copied from `nodejs/` at build time (Docker COPY).

---

### auth-service (Spring Boot)

Reuses existing `spring-boot/logback-spring.xml` and `spring-boot/MdcLoggingFilter.java`.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/validate?userId=` | Validates user. Calls billing-api internally. |
| `GET`  | `/health` | Always 200. |

**userId routing:**

| userId value | HTTP response | Log level | Message |
|---|---|---|---|
| `banned` | 403 | WARN | "User is banned" |
| `unknown` | 401 | ERROR | "Unknown user" |
| _(any other)_ | 200 | INFO | "User validated" |

**Log fields emitted (in JSON body):** `correlationId`, `requestUri`, `httpMethod`, `clientIp`, `userId`, `application=auth-service`, `environment`. Note: `service=springboot` is NOT in the log JSON — it is tagged by Filebeat via `fields.service` and used by Logstash for index routing.

**Files:**
```
apps/auth-service/
├── pom.xml
├── Dockerfile
└── src/main/
    ├── resources/
    │   ├── logback-spring.xml        # copied from spring-boot/
    │   └── application.properties
    └── java/com/example/authservice/
        ├── AuthServiceApplication.java
        ├── filter/MdcLoggingFilter.java   # copied from spring-boot/
        ├── controller/AuthController.java
        └── client/BillingClient.java      # RestTemplate to billing-api
```

---

### billing-api (Laravel)

New service. Produces JSON logs in same format as other services.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/subscription?userId=` | Returns subscription status. |
| `GET`  | `/health` | Always 200. |

**userId routing:**

| userId value | HTTP response | Log level | Message |
|---|---|---|---|
| `suspended` | 200 `{status: suspended}` | WARN | "Subscription suspended" |
| `unknown` | 404 | ERROR | "User not found in billing" |
| _(any other)_ | 200 `{status: active}` | INFO | "Subscription active" |

**Log format** (written to `storage/logs/elk.log` inside the container, which is bind-mounted to `/var/log/apps/billing-api/` on the host so Filebeat can read it):
```json
{"datetime":"2026-05-21T14:00:00.000Z","level_name":"INFO","message":"...","application":"billing-api","environment":"production","correlationId":"abc12345","service":"laravel"}
```

Laravel's Monolog is configured with a custom JSON formatter and a `StreamHandler` writing to `storage/logs/elk.log`.

**Files:**
```
apps/billing-api/
├── composer.json
├── Dockerfile
├── public/index.php
├── routes/api.php
├── app/Http/
│   ├── Controllers/SubscriptionController.php
│   └── Middleware/CorrelationIdMiddleware.php
└── config/logging.php   # custom elk channel (JSON StreamHandler)
```

---

## Infrastructure

### docker-compose.apps.yml

Separate from `docker-compose.elk.yml`. Shares `logging-network` (external).

```yaml
services:
  notification-api:   # port 3000, mounts /var/log/apps/notification-api
  auth-service:       # port 8080, mounts /var/log/apps/auth-service
  billing-api:        # port 8000, mounts /var/log/apps/billing-api
```

Each service:
- Mounts its log directory to the host path Filebeat watches (bind mount, not volume)
- Connects to `logging-network`
- Has `restart: unless-stopped`
- Has a `/health` healthcheck

### Environment variables (added to .env.example)

```
NODE_ENV=production
APP_ENV=production
AUTH_SERVICE_URL=http://auth-service:8080
BILLING_SERVICE_URL=http://billing-api:8000
```

---

## Data Flow

```
POST /notify?userId=alice
  │
  ├─ notification-api logs: INFO "Notification requested" {correlationId, userId}
  │
  ├─→ GET auth-service/validate?userId=alice  (header: X-Correlation-ID)
  │     ├─ auth-service logs: INFO "User validated" {correlationId, userId}
  │     └─→ GET billing-api/subscription?userId=alice  (header: X-Correlation-ID)
  │           └─ billing-api logs: INFO "Subscription active" {correlationId, userId}
  │
  └─ notification-api logs: INFO "Notification sent" {correlationId, duration_ms}
```

**Kibana query to trace:** `correlationId: "<id>"` — shows all 4 log lines across 3 services.

---

## Error Handling

- If auth-service returns non-200, notification-api logs ERROR and returns 502 to caller.
- If billing-api returns non-200, auth-service logs WARN/ERROR and returns appropriate status upstream.
- Network failures between services are caught and logged as ERROR with the downstream service name.
- All services return JSON error bodies: `{ "error": "message", "correlationId": "..." }`.

---

## Out of Scope

- Authentication/JWT between services (not relevant to logging demo)
- Databases or persistent state (in-memory routing only)
- Frontend UI
- Load generation / stress testing
