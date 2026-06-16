import { ClientFactory } from "../clients/clientFactory"
import { DockerDaemonClient } from "../dockerDaemonClient"
import { ComposeProject } from "./project"
import { ConfigManager } from "./subsystems/configManager"
import { ContainerFactory } from "./subsystems/containerFactory"
import { DependencyResolver } from "./subsystems/dependencyResolver"
import { EnvManager } from "./subsystems/envManager"
import { HealthcheckManager } from "./subsystems/healthcheckManager"
import { ImageManager } from "./subsystems/imageManager"
import { NetworkManager } from "./subsystems/networkManager"
import { SecretManager } from "./subsystems/secretManager"
import { VolumeManager } from "./subsystems/volumeManager"
import type { DockerService } from "./types-docker"

export class ComposeOrchestrator {
  private docker = new DockerDaemonClient(ClientFactory.create())

  private networks = new NetworkManager(this.docker)
  private volumes = new VolumeManager(this.docker)
  private secrets = new SecretManager(this.docker)
  private configs = new ConfigManager(this.docker)
  private images = new ImageManager(this.docker)
  private env = new EnvManager()
  private deps = new DependencyResolver()
  private health = new HealthcheckManager(this.docker)
  private containers = new ContainerFactory(
    this.docker,
    this.env,
    this.networks,
    this.secrets,
    this.configs,
    this.health,
  )

  // Track running containers for depends_on conditions
  private runningContainers: Record<string, string> = {}

  // -----------------------------------------------------
  // UP
  // -----------------------------------------------------
  async up(project: ComposeProject) {
    const { services, networks, volumes, secrets, configs } = project.file

    const filtered = this.filterByProfiles(services, project.activeProfiles)

    await this.networks.ensureAll(project, networks)
    await this.volumes.ensureAll(project, volumes)
    await this.secrets.ensureAll(project, secrets)
    await this.configs.ensureAll(project, configs)

    const order = this.deps.resolveOrder(filtered)

    for (const name of order) {
      const svc = filtered[name]

      // ---------------------------------------------
      // depends_on: condition: service_healthy
      // ---------------------------------------------
      const conditions = this.deps.getConditions(svc)

      for (const [dep, cond] of Object.entries(conditions)) {
        if (cond === "service_started") {
          await this.waitForContainerStarted(project, dep)
        } else if (cond === "service_healthy") {
          const depId = this.runningContainers[dep]
          if (!depId) throw new Error(`Dependency ${dep} has no container`)
          await this.health.waitForHealthy(depId, dep, project)
        }
      }

      project.emit("service:create", { service: name })

      if (svc.image) {
        await this.images.ensureImage(project, name, svc)
      }

      const containerId = await this.containers.createContainer(project, name, svc)
      this.runningContainers[name] = containerId

      project.emit("service:start", { service: name, containerId })

      await this.docker.startContainer(containerId)

      await this.health.waitForHealthy(containerId, name, project)
    }
  }

  // -----------------------------------------------------
  // DOWN
  // -----------------------------------------------------
  async down(project: ComposeProject) {
    const containers = await this.ps(project)

    for (const c of containers) {
      project.emit("service:stop", { service: c.Names[0], containerId: c.Id })
      await this.docker.stopContainer(c.Id)
      await this.docker.removeContainer(c.Id)
      project.emit("service:remove", { service: c.Names[0], containerId: c.Id })
    }

    await this.networks.removeAll(project)
    await this.volumes.removeAll(project)
    await this.secrets.removeAll(project)
    await this.configs.removeAll(project)
  }

  // -----------------------------------------------------
  // LOGS
  // -----------------------------------------------------
  async logs(project: ComposeProject, service: string) {
    const containers = await this.ps(project)
    const match = containers.find((c) => c.Names.some((n) => n.includes(service)))
    if (!match) throw new Error(`Service ${service} not running`)

    return this.docker.logs(match.Id, true, true, true)
  }

  // -----------------------------------------------------
  // PS
  // -----------------------------------------------------
  async ps(project: ComposeProject) {
    const all = await this.docker.listContainers(true)
    return all.filter((c) => c.Names.some((n) => n.includes(project.name)))
  }

  // -----------------------------------------------------
  // PROFILES
  // -----------------------------------------------------
  private filterByProfiles(services: Record<string, DockerService>, active: string[]) {
    if (active.length === 0) return services

    const out: Record<string, DockerService> = {}

    for (const [name, svc] of Object.entries(services)) {
      if (!svc.profiles || svc.profiles.length === 0) {
        out[name] = svc
        continue
      }
      if (svc.profiles.some((p) => active.includes(p))) {
        out[name] = svc
      }
    }

    return out
  }

  // -----------------------------------------------------
  // depends_on: service_started helper
  // -----------------------------------------------------
  protected async waitForContainerStarted(project: ComposeProject, service: string) {
    while (true) {
      const containers = await this.ps(project)
      const match = containers.find((c) => c.Names.some((n) => n.includes(service)))
      if (match) {
        const inspect = await this.docker.inspectContainer(match.Id)
        if (inspect.State?.Running) return
      }
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  // -----------------------------------------------------
  // TEST-COMPAT PROXIES
  // -----------------------------------------------------
  protected buildEnv(env?: Record<string, string> | string[]) {
    return this.env.buildEnv(env)
  }

  protected resolveOrder(services: Record<string, DockerService>) {
    return this.deps.resolveOrder(services)
  }

  protected async waitForHealthy(containerId: string, service: string, project: ComposeProject) {
    return this.health.waitForHealthy(containerId, service, project)
  }
}
