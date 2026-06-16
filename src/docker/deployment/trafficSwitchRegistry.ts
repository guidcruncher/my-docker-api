import type { TrafficSwitchPlugin } from "./trafficSwitch"

export class TrafficSwitchRegistry {
  private plugins = new Map<string, TrafficSwitchPlugin>()

  register(plugin: TrafficSwitchPlugin) {
    this.plugins.set(plugin.name, plugin)
  }

  get(name: string): TrafficSwitchPlugin | undefined {
    return this.plugins.get(name)
  }
}
