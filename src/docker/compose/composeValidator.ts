import type {
  DockerConfig,
  DockerNetwork,
  DockerSecret,
  DockerService,
  DockerVolume,
} from "./types-docker"

export type Severity = "error" | "warning"

export interface ValidationIssue {
  path: string // e.g. "services.app.ports[0]"
  message: string
  severity: Severity
}

export interface ServiceValidation {
  service: string
  issues: ValidationIssue[]
}

export interface ComposeValidationResult {
  services: ServiceValidation[]
  global: ValidationIssue[]
  isValid: boolean
}

const VALID_DEPENDS_CONDITIONS = new Set([
  "service_started",
  "service_healthy",
  "service_completed_successfully",
])

export class ComposeValidator {
  static validate(model: {
    services: Record<string, DockerService>
    networks: Record<string, DockerNetwork>
    volumes: Record<string, DockerVolume>
    secrets: Record<string, DockerSecret>
    configs: Record<string, DockerConfig>
  }): ComposeValidationResult {
    const serviceResults: ServiceValidation[] = []
    const globalIssues: ValidationIssue[] = []

    const serviceNames = new Set(Object.keys(model.services))
    const networkNames = new Set(Object.keys(model.networks))
    const volumeNames = new Set(Object.keys(model.volumes))
    const secretNames = new Set(Object.keys(model.secrets))
    const configNames = new Set(Object.keys(model.configs))

    for (const [name, svc] of Object.entries(model.services)) {
      const issues: ValidationIssue[] = []

      this.validateServiceBasics(name, svc, issues)
      this.validateServicePorts(name, svc, issues)
      this.validateServiceNetworks(name, svc, networkNames, issues)
      this.validateServiceVolumes(name, svc, volumeNames, issues)
      this.validateServiceSecrets(name, svc, secretNames, issues)
      this.validateServiceConfigs(name, svc, configNames, issues)
      this.validateServiceDependsOn(name, svc, serviceNames, issues)
      this.validateServiceEnv(name, svc, issues)
      this.validateServiceHealthcheck(name, svc, issues)

      serviceResults.push({ service: name, issues })
    }

    const isValid =
      globalIssues.length === 0 &&
      serviceResults.every((s) => s.issues.every((i) => i.severity !== "error"))

    return {
      services: serviceResults,
      global: globalIssues,
      isValid,
    }
  }

  private static push(
    issues: ValidationIssue[],
    path: string,
    message: string,
    severity: Severity = "error",
  ) {
    issues.push({ path, message, severity })
  }

  private static validateServiceBasics(
    name: string,
    svc: DockerService,
    issues: ValidationIssue[],
  ) {
    const hasImage = !!svc.image
    const hasBuild = !!svc.build

    if (!hasImage && !hasBuild) {
      this.push(issues, `services.${name}`, "Service should define either 'image' or 'build'.")
    }
  }

  private static validateServicePorts(name: string, svc: DockerService, issues: ValidationIssue[]) {
    if (!svc.ports) return

    svc.ports.forEach((p: any, idx: number) => {
      if (typeof p !== "string") return

      // very simple check: "host:container" or "host:container/proto"
      const base = p.split("/")[0]
      const parts = base.split(":")

      if (parts.length !== 2) {
        this.push(
          issues,
          `services.${name}.ports[${idx}]`,
          `Port "${p}" should be in "host:container" format.`,
        )
        return
      }

      const [host, container] = parts
      const hostNum = Number(host)
      const contNum = Number(container)

      if (!Number.isInteger(hostNum) || hostNum <= 0 || hostNum > 65535) {
        this.push(
          issues,
          `services.${name}.ports[${idx}]`,
          `Host port "${host}" is not a valid TCP/UDP port.`,
        )
      }

      if (!Number.isInteger(contNum) || contNum <= 0 || contNum > 65535) {
        this.push(
          issues,
          `services.${name}.ports[${idx}]`,
          `Container port "${container}" is not a valid TCP/UDP port.`,
        )
      }
    })
  }

  private static validateServiceNetworks(
    name: string,
    svc: DockerService,
    networkNames: Set<string>,
    issues: ValidationIssue[],
  ) {
    if (!svc.networks) return

    if (Array.isArray(svc.networks)) {
      svc.networks.forEach((n: any, idx: number) => {
        const net = String(n)
        if (!networkNames.has(net)) {
          this.push(
            issues,
            `services.${name}.networks[${idx}]`,
            `Network "${net}" is not defined in top-level networks.`,
          )
        }
      })
    } else if (typeof svc.networks === "object") {
      Object.keys(svc.networks).forEach((net) => {
        if (!networkNames.has(net)) {
          this.push(
            issues,
            `services.${name}.networks.${net}`,
            `Network "${net}" is not defined in top-level networks.`,
          )
        }
      })
    }
  }

