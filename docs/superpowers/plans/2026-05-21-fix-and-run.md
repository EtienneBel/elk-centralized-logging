# ELK Stack Fixes & Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three identified issues in the ELK stack config, then start the full stack with Docker Compose.

**Architecture:** Three config-only changes (no application code): consolidate Logstash outputs, fix Node.js double-write, align Filebeat paths. Then spin up Docker services and verify health.

**Tech Stack:** Docker Compose, Logstash (pipeline DSL), Node.js / Winston, Filebeat YAML.

---

## Files Modified

| File | Change |
|---|---|
| `logstash/pipeline/beats-input.conf` | Collapse 3 duplicate ES output blocks → 1 dynamic block |
| `nodejs/logger.js` | Remove static `File` transport (kept by DailyRotateFile) |
| `filebeat/config/filebeat.yml` | Update Node.js path from `app.log` → `app-*.log` to match DailyRotateFile output |

---

### Task 1: Consolidate Logstash pipeline outputs

**Files:**
- Modify: `logstash/pipeline/beats-input.conf`

The output section currently repeats the same Elasticsearch block three times, differing only by index prefix. Collapse into a single block using a dynamic index name. Route unknowns to `unknown-logs-*` via a fallback mutate.

- [ ] **Step 1: Add a mutate filter to set `log_index_prefix`**

Replace the entire `beats-input.conf` output section. First, add a new filter block after the existing filters:

```ruby
# In the filter section, add at the end (before closing brace):
  mutate {
    add_field => {
      "log_index_prefix" => "%{[fields][service]}"
    }
  }

  if [log_index_prefix] not in ["springboot", "laravel", "nodejs"] {
    mutate { replace => { "log_index_prefix" => "unknown" } }
  }
```

- [ ] **Step 2: Replace the output section with a single dynamic block**

```ruby
output {
  if [log_index_prefix] == "unknown" {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      user => "elastic"
      password => "${ELASTICSEARCH_PASSWORD}"
      index => "unknown-logs-%{+YYYY.MM.dd}"
    }
  } else {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      user => "elastic"
      password => "${ELASTICSEARCH_PASSWORD}"
      index => "%{log_index_prefix}-%{[application]}-%{[environment]}-logs-%{+YYYY.MM.dd}"
    }
  }
}
```

- [ ] **Step 3: Verify the final file looks correct**

Run:
```bash
cat logstash/pipeline/beats-input.conf
```
Expected: one `output` block, no repeated `hosts`/`user`/`password` lines.

- [ ] **Step 4: Commit**

```bash
git add logstash/pipeline/beats-input.conf
git commit -m "refactor: consolidate logstash output into single dynamic block"
```

---

### Task 2: Fix Node.js double-write

**Files:**
- Modify: `nodejs/logger.js`

The logger currently writes to both a static `app.log` (File transport, size-rotated) AND `app-%DATE%.log` (DailyRotateFile). Filebeat only watched `app.log`, so the daily-rotated files were never shipped. Fix: remove the static File transport, keep only DailyRotateFile, and update Filebeat to watch `app-*.log`.

- [ ] **Step 1: Remove the static File transport from `nodejs/logger.js`**

Delete the following block (lines 31–39):

```js
// Remove this entire transport:
new winston.transports.File({
  filename: `${LOG_DIR}/app.log`,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  maxsize: 500 * 1024 * 1024,
  maxFiles: 5,
}),
```

After removal the `transports` array should have exactly two entries: `Console` and `DailyRotateFile`.

- [ ] **Step 2: Verify `nodejs/logger.js` transports array**

Run:
```bash
grep -n "transports\." nodejs/logger.js
```
Expected output: exactly two matches — one `Console`, one `DailyRotateFile`.

- [ ] **Step 3: Commit**

```bash
git add nodejs/logger.js
git commit -m "fix: remove duplicate static File transport from winston logger"
```

---

### Task 3: Update Filebeat path for Node.js logs

**Files:**
- Modify: `filebeat/config/filebeat.yml`

Now that Node.js only writes `app-%DATE%.log` files, Filebeat must watch that pattern instead of the old `app.log`.

- [ ] **Step 1: Update the nodejs input path in `filebeat/config/filebeat.yml`**

Change:
```yaml
paths:
  - /var/log/apps/notification-api/app.log
```

To:
```yaml
paths:
  - /var/log/apps/notification-api/app-*.log
```

- [ ] **Step 2: Verify**

Run:
```bash
grep -A2 "notification-api" filebeat/config/filebeat.yml
```
Expected:
```
      - /var/log/apps/notification-api/app-*.log
```

- [ ] **Step 3: Commit**

```bash
git add filebeat/config/filebeat.yml
git commit -m "fix: update filebeat nodejs path to match DailyRotateFile pattern"
```

---

### Task 4: Run the stack

- [ ] **Step 1: Check .env exists and has a real password**

```bash
cat .env
```
Expected: `ELASTIC_PASSWORD` is set to something other than `change_me_min_14_chars`. If not, set it now:
```bash
# Edit .env and replace the placeholder with a real password (14+ chars)
```

- [ ] **Step 2: Create the external Docker network (idempotent)**

```bash
docker network create logging-network 2>/dev/null || echo "network already exists"
```
Expected: either `<network-id>` or "network already exists".

- [ ] **Step 3: Start the stack**

```bash
docker compose -f docker-compose.elk.yml up -d
```
Expected: 4 containers start (`elasticsearch`, `logstash`, `kibana`, `filebeat`).

- [ ] **Step 4: Wait for Elasticsearch to be healthy**

```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "elasticsearch|logstash|kibana|filebeat"
```
Wait until `elasticsearch` shows `healthy`. Logstash/Kibana will show `starting` or `healthy` once ES is up (can take 60–90 seconds).

- [ ] **Step 5: Verify Elasticsearch cluster health**

```bash
source .env && curl -s -u elastic:${ELASTIC_PASSWORD} 'http://localhost:9200/_cluster/health?pretty'
```
Expected: `"status" : "green"` or `"yellow"` (yellow is normal for single-node).

- [ ] **Step 6: Verify Kibana is reachable**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status
```
Expected: `200`.

- [ ] **Step 7: Open Kibana**

```bash
open http://localhost:5601
```
Log in with `elastic` / your `ELASTIC_PASSWORD`.

---

## Done Criteria

- `logstash/pipeline/beats-input.conf` has one `output` block with no repeated Elasticsearch credentials.
- `nodejs/logger.js` has two transports: `Console` + `DailyRotateFile` only.
- `filebeat/config/filebeat.yml` Node.js path is `app-*.log`.
- All 4 Docker containers are running and `elasticsearch` reports `green` or `yellow`.
