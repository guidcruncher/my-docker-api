import { dockerToOCI } from "../src/docker/compose/dockerToOci"
import type { DockerComposeFile } from "../src/docker/compose/types-docker"
import type { OCIDependsOnCondition } from "../src/docker/compose/types-oci"

describe("dockerToOCI converter", () => {
  test("converts a full Docker Compose spec into a strict OCI spec", () => {
    const docker: DockerComposeFile = {
      services: {
        api: {
          image: "node:18",
          container_name: "api_container",
          hostname: "api",
          working_dir: "/usr/src/app",

          command: ["npm", "start"],
          entrypoint: ["node"],

          environment: {
            NODE_ENV: "production",
            PORT: "3000",
          },

          ports: [
            "8080:80",
            {
              target: 443,
              published: 8443,
              protocol: "tcp",
              host_ip: "0.0.0.0",
            },
          ],

          volumes: [
            "./src:/app/src",
            {
              type: "volume",
              source: "cachevol",
              target: "/cache",
              volume: { nocopy: true },
            },
          ],

          networks: {
            backend: { name: "backend", aliases: ["api.local"] },
          },

          depends_on: {
            db: { condition: "service_healthy" },
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

          restart: "always",
          privileged: true,
          cap_add: ["NET_ADMIN"],
          logging: {
            driver: "json-file",
            options: { "max-size": "10m" },
          },
          deploy: {
            resources: {
              limits: { cpus: "0.5", memory: "512M" },
            },
          },
        },

        db: {
          image: "postgres:15",
          environment: {
            POSTGRES_PASSWORD: "example",
          },
          volumes: ["dbdata:/var/lib/postgresql/data"],

          networks: ["backend"],
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

    const oci = dockerToOCI(docker)

    expect(Object.keys(oci.services)).toContain("api")
    expect(Object.keys(oci.services)).toContain("db")

    const api = oci.services.api
    const db = oci.services.db

    // docker-only fields removed
    expect((api as any).container_name).toBeUndefined()
    expect((api as any).restart).toBeUndefined()
    expect((api as any).privileged).toBeUndefined()
    expect((api as any).logging).toBeUndefined()
    expect((api as any).deploy).toBeUndefined()

    // core fields preserved
    expect(api.image).toBe("node:18")
    expect(api.working_dir).toBe("/usr/src/app")
    expect(api.command).toEqual(["npm", "start"])
    expect(api.entrypoint).toEqual(["node"])

    // environment normalized to object
    expect(api.environment && typeof api.environment === "object").toBe(true)
    const apiEnv = api.environment as Record<string, string>
    expect(apiEnv.NODE_ENV).toBe("production")
    expect(apiEnv.PORT).toBe("3000")

    // ports preserved
    expect(api.ports?.length).toBe(2)

    // volumes normalized long syntax
    expect(api.volumes?.length).toBe(2)
    expect(api.volumes?.[0]).toEqual({
      type: "bind",
      source: "./src",
      target: "/app/src",
      read_only: false,
    })
    expect(api.volumes?.[1]).toEqual({
      type: "volume",
      source: "cachevol",
      target: "/cache",
      volume: { nocopy: true },
    })

    // depends_on normalized to object
    expect(api.depends_on && typeof api.depends_on === "object").toBe(true)
    const deps = api.depends_on as Record<string, OCIDependsOnCondition>
    expect(deps.db.condition).toBe("service_healthy")

    // db service
    expect(db.image).toBe("postgres:15")
    expect(db.environment && typeof db.environment === "object").toBe(true)
    const dbEnv = db.environment as Record<string, string>
    expect(dbEnv.POSTGRES_PASSWORD).toBe("example")

    expect(db.volumes?.[0]).toEqual({
      type: "volume",
      source: "dbdata",
      target: "/var/lib/postgresql/data",
      read_only: false,
    })

    expect(db.networks).toEqual([
      {
        name: "backend",
        aliases: undefined,
        ipv4_address: undefined,
        ipv6_address: undefined,
      },
    ])

    // top-level objects
    expect(Object.keys(oci.networks ?? {})).toContain("backend")
    expect(Object.keys(oci.volumes ?? {})).toContain("dbdata")
    expect(Object.keys(oci.volumes ?? {})).toContain("cachevol")
    expect(Object.keys(oci.secrets ?? {})).toContain("api_key")
    expect(Object.keys(oci.configs ?? {})).toContain("nginx_conf")
  })
})
