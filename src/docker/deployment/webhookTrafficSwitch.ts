// webhookTrafficSwitch.ts
import type { TrafficSwitchContext, TrafficSwitchPlugin } from "./trafficSwitch"

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
