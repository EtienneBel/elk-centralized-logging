# ELK Stack: Multi-Application Centralized Logging

![ELK Stack](https://img.shields.io/badge/ELK-8.11.1-blue)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.x-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Production-ready centralized logging with **Elasticsearch, Logstash, Kibana, and Filebeat** across heterogeneous application environments (Spring Boot, Laravel, Node.js).

> Companion repository for the article: [ELK Stack: Centralized Logging Across Multiple Production Applications](https://medium.com/@belemgnegreetienne)

---

## Architecture

```
[Spring Boot] → /var/log/apps/auth-service/application.log  ↘
[Laravel    ] → /var/log/apps/billing-api/elk.log            → [Filebeat] → [Logstash] → [Elasticsearch] → [Kibana]
[Node.js    ] → /var/log/apps/notification-api/app.log      ↗
```

File-based logging (apps write to disk, Filebeat ships) over direct TCP shipping for resilience: if Logstash goes down, apps keep running and Filebeat buffers until it recovers.

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- 4GB RAM minimum for ELK stack
- Ports 9200, 5601, 5044 available

### 1. Clone and configure

```bash
git clone https://github.com/EtienneBel/elk-centralized-logging.git
cd elk-centralized-logging
cp .env.example .env
# Edit .env and set a strong ELASTIC_PASSWORD
```

### 2. Set kernel parameter (required for Elasticsearch)

```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### 3. Create the shared Docker network

```bash
docker network create logging-network
```

### 4. Start the stack

```bash
docker compose -f docker-compose.elk.yml up -d
```

### 5. Verify

```bash
# Check all containers are running
docker ps

# Verify Elasticsearch health (status should be "green" or "yellow")
curl -u elastic:your_password 'http://localhost:9200/_cluster/health?pretty'

# Access Kibana
open http://localhost:5601
```

---

## Stack Components

| Component | Version | Port | Role |
|---|---|---|---|
| Elasticsearch | 8.11.1 | 9200 | Storage + search |
| Logstash | 8.11.1 | 5044 | Parse + route |
| Kibana | 8.11.1 | 5601 | Visualize |
| Filebeat | 8.11.1 | — | Ship log files |

---

## Application Integration

### Spring Boot

Add to `pom.xml`:

```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.4</version>
</dependency>
```

Copy `spring-boot/logback-spring.xml` to `src/main/resources/`.
Copy `spring-boot/MdcLoggingFilter.java` to your filter package.

Logs will be written to `/app/logs/application.log` in JSON format, picked up by Filebeat.

### Node.js

```bash
npm install winston winston-daily-rotate-file uuid
```

Copy `nodejs/logger.js` and `nodejs/middleware/requestLogger.js` to your project.
Set environment variables:

```bash
APP_NAME=your-service-name
NODE_ENV=production
LOG_DIR=/app/logs
```

---

## Index Lifecycle Management (ILM)

Set up automatic index retention before your disk fills up:

```bash
curl -u elastic:your_password -X PUT \
  'http://localhost:9200/_ilm/policy/logs-policy' \
  -H 'Content-Type: application/json' -d '{
  "policy": {
    "phases": {
      "hot":    { "min_age": "0ms",  "actions": { "rollover": { "max_size": "50gb", "max_age": "1d" } } },
      "warm":   { "min_age": "3d",   "actions": { "shrink": { "number_of_shards": 1 } } },
      "delete": { "min_age": "30d",  "actions": { "delete": {} } }
    }
  }
}'
```

---

## Kibana: Useful KQL Queries

```
# All errors in the last hour
level_name: "ERROR" and @timestamp > now-1h

# Trace a request across ALL services
correlationId: "a3f8c21b"

# Slow requests above 2 seconds
duration_ms > 2000 and level_name: "WARN"

# Specific service errors only
application: "billing-api" and level_name: "ERROR"

# Exclude framework noise
level_name: "ERROR" and not logger: "org.springframework*"
```

---

## Key Production Lessons

1. **Set `vm.max_map_count=262144`** before starting — Elasticsearch won't start without it
2. **Never store credentials in ConfigMap** — use K8s Secrets or GCP Secret Manager
3. **`MDC.clear()` in `finally` is mandatory** — thread pool reuse bleeds MDC context across requests
4. **Check `unknown-logs-*` weekly** — logs appearing there mean a service is misconfigured
5. **Set ILM policy on day one** — not after your disk is full

---

## Project Structure

```
elk-centralized-logging/
├── docker-compose.elk.yml         # Full ELK stack
├── .env.example                   # Environment variables template
├── logstash/
│   ├── config/logstash.yml
│   └── pipeline/beats-input.conf  # Multi-app routing logic
├── filebeat/
│   └── config/filebeat.yml        # Multi-app input config
├── spring-boot/
│   ├── logback-spring.xml         # JSON structured logging
│   └── MdcLoggingFilter.java      # Correlation ID propagation
├── nodejs/
│   ├── logger.js                  # Winston JSON logger
│   └── middleware/requestLogger.js # Slow request detection
└── docs/
    ├── elk-architecture.excalidraw
    └── elk-ilm-lifecycle.mmd
```

---

## Author

**Wend-Kuuni Etienne BELEMGNEGRE**
Lead Dev & DevOps | GCP Certified | GDG Ouagadougou

- Medium: [@belemgnegreetienne](https://medium.com/@belemgnegreetienne)
- LinkedIn: [etienne-belemgnegre](https://linkedin.com/in/etienne-belemgnegre)
- GitHub: [EtienneBel](https://github.com/EtienneBel)

---

## License

MIT
