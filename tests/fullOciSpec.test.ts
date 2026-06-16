import { ComposeLoader } from "../src/docker/compose/loader"
import type { OCIComposeFile, OCIDependsOnCondition } from "../src/docker/compose/types-oci"

describe("Full OCI Compose Spec", () => {
  test("parses a complete OCI-compliant compose file", () => {
    const yaml = `
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
          healthcheck:
            test: ["CMD-SHELL", "pg_isready -U postgres"]
            interval: 5s
            retries: 5

      networks:
        backend:
          driver: bridge

      volumes:
        dbdata:
          driver: local
        cachevol:
          driver: local

      secrets:
        api_key:
          file: ./secrets/api_key.txt

      configs:
        nginx_conf:
          file: ./config/nginx.conf
    `

    const file = ComposeLoader.load(yaml) as OCIComposeFile

    const api = file.services.api
    const db = file.services.db

    // environment normalized to object
    expect(api.environment && typeof api.environment === "object").toBe(true)
    const apiEnv = api.environment as Record<string, string>
    expect(apiEnv.NODE_ENV).toBe("production")
    expect(apiEnv.PORT).toBe("3000")

    // depends_on normalized to object
    expect(api.depends_on && typeof api.depends_on === "object").toBe(true)
    const deps = api.depends_on as Record<string, OCIDependsOnCondition>
    expect(deps.db.condition).toBe("service_started")

    // db environment normalized
    expect(db.environment && typeof db.environment === "object").toBe(true)
    const dbEnv = db.environment as Record<string, string>
    expect(dbEnv.POSTGRES_PASSWORD).toBe("example")

    // top-level objects
    expect(Object.keys(file.networks ?? {})).toContain("backend")
    expect(Object.keys(file.volumes ?? {})).toContain("dbdata")
    expect(Object.keys(file.volumes ?? {})).toContain("cachevol")
    expect(Object.keys(file.secrets ?? {})).toContain("api_key")
    expect(Object.keys(file.configs ?? {})).toContain("nginx_conf")
  })
})
