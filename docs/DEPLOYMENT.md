# Deployment Engine Documentation

This document describes the deployment layer built on top of `ComposeOrchestrator` and `ComposeProject`:

- **RollingUpdateEngine** – rolling updates with zero downtime
- **BlueGreenDeploymentEngine** – blue/green deployments
- **TrafficSwitchPlugin** – pluggable traffic switching
- **Webhook / Nginx / HAProxy / Caddy traffic switchers**

---

## 1\. Traffic Switch Plugin System

### 1.1 Interfaces

```ts
export interface TrafficSwitchContext {
  projectName: string
  serviceName: string
  oldTarget?: string
  newTarget: string
}

export interface TrafficSwitchPlugin {
  name: string
  switchTraffic(ctx: TrafficSwitchContext): Promise<void>
}

export class TrafficSwitchRegistry {
  private plugins = new Map<string, TrafficSwitchPlugin>()

  register(plugin: TrafficSwitchPlugin) {
    this.plugins.set(plugin.name, plugin)
  }

  get(name: string): TrafficSwitchPlugin | undefined {
    return this.plugins.get(name)
  }
}
```

### 1.2 WebhookTrafficSwitch External

Sends a POST request to an external system that performs the traffic switch.

```ts
export interface WebhookTrafficSwitchOptions {
  url: string
  headers?: Record<string, string>
}

export class WebhookTrafficSwitch implements TrafficSwitchPlugin {
  name = "webhook"

  constructor(private opts: WebhookTrafficSwitchOptions) {}

  async switchTraffic(ctx: TrafficSwitchContext): Promise<void> {
    const res = await fetch(this.opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.opts.headers ?? {}),
      },
      body: JSON.stringify({
        projectName: ctx.projectName,
        serviceName: ctx.serviceName,
        oldTarget: ctx.oldTarget,
        newTarget: ctx.newTarget,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Webhook failed: ${res.status} ${text}`)
    }

    console.log(
      `[webhook] traffic switch sent → ${ctx.newTarget} for ${ctx.projectName}/${ctx.serviceName}`,
    )
  }
}
```

### 1.3 Example: Registering plugins

```ts
const registry = new TrafficSwitchRegistry()

registry.register(
  new WebhookTrafficSwitch({
    url: "https://deploy.example.com/traffic-switch",
    headers: { "X-API-Key": "secret123" },
  }),
)

const trafficSwitch = registry.get("webhook")!
```

---

## 2\. RollingUpdateEngine

### 2.1 Class

```ts
export interface RollingUpdateOptions {
  service: string
  newImage: string
  replicas: number
  trafficSwitch?: TrafficSwitchPlugin
  trafficTargetLabel?: string
}

export class RollingUpdateEngine {
  constructor(private orchestrator: ComposeOrchestrator) {}

