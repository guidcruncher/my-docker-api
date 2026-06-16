import { ComposeLoader } from "../src/docker/compose/loader"
import { ComposeProject } from "../src/docker/compose/project"
import type { DockerComposeFile } from "../src/docker/compose/types-docker"
import type { OCIDependsOnCondition } from "../src/docker/compose/types-oci"

describe("Full Docker Compose Spec", () => {
  test("loads and normalises a complete Docker Compose spec", () => {
    const yaml = `
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
            - type: bind
              source: ./src
              target: /app/src
            - type: tmpfs
              target: /cache
              tmpfs:
                size: 1000000
          networks:
            - backend
          depends_on:
            db:
              condition: service_healthy
          healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost/health"]
            interval: 5s
            timeout: 2s
            retries: 3
          restart: always
          logging:
            driver: json-file
            options:
              max-size: "10m"
          deploy:
            resources:
              limits:
                cpus: "0.50"
                memory: "512M"
              reservations:
                memory: "128M"

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

      secrets:
        api_key:
          file: ./secrets/api_key.txt

      configs:
        nginx_conf:
          file: ./config/nginx.conf
    `

    const file = ComposeLoader.load(yaml) as DockerComposeFile
    const project = new ComposeProject("testproj", file)

    const api = project.services.api
    const db = project.services.db

    // environment normalized to object
    expect(api.environment && typeof api.environment === "object").toBe(true)
    const apiEnv = api.environment as Record<string, string>
    expect(apiEnv.NODE_ENV).toBe("production")
    expect(apiEnv.PORT).toBe("3000")

    // depends_on normalized to object
    expect(api.depends_on && typeof api.depends_on === "object").toBe(true)
    const deps = api.depends_on as Record<string, OCIDependsOnCondition>
    expect(deps.db.condition).toBe("service_healthy")

    // db environment normalized
    expect(db.environment && typeof db.environment === "object").toBe(true)
    const dbEnv = db.environment as Record<string, string>
    expect(dbEnv.POSTGRES_PASSWORD).toBe("example")

    // top-level objects
    expect(Object.keys(project.networks)).toContain("backend")
    expect(Object.keys(project.volumes)).toContain("dbdata")
    expect(Object.keys(project.secrets)).toContain("api_key")
    expect(Object.keys(project.configs)).toContain("nginx_conf")
  })
})
