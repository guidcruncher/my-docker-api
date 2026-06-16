import fs from "node:fs"

import type { DockerDaemonClient } from "../../dockerDaemonClient"
import type { ComposeProject } from "../project"
import type { DockerConfig } from "../types-docker"

export class ConfigManager {
  constructor(private docker: DockerDaemonClient) {}

  async ensureAll(project: ComposeProject, configs?: Record<string, DockerConfig>) {
    for (const c of Object.keys(configs ?? {})) {
      await this.ensure(project, c, configs![c])
    }
  }

  async ensure(project: ComposeProject, name: string, def: DockerConfig) {
    const full = `${project.name}_${name}`

    try {
      await this.docker.configInspect(full)
      return
    } catch {
      /* noop */
    }

    if (!def.file) {
      throw new Error(`Config/secret '${name}' is missing required 'file' field`)
    }

    const data = fs.readFileSync(def.file)

    await this.docker.configCreate({
      Name: full,
      Data: data.toString("base64"),
    })
  }

  buildConfigMounts(project: ComposeProject, svc: any) {
    if (!svc.configs) return []

    return svc.configs.map((c: any) => {
      const name = typeof c === "string" ? c : c.source
      const target =
        typeof c === "string" ? `/etc/configs/${name}` : (c.target ?? `/etc/configs/${name}`)

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
    for (const c of Object.keys(project.file.configs ?? {})) {
      try {
        await this.docker.configRemove(`${project.name}_${c}`)
      } catch {
        /* noop */
      }
    }
  }
}
