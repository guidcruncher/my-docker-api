import { CaddyTrafficSwitch } from "../src/docker/deployment/caddyTrafficSwitch"
import type { TrafficSwitchContext } from "../src/docker/deployment/trafficSwitch"

global.fetch = jest.fn()

describe("CaddyTrafficSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("updates upstreams and switches traffic", async () => {
    const plugin = new CaddyTrafficSwitch({
      adminUrl: "http://localhost:2019",
      upstreamPath: "/config/apps/http/servers/srv0/routes/0/handle/0/upstreams",
      containerPort: 8080,
    })

    // Your plugin only performs a PUT, so we mock a single call.
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => ({}),
      text: () => "",
    })

    const ctx: TrafficSwitchContext = {
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: "api_new_123",
    }

    await plugin.switchTraffic(ctx)

    // Only one call is expected — the PUT
    expect(fetch).toHaveBeenCalledTimes(1)

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:2019/config/apps/http/servers/srv0/routes/0/handle/0/upstreams",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ dial: "api_new_123:8080" }]),
      }),
    )
  })
})
