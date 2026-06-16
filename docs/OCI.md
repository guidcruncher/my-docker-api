# OCI container support

## dockerToOCI & ociToDocker

These two functions form a bidirectional conversion layer between **Docker-specific Compose files** and **pure OCI Compose Spec** structures.

- Function `dockerToOCI(input: DockerComposeFile): OCIComposeFile`
- Function `ociToDocker(input: OCIComposeFile): DockerComposeFile`

Both live in the Docker compose module: src/docker/compose

---

## 1\. dockerToOCI

`dockerToOCI` converts a `DockerComposeFile` into an `OCIComposeFile` by:

- Preserving all **OCI-spec fields** (services, networks, volumes, secrets, configs).
- Stripping all **Docker-only extensions** (e.g. `restart`, `privileged`, `logging`, `deploy`, etc.).
- Leaving the structure otherwise intact.

### 1.1 Function signature

```ts
import type { DockerComposeFile } from "./types-docker"
import type { OCIComposeFile } from "./types-oci"

export function dockerToOCI(input: DockerComposeFile): OCIComposeFile
```

### 1.2 Example: Docker YAML → OCI YAML

#### Input: Docker Compose YAML

```yaml
services:
  api:
    image: node:18
    container_name: api_container
    working_dir: /usr/src/app
    command: ["npm", "start"]
    entrypoint: ["node"]
    environment:
      NODE_ENV: production
      PORT: "3000"
    ports:
      - "8080:80"
      - target: 443
        published: 8443
        protocol: tcp
        host_ip: "0.0.0.0"
    volumes:
      - ./src:/app/src
      - type: volume
        source: cachevol
        target: /cache
        volume:
          nocopy: true
    networks:
      backend:
        aliases:
          - api.local
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 5s
      timeout: 2s
      retries: 3
    restart: always
    privileged: true
    logging:
      driver: json-file
      options:
        max-size: "10m"
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: "512M"

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - dbdata:/var/lib/postgresql/data
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  dbdata:
    driver: local
  cachevol:
    driver: local
```

#### Conversion code

```ts
import { ComposeLoader } from "./loader"
import { dockerToOCI } from "./dockerToOci"
import { dump as dumpYaml } from "js-yaml"

const dockerYaml = /* the YAML above as a string */
const dockerFile = ComposeLoader.load(dockerYaml) // DockerComposeFile
const ociFile = dockerToOCI(dockerFile)           // OCIComposeFile
const ociYaml = dumpYaml(ociFile)
```

#### Output: OCI-compliant YAML

Note how Docker-only fields (`container_name`, `restart`, `privileged`, `logging`, `deploy`) are gone.

```yaml
services:
  api:
    image: node:18
    working_dir: /usr/src/app
    command:
      - npm
      - start
    entrypoint:
      - node
    environment:
      NODE_ENV: production
      PORT: "3000"
    ports:
      - "8080:80"
      - target: 443
        published: 8443
        protocol: tcp
        host_ip: "0.0.0.0"
    volumes:
      - ./src:/app/src
      - type: volume
        source: cachevol
        target: /cache
        volume:
          nocopy: true
    networks:
      backend:
        aliases:
          - api.local
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - http://localhost/health
      interval: 5s
      timeout: 2s
      retries: 3

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - dbdata:/var/lib/postgresql/data
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  dbdata:
    driver: local
  cachevol:
    driver: local
```

---

## 2\. ociToDocker

`ociToDocker` converts an `OCIComposeFile` into a `DockerComposeFile` by:

- Copying all OCI fields directly into Docker services.
- Leaving Docker-only fields **undefined** (no assumptions, no magic).
- Preserving networks, volumes, secrets, configs as-is.

### 2.1 Function signature

```ts
import type { OCIComposeFile } from "./types-oci"
import type { DockerComposeFile } from "./types-docker"

export function ociToDocker(input: OCIComposeFile): DockerComposeFile
```

### 2.2 Example: OCI YAML → Docker YAML

#### Input: OCI Compose YAML

```yaml
services:
  api:
    image: node:18
    build:
      context: ./app
      dockerfile: Dockerfile
      args:
        MODE: production
    command: ["npm", "start"]
    entrypoint: ["node"]
    working_dir: /usr/src/app
    environment:
      NODE_ENV: production
      PORT: "3000"
    env_file:
      - .env
    ports:
      - "8080:80"
      - target: 443
        published: 8443
        protocol: tcp
        mode: host
        host_ip: "0.0.0.0"
    volumes:
      - ./src:/app/src
      - type: volume
        source: cachevol
        target: /cache
        volume:
          nocopy: true
    networks:
      backend:
        aliases:
          - api.local
    depends_on:
      db:
        condition: service_started
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 5s
      timeout: 2s
      retries: 3
    labels:
      app: api
    profiles:
      - prod

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - dbdata:/var/lib/postgresql/data
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  dbdata:
    driver: local
  cachevol:
    driver: local
```

#### Conversion code

```ts
import { ComposeLoader } from "./loader"
import { ociToDocker } from "./ociToDocker"
import { dump as dumpYaml } from "js-yaml"

const ociYaml = /* the YAML above as a string */
const ociFile = ComposeLoader.load(ociYaml)   // OCIComposeFile
const dockerFile = ociToDocker(ociFile)       // DockerComposeFile
const dockerYaml = dumpYaml(dockerFile)
```

#### Output: Docker Compose YAML

All OCI fields are preserved; Docker-only fields are present in the type but remain undefined unless you set them later.

```yaml
services:
  api:
    image: node:18
    build:
      context: ./app
      dockerfile: Dockerfile
      args:
        MODE: production
    command:
      - npm
      - start
    entrypoint:
      - node
    working_dir: /usr/src/app
    environment:
      NODE_ENV: production
      PORT: "3000"
    env_file:
      - .env
    ports:
      - "8080:80"
      - target: 443
        published: 8443
        protocol: tcp
        mode: host
        host_ip: "0.0.0.0"
    volumes:
      - ./src:/app/src
      - type: volume
        source: cachevol
        target: /cache
        volume:
          nocopy: true
    networks:
      backend:
        aliases:
          - api.local
    depends_on:
      db:
        condition: service_started
    healthcheck:
      test:
        - CMD
        - curl
        - -f
        - http://localhost/health
      interval: 5s
      timeout: 2s
      retries: 3
    labels:
      app: api
    profiles:
      - prod

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - dbdata:/var/lib/postgresql/data
    networks:
      - backend

networks:
  backend:
    driver: bridge

volumes:
  dbdata:
    driver: local
  cachevol:
    driver: local
```

---

## 3\. Round-trip example

Because both converters are deterministic and spec‑aligned, you can safely round‑trip:

```ts
import { dockerToOCI } from "./dockerToOci"
import { ociToDocker } from "./ociToDocker"

const dockerFile: DockerComposeFile = /* ... */

const ociFile = dockerToOCI(dockerFile)
const dockerAgain = ociToDocker(ociFile)
```

This is ideal for:

- Normalising Docker Compose files to the OCI spec.
- Linting / validating against the OCI spec.
- Supporting multiple runtimes (Docker, Podman, etc.) from a single OCI core.
