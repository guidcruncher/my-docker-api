// caddyTrafficSwitch.ts
import type { TrafficSwitchContext, TrafficSwitchPlugin } from "./trafficSwitch"

export interface CaddyTrafficSwitchOptions {
  adminUrl: string // e.g. http://localhost:2019
  upstreamPath: string // e.g. /config/apps/http/servers/srv0/routes/0/handle/0/handler/reverse_proxy/upstreams
  containerPort?: number // default: 80
}

export class CaddyTrafficSwitch implements TrafficSwitchPlugin {
  name = "caddy"

  constructor(private opts: CaddyTrafficSwitchOptions) {}

  async switchTraffic(ctx: TrafficSwitchContext): Promise<void> {
    const { adminUrl, upstreamPath, containerPort = 80 } = this.opts
    const { newTarget } = ctx

    // Caddy upstream format
    const newUpstream = {
      dial: `${newTarget}:${containerPort}`,
    }

    // 1. Fetch current upstream list
    // const current = await fetch(`${adminUrl}${upstreamPath}`).then((r) => r.json())

    // 2. Replace upstreams with the new target
    const updated = [newUpstream]

    // 3. Push updated upstream list back to Caddy
    const res = await fetch(`${adminUrl}${upstreamPath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })

    if (!res.ok) {
      throw new Error(`Caddy update failed: ${res.status} ${await res.text()}`)
    }

    console.log(`[caddy] switched traffic → ${newTarget} for ${ctx.projectName}/${ctx.serviceName}`)
  }
}
