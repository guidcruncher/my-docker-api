// trafficSwitch.ts
export interface TrafficSwitchContext {
  projectName: string
  serviceName: string
  oldTarget?: string // container name or label
  newTarget: string // container name or label
}

export interface TrafficSwitchPlugin {
  name: string
  switchTraffic(ctx: TrafficSwitchContext): Promise<void>
}
