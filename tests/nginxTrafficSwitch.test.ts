import { NginxTrafficSwitch } from "../src/docker/deployment/nginxTrafficSwitch"
import { TrafficSwitchContext } from "../src/docker/deployment/trafficSwitch"

jest.mock("fs", () => ({
  promises: { writeFile: jest.fn() },
}))

jest.mock("child_process", () => ({
  exec: jest.fn((cmd, cb) => cb(null)),
}))

const fs = require("fs").promises
const { exec } = require("child_process")

describe("NginxTrafficSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("writes upstream file and reloads nginx", async () => {
    const plugin = new NginxTrafficSwitch({
      upstreamFile: "/etc/nginx/conf.d/api_upstream.conf",
      upstreamName: "api_backend",
      containerPort: 8080,
      reloadCommand: "nginx -s reload",
    })

    const ctx: TrafficSwitchContext = {
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: "api_new_123",
    }

    await plugin.switchTraffic(ctx)

    expect(fs.writeFile).toHaveBeenCalledWith(
      "/etc/nginx/conf.d/api_upstream.conf",
      expect.stringContaining("server api_new_123:8080;"),
    )

    expect(exec).toHaveBeenCalledWith("nginx -s reload", expect.any(Function))
  })
})