  async rollingUpdate(project: ComposeProject, opts: RollingUpdateOptions) {
    const { service, newImage, replicas, trafficSwitch, trafficTargetLabel } = opts

    for (let i = 0; i < replicas; i++) {
      const newName = `${service}_new_${Date.now()}_${i}`

      const svc = project.file.services[service]
      if (!svc) throw new Error(`Service ${service} not found`)

      const svcWithNewImage = { ...svc, image: newImage }
      const containerConfig = (this.orchestrator as any)["buildContainerConfig"](
        project,
        svcWithNewImage,
        newName,
      )

      const docker = (this.orchestrator as any)["docker"]
      const created = await docker.createContainer(containerConfig)
      await docker.startContainer(created.Id)

      await (this.orchestrator as any)["waitForHealthy"](created.Id, newName, project)

      if (trafficSwitch && trafficTargetLabel) {
        await trafficSwitch.switchTraffic({
          projectName: project.name,
          serviceName: service,
          oldTarget: trafficTargetLabel,
          newTarget: newName,
        })
      }

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
```

### 2.2 Example: Rolling update with webhook switch

```ts
const orchestrator = new ComposeOrchestrator()
const project = new ComposeProject("myapp", composeFile)

const registry = new TrafficSwitchRegistry()
registry.register(
  new WebhookTrafficSwitch({
    url: "https://deploy.example.com/traffic-switch",
    headers: { "X-API-Key": "secret123" },
  }),
)

const trafficSwitch = registry.get("webhook")!
const rolling = new RollingUpdateEngine(orchestrator)

await rolling.rollingUpdate(project, {
  service: "api",
  newImage: "myorg/api:2.0.0",
  replicas: 3,
  trafficSwitch,
  trafficTargetLabel: "api",
})
```

---

## 3\. BlueGreenDeploymentEngine

### 3.1 Class

```ts
export interface BlueGreenOptions {
  service: string
  newImage: string
  blueName?: string
  greenName?: string
  trafficSwitch?: TrafficSwitchPlugin
  trafficTargetLabel?: string
}

export class BlueGreenDeploymentEngine {
  constructor(private orchestrator: ComposeOrchestrator) {}

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

    const blueContainer = await this.findByName(docker, blueName)

    const svcGreen = { ...svc, image: newImage }
    const greenConfig = (this.orchestrator as any)["buildContainerConfig"](
      project,
      svcGreen,
      greenName,
    )

    const createdGreen = await docker.createContainer(greenConfig)
    await docker.startContainer(createdGreen.Id)

    await (this.orchestrator as any)["waitForHealthy"](createdGreen.Id, greenName, project)

    if (trafficSwitch && trafficTargetLabel) {
      await trafficSwitch.switchTraffic({
        projectName: project.name,
        serviceName: service,
        oldTarget: blueName,
        newTarget: greenName,
      })
    }

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
```

### 3.2 Example: Blue/green with webhook switch

```ts
const blueGreen = new BlueGreenDeploymentEngine(orchestrator)
const trafficSwitch = registry.get("webhook")!

await blueGreen.deployBlueGreen(project, {
  service: "web",
  newImage: "myorg/web:2.0.0",
  blueName: "web_blue",
  greenName: "web_green",
  trafficSwitch,
  trafficTargetLabel: "web",
})
```

---

## 4\. Full Example

```ts
import { ComposeOrchestrator } from "./compose/orchestrator"
import { ComposeProject } from "./compose/project"
import { RollingUpdateEngine } from "./deployment/rollingUpdateEngine"
import { BlueGreenDeploymentEngine } from "./deployment/blueGreenDeploymentEngine"
import { TrafficSwitchRegistry } from "./deployment/trafficSwitchRegistry"
import { NginxTrafficSwitch } from "./deployment/nginxTrafficSwitch"

// Load your compose file however you normally do
const project = new ComposeProject("myapp", composeFile)

const orchestrator = new ComposeOrchestrator()

// Register traffic switch plugins
const registry = new TrafficSwitchRegistry()

registry.register(
  new NginxTrafficSwitch({
    upstreamFile: "/etc/nginx/conf.d/api_upstream.conf",
    upstreamName: "api_backend",
    containerPort: 8080,
    reloadCommand: "nginx -s reload",
  }),
)

const trafficSwitch = registry.get("nginx")!

// Deployment engines
const rolling = new RollingUpdateEngine(orchestrator)
const blueGreen = new BlueGreenDeploymentEngine(orchestrator)

// Rolling update
await rolling.rollingUpdate(project, {
  service: "api",
  newImage: "myorg/api:2.0.0",
  replicas: 3,
  trafficSwitch,
  trafficTargetLabel: "api",
})

// Blue/green deployment
await blueGreen.deployBlueGreen(project, {
  service: "web",
  newImage: "myorg/web:2.0.0",
  blueName: "web_blue",
  greenName: "web_green",
  trafficSwitch,
  trafficTargetLabel: "web",
})
```

## 5\. Summary

- **RollingUpdateEngine** – stepwise replacement of instances with health checks and optional traffic switching.
- **BlueGreenDeploymentEngine** – parallel blue/green stacks with controlled traffic cutover.
- **TrafficSwitchPlugin** – abstraction for how traffic is switched (webhook, Nginx, HAProxy, Caddy, etc.).
- **WebhookTrafficSwitch** – sends a JSON payload to an external system to perform the actual switch.
