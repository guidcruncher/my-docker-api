import type { DockerDaemonClient } from "../../dockerDaemonClient"
import { parseDurationToSeconds } from "../../utils/durationToSeconds"
import type { ComposeProject } from "../project"

export class HealthcheckManager {
  constructor(private docker: DockerDaemonClient) {}

  mapHealthcheck(hc: any) {
    if (!hc) return undefined

    const toNs = (v?: string) => {
      if (!v) return undefined
      const sec = parseDurationToSeconds(v)
      return sec * 1_000_000_000
    }

    return {
      Test: Array.isArray(hc.test) ? hc.test : ["CMD-SHELL", hc.test],
      Interval: toNs(hc.interval),
      Timeout: toNs(hc.timeout),
      Retries: hc.retries,
      StartPeriod: toNs(hc.start_period),
    }
  }

  async waitForHealthy(containerId: string, service: string, project: ComposeProject) {
    while (true) {
      const inspect = await this.docker.inspectContainer(containerId)
      const state: any = inspect.State
      const health = state?.Health

      if (!health) {
        project.emit("service:healthy", { service })
        return
      }

      if (health.Status === "healthy") {
        project.emit("service:healthy", { service })
        return
      }

      if (health.Status === "unhealthy") {
        project.emit("service:unhealthy", { service })
        throw new Error(`Service ${service} failed healthcheck`)
      }

      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}
