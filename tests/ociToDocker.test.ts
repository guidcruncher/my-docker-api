import { ociToDocker } from "../src/docker/compose/ociToDocker"
import type { OCIComposeFile, OCIDependsOnCondition } from "../src/docker/compose/types-oci"
import type { DockerComposeFile } from "../src/docker/compose/types-docker"

describe("ociToDocker converter", () => {
  test("converts a full OCI spec into a Docker Compose spec", () => {
    const oci: OCIComposeFile = {
      services: {
        api: {
          image: "node:18",
          build: {
            context: "./app",
            dockerfile: "Dockerfile",
            args: { MODE: "production" },
          },
          command: ["npm", "start"],
          entrypoint: ["node"],
          working_dir: "/usr/src/app",

          environment: {
            NODE_ENV: "production",
            PORT: "3000",
          },

          env_file: [".env"],

          ports: [
            {
              target: 80,
              published: 8080,
              protocol: "tcp",
            },
            {
              target: 443,
              published: 8443,
              protocol: "tcp",
              mode: "host",
              host_ip: "0.0.0.0",
            },
          ],

          volumes: [
            {
              type: "bind",
              source: "./src",
              target: "/app/src",
            },
            {
              type: "volume",
              source: "cachevol",
              target: "/cache",
              volume: { nocopy: true },
            },
          ],

          networks: [
            {
              name: "backend",
              aliases: ["api.local"],
              ipv4_address: undefined,
              ipv6_address: undefined,
            },
          ],

          depends_on: {
            db: { condition: "service_started" },
          },

          healthcheck: {
            test: ["CMD", "curl", "-f", "http://localhost/health"],
            interval: "5s",
            timeout: "2s",
            retries: 3,
          },

          labels: {
            app: "api",
          },

          profiles: ["prod"],
        },

        db: {
          image: "postgres:15",
          environment: {
            POSTGRES_PASSWORD: "example",
          },

          volumes: [
            {
              type: "volume",
              source: "dbdata",
              target: "/var/lib/postgresql/data",
            },
          ],

          networks: [
            {
              name: "backend",
              aliases: undefined,
              ipv4_address: undefined,
              ipv6_address: undefined,
            },
          ],
        },
      },

      networks: {
        backend: { driver: "bridge" },
      },

      volumes: {
        dbdata: { driver: "local" },
        cachevol: { driver: "local" },
      },

      secrets: {
        api_key: { file: "./secrets/api_key.txt" },
      },

      configs: {
        nginx_conf: { file: "./config/nginx.conf" },
      },
    }

    const docker = ociToDocker(oci)

    // --- services ---
    expect(Object.keys(docker.services)).toContain("api")
    expect(Object.keys(docker.services)).toContain("db")

    const api = docker.services.api
    const db = docker.services.db

    // --- OCI fields preserved ---
    expect(api.image).toBe("node:18")
    expect(api.working_dir).toBe("/usr/src/app")
    expect(api.command).toEqual(["npm", "start"])
    expect(api.entrypoint).toEqual(["node"])

    // --- environment narrowing ---
    expect(api.environment && typeof api.environment === "object").toBe(true)
    const apiEnv = api.environment as Record<string, string>
    expect(apiEnv.NODE_ENV).toBe("production")
    expect(apiEnv.PORT).toBe("3000")

    // --- depends_on narrowing ---
    expect(api.depends_on && typeof api.depends_on === "object").toBe(true)
    const deps = api.depends_on as Record<string, OCIDependsOnCondition>
    expect(deps.db.condition).toBe("service_started")

    // --- Docker-only defaults exist but undefined ---
    expect(api.restart).toBeUndefined()
    expect(api.privileged).toBeUndefined()
    expect(api.logging).toBeUndefined()
    expect(api.deploy).toBeUndefined()

    // --- top-level networks ---
    expect(Object.keys(docker.networks ?? {})).toContain("backend")

    // --- volumes preserved ---
    expect(Object.keys(docker.volumes ?? {})).toContain("dbdata")
    expect(Object.keys(docker.volumes ?? {})).toContain("cachevol")

    // --- secrets preserved ---
    expect(Object.keys(docker.secrets ?? {})).toContain("api_key")

    // --- configs preserved ---
    expect(Object.keys(docker.configs ?? {})).toContain("nginx_conf")
  })
})
