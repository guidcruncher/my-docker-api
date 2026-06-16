import type { DockerDaemonClient } from "../../dockerDaemonClient"
import { parseDurationToSeconds } from "../../utils/durationToSeconds"
import type { ComposeProject } from "../project"
import type {
  DockerDeploy,
  DockerPortLong,
  DockerService,
  DockerVolumeMount,
} from "../types-docker"
import { ConfigManager } from "./configManager"
import { EnvManager } from "./envManager"
import { HealthcheckManager } from "./healthcheckManager"
import { NetworkManager } from "./networkManager"
import { SecretManager } from "./secretManager"

export class ContainerFactory {
  constructor(
    private docker: DockerDaemonClient,
    private env: EnvManager,
    private networks: NetworkManager,
    private secrets: SecretManager,
    private configs: ConfigManager,
    private health: HealthcheckManager,
  ) {}

  async createContainer(project: ComposeProject, service: string, svc: DockerService) {
    const { binds, tmpfsMounts } = this.resolveVolumeMounts(project, svc)

    const devices = svc.devices?.map((d) => ({
      PathOnHost: d,
      PathInContainer: d,
      CgroupPermissions: "rwm",
    }))

    const extraHosts = Array.isArray(svc.extra_hosts)
      ? svc.extra_hosts
      : svc.extra_hosts
        ? Object.entries(svc.extra_hosts).map(([h, ip]) => `${h}:${ip}`)
        : undefined

    const tmpfsSvc = svc.tmpfs ? (Array.isArray(svc.tmpfs) ? svc.tmpfs : [svc.tmpfs]) : []

    const tmpfs = [...tmpfsSvc, ...tmpfsMounts]

    const dns = Array.isArray(svc.dns) ? svc.dns : svc.dns ? [svc.dns] : undefined

    const ulimits = svc.ulimits
      ? Object.entries(svc.ulimits).map(([name, v]) => ({
          Name: name,
          Soft: v.soft,
          Hard: v.hard,
        }))
      : undefined

    const portBindings = this.parsePorts(svc.ports)
    const exposedPorts = this.buildExposedPorts(svc.ports)

    const deployMapped = this.mapDeployResources(svc.deploy, svc)

    const config = {
      Image: svc.image,

      Cmd: Array.isArray(svc.command)
        ? svc.command
        : svc.command
          ? svc.command.split(" ")
          : undefined,

      Entrypoint: Array.isArray(svc.entrypoint)
        ? svc.entrypoint
        : svc.entrypoint
          ? svc.entrypoint.split(" ")
          : undefined,

      WorkingDir: svc.working_dir,
      User: svc.user,
      Hostname: svc.hostname,

      Env: this.env.buildEnv(svc.environment, svc.env_file),

      Labels: {
        "com.docker.compose.project": project.name,
        "com.docker.compose.service": service,
        "com.docker.compose.container-number": "1",
        ...(svc.labels ?? {}),
      },

      StopSignal: svc.stop_signal,
      StopTimeout: svc.stop_grace_period
        ? parseDurationToSeconds(svc.stop_grace_period)
        : undefined,

      Healthcheck: this.health.mapHealthcheck(svc.healthcheck),

      ExposedPorts: exposedPorts,

      HostConfig: {
        NetworkMode: svc.network_mode,
        Dns: dns,
        DnsSearch: svc.dns_search,
        ExtraHosts: extraHosts,

        Binds: binds,
        Tmpfs: tmpfs.length ? tmpfs : undefined,
        Devices: devices,

        RestartPolicy: this.mapRestartPolicy(svc.restart),

        Privileged: svc.privileged ?? false,
        CapAdd: svc.cap_add,
        CapDrop: svc.cap_drop,
        SecurityOpt: svc.security_opt,

        Sysctls: svc.sysctls,
        Ulimits: ulimits,

        IpcMode: svc.ipc,
        PidMode: svc.pid,
        CgroupParent: svc.cgroup_parent,

        Memory: deployMapped.memory,
        MemoryReservation: deployMapped.memoryReservation,
        MemorySwap: svc.memswap_limit,

        NanoCpus: deployMapped.nanoCpus,
        CpuShares: svc.cpu_shares,
        CpuQuota: svc.cpu_quota,
        CpuPeriod: svc.cpu_period,

        OomKillDisable: svc.oom_kill_disable,
        OomScoreAdj: svc.oom_score_adj,

        LogConfig: svc.logging
          ? {
              Type: svc.logging.driver,
              Config: svc.logging.options ?? {},
            }
          : undefined,

        ShmSize: svc.shm_size,

        PortBindings: portBindings,
      },

      NetworkingConfig: {
        EndpointsConfig: this.networks.buildNetworkConfig(project, svc),
      },

      Secrets: this.secrets.buildSecretMounts(project, svc),
      Configs: this.configs.buildConfigMounts(project, svc),
    }

    const res = await this.docker.createContainer(config, {
      name: svc.container_name ?? `${project.name}_${service}_1`,
    })

    return res.Id
  }

