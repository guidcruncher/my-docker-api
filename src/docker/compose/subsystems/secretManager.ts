import fs from "node:fs"

import type { DockerDaemonClient } from "../../dockerDaemonClient"
import type { ComposeProject } from "../project"
import type { DockerSecret } from "../types-docker"

export class SecretManager {
  constructor(private docker: DockerDaemonClient) {}

  async ensureAll(project: ComposeProject, secrets?: Record<string, DockerSecret>) {
    for (const s of Object.keys(secrets ?? {})) {
      await this.ensure(project, s, secrets![s])
    }
  }

  async ensure(project: ComposeProject, name: string, def: DockerSecret) {
    const full = `${project.name}_${name}`

    try {
      await this.docker.secretInspect(full)
      return
    } catch {
      /* noop */
    }

    if (!def.file) {
      throw new Error(`Config/secret '${name}' is missing required 'file' field`)
    }

    const data = fs.readFileSync(def.file)

    await this.docker.secretCreate({
      Name: full,
      Data: data.toString("base64"),
    })
  }

  buildSecretMounts(project: ComposeProject, svc: any) {
    if (!svc.secrets) return []

    return svc.secrets.map((s: any) => {
      const name = typeof s === "string" ? s : s.source
      const target =
        typeof s === "string" ? `/run/secrets/${name}` : (s.target ?? `/run/secrets/${name}`)

      return {
        File: {
          Name: `${project.name}_${name}`,
          UID: "0",
          GID: "0",
          Mode: 0o444,
          Path: target,
        },
      }
    })
  }

  async removeAll(project: ComposeProject) {
    for (const s of Object.keys(project.file.secrets ?? {})) {
      try {
        await this.docker.secretRemove(`${project.name}_${s}`)
      } catch {
        /* noop */
      }
    }
  }
}
