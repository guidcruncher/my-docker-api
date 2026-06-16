import { HAProxyTrafficSwitch } from "../src/docker/deployment/haproxyTrafficSwitch"
import { TrafficSwitchContext } from "../src/docker/deployment/trafficSwitch"

jest.mock("fs", () => ({
  promises: { writeFile: jest.fn() },
}))

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, cb) => cb(null)),
}))

const fs = require("fs").promises
const { exec } = require("child_process")

describe("HAProxyTrafficSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("writes backend config and reloads haproxy", async () => {
    const plugin = new HAProxyTrafficSwitch({
      backendFile: "/etc/haproxy/backends/api.cfg",
      backendName: "api_backend",
      containerPort: 8080,
      reloadCommand: "systemctl reload haproxy",
    })

    const ctx: TrafficSwitchContext = {
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: "api_new_123",
    }

    await plugin.switchTraffic(ctx)

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/etc/haproxy/backends/api.cfg",
      expect.stringContaining("server active api_new_123:8080 check"),
    )

    expect(exec).toHaveBeenCalledWith("systemctl reload haproxy", expect.any(Function))
  })
})
