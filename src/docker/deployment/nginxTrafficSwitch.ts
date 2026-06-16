// nginxTrafficSwitch.ts
import { exec } from "child_process"
import { promises as fs } from "fs"

import type { TrafficSwitchContext, TrafficSwitchPlugin } from "./trafficSwitch"

export interface NginxTrafficSwitchOptions {
  upstreamFile: string // e.g. /etc/nginx/conf.d/upstream.conf
  upstreamName: string // e.g. backend
  containerPort?: number // default: 80
  reloadCommand?: string // default: "nginx -s reload"
}

export class NginxTrafficSwitch implements TrafficSwitchPlugin {
  name = "nginx"

  constructor(private opts: NginxTrafficSwitchOptions) {}

  async switchTraffic(ctx: TrafficSwitchContext): Promise<void> {
    const {
      upstreamFile,
      upstreamName,
      containerPort = 80,
      reloadCommand = "nginx -s reload",
    } = this.opts

    const { newTarget } = ctx

    const newConfig = `
upstream ${upstreamName} {
    server ${newTarget}:${containerPort};
}
`

    // 1. Write upstream file
    await fs.writeFile(upstreamFile, newConfig.trim() + "\n")

    // 2. Reload nginx
    await new Promise((resolve, reject) => {
      exec(reloadCommand, (err) => {
        if (err) reject(err)
        else resolve(null)
      })
    })

    console.log(`[nginx] switched upstream ${upstreamName} → ${newTarget}`)
  }
}