  private mapRestartPolicy(policy?: string) {
    switch (policy) {
      case "always":
        return { Name: "always" }
      case "on-failure":
        return { Name: "on-failure" }
      case "unless-stopped":
        return { Name: "unless-stopped" }
      default:
        return { Name: "no" }
    }
  }

  private isNamedVolume(project: ComposeProject, source?: string) {
    if (!source) return false
    if (source.startsWith("/") || source.startsWith("./") || source.startsWith("../")) {
      return false
    }
    return !!project.volumes && Object.prototype.hasOwnProperty.call(project.volumes, source)
  }

  private resolveVolumeMounts(project: ComposeProject, svc: DockerService) {
    const binds: string[] = []
    const tmpfsMounts: string[] = []

    for (const v of svc.volumes ?? []) {
      if (typeof v === "string") {
        const parts = v.split(":")
        const src = parts[0]
        const target = parts[1]
        const opts = parts.slice(2).join(":")

        if (this.isNamedVolume(project, src)) {
          const full = `${project.name}_${src}`
          binds.push(opts ? `${full}:${target}:${opts}` : `${full}:${target}`)
        } else {
          binds.push(opts ? `${src}:${target}:${opts}` : `${src}:${target}`)
        }
      } else {
        const mount = v as DockerVolumeMount
        const src = mount.source
        const target = mount.target

        if (mount.type === "tmpfs") {
          const size = mount.tmpfs?.size
          tmpfsMounts.push(size ? `${target}:size=${size}` : target)
          continue
        }

        if (mount.type === "volume" || this.isNamedVolume(project, src)) {
          const full = src ? `${project.name}_${src}` : undefined
          if (full) {
            const mode = mount.read_only ? "ro" : undefined
            const nocopy = mount.volume?.nocopy ? "nocopy" : undefined
            const opts = [mode, nocopy].filter(Boolean).join(",")
            binds.push(opts ? `${full}:${target}:${opts}` : `${full}:${target}`)
          }
        } else if (src) {
          const mode = mount.read_only ? "ro" : undefined
          const propagation = mount.bind?.propagation
          const opts = [mode, propagation].filter(Boolean).join(",")
          binds.push(opts ? `${src}:${target}:${opts}` : `${src}:${target}`)
        }
      }
    }

    return { binds, tmpfsMounts }
  }

