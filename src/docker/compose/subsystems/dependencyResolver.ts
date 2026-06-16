import type { DockerService } from "../types-docker"

export class DependencyResolver {
  resolveOrder(services: Record<string, DockerService>): string[] {
    const visited = new Set<string>()
    const order: string[] = []

    const visit = (name: string) => {
      if (visited.has(name)) return
      visited.add(name)

      const deps = this.getDependencies(services[name])
      for (const d of deps) visit(d)

      order.push(name)
    }

    for (const name of Object.keys(services)) visit(name)

    return order
  }

  getDependencies(svc: DockerService): string[] {
    if (!svc.depends_on) return []

    if (Array.isArray(svc.depends_on)) return svc.depends_on

    return Object.keys(svc.depends_on)
  }

  getConditions(svc: DockerService): Record<string, "service_started" | "service_healthy"> {
    if (!svc.depends_on) return {}

    if (Array.isArray(svc.depends_on)) {
      return Object.fromEntries(svc.depends_on.map((d) => [d, "service_started"]))
    }

    const out: Record<string, "service_started" | "service_healthy"> = {}

    for (const [dep, cfg] of Object.entries(svc.depends_on)) {
      out[dep] = (cfg as any).condition ?? "service_started"
    }

    return out
  }
}
