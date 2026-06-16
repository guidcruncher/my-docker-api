import type { DockerDaemonClient } from "../../dockerDaemonClient"
import type { ComposeProject } from "../project"
import type { DockerNetwork } from "../types-docker"

export class NetworkManager {
  constructor(private docker: DockerDaemonClient) {}

  async ensureAll(project: ComposeProject, networks?: Record<string, DockerNetwork>) {
    const defs = networks ?? {}

    for (const name of Object.keys(defs)) {
      await this.ensure(project, name, defs[name])
    }

    if (!defs.default) {
      await this.ensure(project, "default", {})
    }
  }

  async ensure(project: ComposeProject, name: string, def: DockerNetwork) {
    // external networks: do NOT create
    if (def.external) return

    const full = `${project.name}_${name}`

    try {
      await this.docker.networkInspect(full)
      return
    } catch {
      /* noop */
    }

    // driver_opts, internal, attachable, ipam are not supported by your Docker client
    // so we encode them into labels for compatibility
    const extraLabels: Record<string, string> = {}

    if (def.driver_opts) {
      for (const [k, v] of Object.entries(def.driver_opts)) {
        extraLabels[`com.docker.compose.network.driver_opt.${k}`] = String(v)
      }
    }

    if (def.internal !== undefined) {
      extraLabels["com.docker.compose.network.internal"] = String(def.internal)
    }

    if (def.attachable !== undefined) {
      extraLabels["com.docker.compose.network.attachable"] = String(def.attachable)
    }

    if (def.ipam?.config) {
      def.ipam.config.forEach((cfg, idx) => {
        if (cfg.subnet) extraLabels[`com.docker.compose.network.ipam.${idx}.subnet`] = cfg.subnet
        if (cfg.gateway) extraLabels[`com.docker.compose.network.ipam.${idx}.gateway`] = cfg.gateway
        if (cfg.ip_range)
          extraLabels[`com.docker.compose.network.ipam.${idx}.ip_range`] = cfg.ip_range
      })
    }

    await this.docker.networkCreate({
      Name: full,
      Driver: def.driver ?? "bridge",
      Labels: {
        "com.docker.compose.project": project.name,
        "com.docker.compose.network": name,
        ...(def.labels ?? {}),
        ...extraLabels,
      },
    })
  }

  async removeAll(project: ComposeProject) {
    const nets = project.file.networks ?? { default: {} }

    for (const n of Object.keys(nets)) {
      const def = nets[n]
      if (def.external) continue

      try {
        await this.docker.networkRemove(`${project.name}_${n}`)
      } catch {
        /* noop */
      }
    }
  }

  buildNetworkConfig(project: ComposeProject, svc: any) {
    const out: Record<string, any> = {}

    const networks = svc.networks ?? ["default"]

    if (Array.isArray(networks)) {
      for (const n of networks) {
        out[`${project.name}_${n}`] = {}
      }
      return out
    }

    for (const [net, rawCfg] of Object.entries(networks)) {
      const cfg = rawCfg as any
      out[`${project.name}_${net}`] = {
        Aliases: cfg.aliases,
        IPAMConfig: {
          IPv4Address: cfg.ipv4_address,
          IPv6Address: cfg.ipv6_address,
        },
      }
    }

    return out
  }
}
