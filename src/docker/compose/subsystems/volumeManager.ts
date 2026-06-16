import type { DockerDaemonClient } from "../../dockerDaemonClient"
import type { ComposeProject } from "../project"
import type { DockerVolume } from "../types-docker"

export class VolumeManager {
  constructor(private docker: DockerDaemonClient) {}

  async ensureAll(project: ComposeProject, volumes?: Record<string, DockerVolume>) {
    for (const v of Object.keys(volumes ?? {})) {
      await this.ensure(project, v, volumes![v])
    }
  }

  async ensure(project: ComposeProject, name: string, def: DockerVolume) {
    // external volumes: do NOT create
    if (def.external) return

    const full = `${project.name}_${name}`

    try {
      await this.docker.volumeInspect(full)
      return
    } catch {
      /* noop */
    }

    // driver_opts → encoded as labels (Compose-compatible)
    const driverOptLabels: Record<string, string> = {}
    if (def.driver_opts) {
      for (const [k, v] of Object.entries(def.driver_opts)) {
        driverOptLabels[`com.docker.compose.volume.driver_opt.${k}`] = String(v)
      }
    }

    // user-defined labels
    const userLabels = def.labels ?? {}

    await this.docker.volumeCreate({
      Name: full,
      Driver: def.driver ?? "local",
      Labels: {
        // Compose metadata
        "com.docker.compose.project": project.name,
        "com.docker.compose.volume": name,

        // user labels
        ...userLabels,

        // driver opts encoded as labels
        ...driverOptLabels,
      },
    })
  }

  async removeAll(project: ComposeProject) {
    for (const v of Object.keys(project.file.volumes ?? {})) {
      const def = project.file.volumes![v]
      if (def.external) continue

      try {
        await this.docker.volumeRemove(`${project.name}_${v}`)
      } catch {
        /* noop */
      }
    }
  }
}
