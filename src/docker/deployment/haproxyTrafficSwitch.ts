// haproxyTrafficSwitch.ts
import { exec } from "child_process"
import { promises as fs } from "fs"

import type { TrafficSwitchContext, TrafficSwitchPlugin } from "./trafficSwitch"

export interface HAProxyTrafficSwitchOptions {
  backendFile: string // e.g. /etc/haproxy/backends/api.cfg
  backendName: string // e.g. api_backend
  containerPort?: number // default: 80
  reloadCommand?: string // default: "systemctl reload haproxy"
}

export class HAProxyTrafficSwitch implements TrafficSwitchPlugin {
  name = "haproxy"

  constructor(private opts: HAProxyTrafficSwitchOptions) {}

  async switchTraffic(ctx: TrafficSwitchContext): Promise<void> {
    const {
      backendFile,
      backendName,
      containerPort = 80,
      reloadCommand = "systemctl reload haproxy",
    } = this.opts

    const { newTarget } = ctx

    const newConfig = `
backend ${backendName}
    mode http
    balance roundrobin
    server active ${newTarget}:${containerPort} check
`

    // 1. Write backend config
    await fs.writeFile(backendFile, newConfig.trim() + "\n")

    // 2. Reload HAProxy
    await new Promise((resolve, reject) => {
      exec(reloadCommand, (err) => {
        if (err) reject(err)
        else resolve(null)
      })
    })

    console.log(`[haproxy] switched backend ${backendName} → ${newTarget}`)
  }
}
