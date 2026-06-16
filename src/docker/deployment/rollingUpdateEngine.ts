// rollingUpdateEngine.ts
import { ComposeOrchestrator } from "../compose/orchestrator"
import { ComposeProject } from "../compose/project"
import type { TrafficSwitchPlugin } from "./trafficSwitch"

export interface RollingUpdateOptions {
  service: string
  newImage: string
  replicas: number
  trafficSwitch?: TrafficSwitchPlugin
  // label or name used by LB to route traffic
  trafficTargetLabel?: string
}

export class RollingUpdateEngine {
  constructor(private orchestrator: ComposeOrchestrator) {}

  /**
   * Rolling update:
   *  - For each replica:
   *    - start new container
   *    - wait healthy
   *    - switch traffic (optional)
   *    - stop & remove one old container
   */
  async rollingUpdate(project: ComposeProject, opts: RollingUpdateOptions) {
    const { service, newImage, replicas, trafficSwitch, trafficTargetLabel } = opts

    for (let i = 0; i < replicas; i++) {
      const newName = `${service}_new_${Date.now()}_${i}`

      // 1. Build config for new container
      const svc = project.file.services[service]
      if (!svc) throw new Error(`Service ${service} not found`)

      const svcWithNewImage = { ...svc, image: newImage }
      const containerConfig = (this.orchestrator as any)["buildContainerConfig"](
        project,
        svcWithNewImage,
        newName,
      )

      // 2. Create + start new container
      const docker = (this.orchestrator as any)["docker"]
      const created = await docker.createContainer(containerConfig)
      await docker.startContainer(created.Id)

      // 3. Wait for healthy
      await (this.orchestrator as any)["waitForHealthy"](created.Id, newName, project)

      // 4. Switch traffic (if plugin provided)
      if (trafficSwitch && trafficTargetLabel) {
        await trafficSwitch.switchTraffic({
          projectName: project.name,
          serviceName: service,
          oldTarget: trafficTargetLabel,
          newTarget: newName,
        })
      }

      // 5. Stop & remove one old container
      const old = await this.findOneOldInstance(docker, project, service, newName)
      if (old) {
        await docker.stopContainer(old.Id)
        await docker.removeContainer(old.Id)
      }
    }
  }

  private async findOneOldInstance(
    docker: any,
    project: ComposeProject,
    service: string,
    excludeName: string,
  ) {
    const containers = await docker.listContainers(true)
    const prefix = `${project.name}_${service}`

    return containers.find(
      (c: any) =>
        c.Names?.some((n: string) => n.includes(prefix)) &&
        !c.Names?.some((n: string) => n.includes(excludeName)),
    )
  }
}
