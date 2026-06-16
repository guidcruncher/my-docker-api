# ClientFactory API Documentation

`ClientFactory` is responsible for creating the correct Docker transport client: Unix socket, Windows named pipe, TCP, or TLS-secured TCP. It automatically detects environment variables (`DOCKER_HOST`, `DOCKER_TLS_VERIFY`, `DOCKER_CERT_PATH`) and falls back to platform defaults.

---

## Class: ClientFactory

class ClientFactory

Provides a single static method `create()` that returns a fully configured `LocalClient` instance.

---

## Method: create

static create(type?: "socket" | "tcp" | "tls", options?): LocalClient

Creates a Docker transport client. If `type` is omitted, the factory auto‑detects the correct transport using:

- `DOCKER_HOST`
- `DOCKER_TLS_VERIFY`
- `DOCKER_CERT_PATH`
- Platform defaults (Unix socket or Windows named pipe)

---

## Auto‑Detection Logic

When `ClientFactory.create()` is called with no arguments:

1.  If `DOCKER_HOST` starts with `tcp://` → TCP client
2.  If `DOCKER_TLS_VERIFY=1` → TLS client
3.  If on Linux/macOS → Unix socket client (`/var/run/docker.sock`)
4.  If on Windows → Named pipe client (`npipe:////./pipe/docker_engine`)

Example: auto-detect

```ts
import { ClientFactory } from "./docker/clients/clientFactory"

const client = ClientFactory.create()
// Automatically selects the correct transport
```

---

## Explicit Client Types

### 1\. Unix Socket Client (Linux/macOS)

type "socket"

Connects to the Docker daemon via Unix domain socket.

### Example

```ts
const client = ClientFactory.create("socket", {
  socketPath: "/var/run/docker.sock",
})
```

---

### 2\. Windows Named Pipe Client

type "socket" (auto-detected on Windows)

Uses the Windows Docker named pipe.

### Example

```ts
const client = ClientFactory.create("socket", {
  socketPath: "//./pipe/docker_engine",
})
```

---

### 3\. TCP Client (unencrypted)

type "tcp"

Connects to a remote Docker daemon over plain TCP.

### Example

```ts
const client = ClientFactory.create("tcp", {
  host: "192.168.1.50",
  port: 2375,
})
```

---

### 4\. TLS Client (secure remote Docker)

type "tls"

Connects to a remote Docker daemon using TLS certificates.

### Example

```ts
const client = ClientFactory.create("tls", {
  host: "my-docker-host.example.com",
  port: 2376,
  ca: fs.readFileSync("/certs/ca.pem"),
  cert: fs.readFileSync("/certs/cert.pem"),
  key: fs.readFileSync("/certs/key.pem"),
})
```

---

## Environment Variable Examples

### DOCKER_HOST

TCP example:

```bash
export DOCKER_HOST=tcp://192.168.1.50:2375
```

```ts
const client = ClientFactory.create()
// → TCP client to 192.168.1.50:2375
```

### DOCKER_TLS_VERIFY + DOCKER_CERT_PATH

```bash
export DOCKER_HOST=tcp://myhost:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=/home/user/.docker/certs
```

```ts
const client = ClientFactory.create()
// → TLS client using certs from DOCKER_CERT_PATH
```

---

## Using ClientFactory with DockerDaemonClient

Most users will combine the factory with your Docker daemon client:

```ts
import { DockerDaemonClient } from "./docker/dockerDaemonClient"
import { ClientFactory } from "./docker/clients/clientFactory"

const transport = ClientFactory.create()
const docker = new DockerDaemonClient(transport)

const info = await docker.systemInfo()
console.log(info.ServerVersion)
```

---

## Using ClientFactory with RegistryClient

Registry clients can also be created via the factory:

```ts
import { RegistryClient } from "./docker/registry/registryClient"
import { ClientFactory } from "./docker/clients/clientFactory"

const transport = ClientFactory.create("tcp", {
  host: "registry-1.docker.io",
  port: 443,
  tls: true,
})

const registry = new RegistryClient(transport)
```

---

## Summary

`ClientFactory` provides:

- Automatic Docker transport detection
- Explicit configuration for socket, TCP, and TLS clients
- Full support for Docker environment variables
- Seamless integration with `DockerDaemonClient` and `RegistryClient`
