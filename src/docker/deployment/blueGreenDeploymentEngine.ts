// blueGreenDeploymentEngine.ts
import { ComposeOrchestrator } from "../compose/orchestrator"
import { ComposeProject } from "../compose/project"
import type { TrafficSwitchPlugin } from "./trafficSwitch"

export interface BlueGreenOptions {
  service: string
  newImage: string
  blueName?: string // current
  greenName?: string // candidate
  trafficSwitch?: TrafficSwitchPlugin
  trafficTargetLabel?: string
}

export class BlueGreenDeploymentEngine {
  constructor(private orchestrator: ComposeOrchestrator) {}

  /**
   * Blue/Green:
   *  - Start green alongside blue
   *  - Wait healthy
   *  - Switch traffic
   *  - Stop & remove blue
   */
  async deployBlueGreen(project: ComposeProject, opts: BlueGreenOptions) {
    const {
      service,
      newImage,
      blueName = `${service}_blue`,
      greenName = `${service}_green`,
      trafficSwitch,
      trafficTargetLabel,
    } = opts

    const svc = project.file.services[service]
    if (!svc) throw new Error(`Service ${service} not found`)

    const docker = (this.orchestrator as any)["docker"]

    // 1. Ensure blue exists (optional: create if missing)
    const blueContainer = await this.findByName(docker, blueName)

    // 2. Create green
    const svcGreen = { ...svc, image: newImage }
    const greenConfig = (this.orchestrator as any)["buildContainerConfig"](
      project,
      svcGreen,
      greenName,
    )

    const createdGreen = await docker.createContainer(greenConfig)
    await docker.startContainer(createdGreen.Id)

    // 3. Wait for green healthy
    await (this.orchestrator as any)["waitForHealthy"](createdGreen.Id, greenName, project)

    // 4. Switch traffic
    if (trafficSwitch && trafficTargetLabel) {
      await trafficSwitch.switchTraffic({
        projectName: project.name,
        serviceName: service,
        oldTarget: blueName,
        newTarget: greenName,
      })
    }

    // 5. Stop & remove blue
    if (blueContainer) {
      await docker.stopContainer(blueContainer.Id)
      await docker.removeContainer(blueContainer.Id)
    }
  }

  private async findByName(docker: any, name: string) {
    const containers = await docker.listContainers(true)
    return containers.find((c: any) => c.Names?.some((n: string) => n.includes(name)))
  }
}