  private parseShortPort(str: string, out: Record<string, any[]>) {
    let protocol = "tcp"
    const protoMatch = str.match(/\/(tcp|udp)$/i)
    if (protoMatch) {
      protocol = protoMatch[1].toLowerCase()
      str = str.replace(/\/(tcp|udp)$/i, "")
    }

    const parts = str.split(":")
    let hostIp: string | undefined
    let hostPort: string
    let containerPort: string

    if (parts.length === 3) {
      hostIp = parts[0]
      hostPort = parts[1]
      containerPort = parts[2]
    } else if (parts.length === 2) {
      hostPort = parts[0]
      containerPort = parts[1]
    } else {
      hostPort = ""
      containerPort = parts[0]
    }

    const addBinding = (c: string, h: string) => {
      const key = `${c}/${protocol}`
      if (!out[key]) out[key] = []
      out[key].push({
        HostIp: hostIp,
        HostPort: h || undefined,
      })
    }

    if (containerPort.includes("-")) {
      const [cStart, cEnd] = containerPort.split("-").map(Number)
      const [hStart] = hostPort.split("-").map(Number)

      for (let i = 0; i <= cEnd - cStart; i++) {
        addBinding(String(cStart + i), String(hStart + i))
      }
    } else {
      addBinding(containerPort, hostPort)
    }
  }

  private parseLongPort(p: DockerPortLong, out: Record<string, any[]>) {
    const target = String(p.target)
    const published = p.published ? String(p.published) : ""
    const protocol = (p.protocol ?? "tcp").toLowerCase()
    const hostIp = p.host_ip

    const key = `${target}/${protocol}`
    if (!out[key]) out[key] = []

    out[key].push({
      HostIp: hostIp,
      HostPort: published || undefined,
    })
  }

  private parsePorts(ports?: Array<string | DockerPortLong>) {
    if (!ports) return {}

    const out: Record<string, Array<{ HostIp?: string; HostPort?: string }>> = {}

    for (const p of ports) {
      if (typeof p === "string") {
        this.parseShortPort(p, out)
      } else {
        this.parseLongPort(p, out)
      }
    }

    return out
  }

  private buildExposedPorts(ports?: Array<string | DockerPortLong>) {
    if (!ports) return undefined

    const exposed: Record<string, any> = {} as Record<string, any>

    for (const p of ports) {
      if (typeof p === "string") {
        let s = p
        let protocol = "tcp"
        const protoMatch = s.match(/\/(tcp|udp)$/i)
        if (protoMatch) {
          protocol = protoMatch[1].toLowerCase()
          s = s.replace(/\/(tcp|udp)$/i, "")
        }

        const parts = s.split(":")
        let containerPort: string

        if (parts.length === 3) {
          containerPort = parts[2]
        } else if (parts.length === 2) {
          containerPort = parts[1]
        } else {
          containerPort = parts[0]
        }

        const add = (c: string) => {
          const key = `${c}/${protocol}`
          exposed[key] = {}
        }

        if (containerPort.includes("-")) {
          const [cStart, cEnd] = containerPort.split("-").map(Number)
          for (let i = 0; i <= cEnd - cStart; i++) {
            add(String(cStart + i))
          }
        } else {
          add(containerPort)
        }
      } else {
        const lp = p as DockerPortLong
        const protocol = (lp.protocol ?? "tcp").toLowerCase()
        const key = `${lp.target}/${protocol}`
        exposed[key] = {}
      }
    }

    return Object.keys(exposed).length ? exposed : undefined
  }

  private mapDeployResources(deploy: DockerDeploy | undefined, svc: DockerService) {
    let memory = svc.mem_limit
    let memoryReservation = svc.mem_reservation
    let nanoCpus = svc.cpus ? Math.floor(svc.cpus * 1e9) : undefined

    if (deploy?.resources?.limits?.memory && !memory) {
      memory = deploy.resources.limits.memory
    }

    if (deploy?.resources?.limits?.cpus && !nanoCpus) {
      const cpus = Number(deploy.resources.limits.cpus)
      if (!isNaN(cpus)) nanoCpus = Math.floor(cpus * 1e9)
    }

    if (deploy?.resources?.reservations?.memory && !memoryReservation) {
      memoryReservation = deploy.resources.reservations.memory
    }

    return { memory, memoryReservation, nanoCpus }
  }
}
