# Compose Engine Documentation

This document describes the `ComposeLoader`, `ComposeProject`, and `ComposeOrchestrator` components used to load, validate, and run Docker Compose files programmatically.

---

## 1\. ComposeLoader

`ComposeLoader` loads a `docker-compose.yml` file from a YAML string and an optional `.env` file (provided as an array of `KEY=value` lines).

### 1.1 Loading a Compose File

```ts
import { ComposeLoader } from "./compose/loader"

const yaml = `
services:
  api:
    image: node:18
    environment:
      - API_URL=\${URL}
`

const envLines = ["URL=https://example.com"]

const file = ComposeLoader.loadFromStrings(yaml, envLines)

console.log(file.services.api.environment)
// → ["API_URL=https://example.com"]
```

### 1.2 Variable Interpolation

Supports:

- `${VAR}`
- `${VAR:-default}`
- `${VAR:?error message}`

```

command: "${MISSING:-fallback}"   → "fallback"
command: "${NEEDED:?missing var}" → throws Error("missing var")
```

### 1.3 Environment Merging

`envLines` override `process.env` and are used for interpolation only. The orchestrator later normalizes environment arrays into `KEY=value` pairs.

---

## 2\. ComposeProject

`ComposeProject` wraps a loaded Compose file and tracks:

- project name
- active profiles
- resolved services
- events emitted during orchestration

### 2.1 Creating a Project

```ts
import { ComposeProject } from "./compose/project"

const project = new ComposeProject("myapp", file, {
  profiles: ["prod"],
})

console.log(project.services)
```

### 2.2 Profiles

Services with `profiles:` only run when the profile is active.

```

services:
  web:
    image: nginx
    profiles: ["prod"]

  debug:
    image: busybox
    profiles: ["dev"]
```

Active profiles: `["prod"]` → only `web` runs.

---

## 3\. ComposeOrchestrator

`ComposeOrchestrator` is the runtime engine that:

- creates networks, volumes, secrets, configs
- pulls images
- creates and starts containers
- waits for healthchecks
- emits lifecycle events
- stops and removes containers on `down()`

### 3.1 Basic Usage

```ts
import { ComposeOrchestrator } from "./compose/orchestrator"

const orchestrator = new ComposeOrchestrator()

await orchestrator.up(project)
// containers are now running

await orchestrator.down(project)
// containers removed, networks/volumes cleaned up
```

---

## 4\. Networks, Volumes, Secrets, Configs

### 4.1 Networks

Compose networks are created automatically:

```

networks:
  backend:
    driver: bridge
```

Produces Docker network:

```

myapp_backend
```

### 4.2 Volumes

```

volumes:
  data:
    driver: local
```

Creates:

```

myapp_data
```

### 4.3 Secrets

```

secrets:
  api_key:
    file: ./secrets/api_key.txt
```

Mounted into container:

```

/run/secrets/api_key
```

### 4.4 Configs

```

configs:
  app_cfg:
    file: ./config/app.cfg
```

Mounted into:

```

/etc/config/app_cfg
```

---

## 5\. Dependency Ordering

### 5.1 depends_on

```

services:
  db:
    image: postgres

  api:
    image: node
    depends_on:
      - db

  web:
    image: nginx
    depends_on:
      - api
```

Resolved order:

```

["db", "api", "web"]
```

---

## 6\. Healthchecks

### 6.1 Example

```

services:
  api:
    image: node
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      timeout: 2s
      retries: 5
```

The orchestrator waits until:

```

inspect.State.Health.Status === "healthy"
```

Then emits:

```

project.emit("service:healthy", { service: "api" })
```

---

## 7\. Events

### 7.1 Available Events

- `service:create`
- `service:start`
- `service:healthy`
- `service:unhealthy`
- `service:stop`
- `service:remove`

### 7.2 Example

```ts
project.on("service:healthy", (evt) => {
  console.log("Service healthy:", evt.service)
})
```

---

## 8\. Full Example: Running a Compose App

```ts
import { ComposeLoader } from "./compose/loader"
import { ComposeProject } from "./compose/project"
import { ComposeOrchestrator } from "./compose/orchestrator"

const yaml = `
services:
  web:
    image: nginx
    ports:
      - "8080:80"
`

const file = ComposeLoader.loadFromStrings(yaml, [])
const project = new ComposeProject("demo", file)
const orchestrator = new ComposeOrchestrator()

await orchestrator.up(project)
console.log("App is running")

// later...
await orchestrator.down(project)
console.log("App stopped")
```

---

## 9\. Summary

- **ComposeLoader** → loads YAML + env
- **ComposeProject** → holds state, profiles, events
- **ComposeOrchestrator** → runs containers, networks, volumes, secrets, configs
- Supports full Compose features: profiles, healthchecks, depends_on, events