  private static validateServiceVolumes(
    name: string,
    svc: DockerService,
    volumeNames: Set<string>,
    issues: ValidationIssue[],
  ) {
    if (!svc.volumes) return

    svc.volumes.forEach((m: any, idx: number) => {
      if (typeof m === "string") {
        // shorthand: "source:target"
        const [source] = m.split(":")
        if (source && !source.startsWith(".") && !source.startsWith("/")) {
          if (!volumeNames.has(source)) {
            this.push(
              issues,
              `services.${name}.volumes[${idx}]`,
              `Volume "${source}" is not defined in top-level volumes.`,
            )
          }
        }
      } else if (m && typeof m === "object") {
        if (m.type === "volume" && m.source) {
          if (!volumeNames.has(m.source)) {
            this.push(
              issues,
              `services.${name}.volumes[${idx}].source`,
              `Volume "${m.source}" is not defined in top-level volumes.`,
            )
          }
        }
      }
    })
  }

  private static validateServiceSecrets(
    name: string,
    svc: DockerService,
    secretNames: Set<string>,
    issues: ValidationIssue[],
  ) {
    if (!svc.secrets) return

    svc.secrets.forEach((m: any, idx: number) => {
      if (typeof m === "string") {
        if (!secretNames.has(m)) {
          this.push(
            issues,
            `services.${name}.secrets[${idx}]`,
            `Secret "${m}" is not defined in top-level secrets.`,
          )
        }
      } else if (m && typeof m === "object" && m.source) {
        if (!secretNames.has(m.source)) {
          this.push(
            issues,
            `services.${name}.secrets[${idx}].source`,
            `Secret "${m.source}" is not defined in top-level secrets.`,
          )
        }
      }
    })
  }

  private static validateServiceConfigs(
    name: string,
    svc: DockerService,
    configNames: Set<string>,
    issues: ValidationIssue[],
  ) {
    if (!svc.configs) return

    svc.configs.forEach((m: any, idx: number) => {
      if (typeof m === "string") {
        if (!configNames.has(m)) {
          this.push(
            issues,
            `services.${name}.configs[${idx}]`,
            `Config "${m}" is not defined in top-level configs.`,
          )
        }
      } else if (m && typeof m === "object" && m.source) {
        if (!configNames.has(m.source)) {
          this.push(
            issues,
            `services.${name}.configs[${idx}].source`,
            `Config "${m.source}" is not defined in top-level configs.`,
          )
        }
      }
    })
  }

  private static validateServiceDependsOn(
    name: string,
    svc: DockerService,
    serviceNames: Set<string>,
    issues: ValidationIssue[],
  ) {
    const dep = (svc as any).depends_on
    if (!dep) return

    if (Array.isArray(dep)) {
      dep.forEach((s: any, idx: number) => {
        const target = String(s)
        if (!serviceNames.has(target)) {
          this.push(
            issues,
            `services.${name}.depends_on[${idx}]`,
            `Service "${target}" is not defined.`,
          )
        }
      })
    } else if (typeof dep === "object") {
      for (const [target, cfg] of Object.entries<any>(dep)) {
        if (!serviceNames.has(target)) {
          this.push(
            issues,
            `services.${name}.depends_on.${target}`,
            `Service "${target}" is not defined.`,
          )
        }
        const cond = cfg?.condition
        if (cond && !VALID_DEPENDS_CONDITIONS.has(cond)) {
          this.push(
            issues,
            `services.${name}.depends_on.${target}.condition`,
            `Invalid depends_on condition "${cond}".`,
            "warning",
          )
        }
      }
    }
  }

  private static validateServiceEnv(name: string, svc: DockerService, issues: ValidationIssue[]) {
    if (!svc.environment) return

    for (const key of Object.keys(svc.environment)) {
      if (!key.match(/^[A-Z0-9_]+$/)) {
        this.push(
          issues,
          `services.${name}.environment.${key}`,
          `Environment key "${key}" should be UPPER_SNAKE_CASE.`,
          "warning",
        )
      }
    }
  }

  private static validateServiceHealthcheck(
    name: string,
    svc: DockerService,
    issues: ValidationIssue[],
  ) {
    const hc: any = (svc as any).healthcheck
    if (!hc) return

    if (!hc.test) {
      this.push(
        issues,
        `services.${name}.healthcheck`,
        "Healthcheck is defined but 'test' is missing.",
      )
    }

    const fields = ["interval", "timeout", "start_period"]
    for (const f of fields) {
      if (hc[f] && typeof hc[f] === "string") {
        if (!hc[f].match(/^\d+(ms|s|m|h)$/)) {
          this.push(
            issues,
            `services.${name}.healthcheck.${f}`,
            `Healthcheck ${f} "${hc[f]}" should be a duration like '5s', '1m', '500ms'.`,
            "warning",
          )
        }
      }
    }

    if (hc.retries != null) {
      const r = Number(hc.retries)
      if (!Number.isInteger(r) || r < 0) {
        this.push(
          issues,
          `services.${name}.healthcheck.retries`,
          `Healthcheck retries "${hc.retries}" should be a non-negative integer.`,
        )
      }
    }
  }
}
