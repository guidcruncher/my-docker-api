// tests/webhookTrafficSwitch.test.ts
import { WebhookTrafficSwitch } from "../src/docker/deployment/webhookTrafficSwitch"
import { TrafficSwitchContext } from "../src/docker/deployment/trafficSwitch"

global.fetch = jest.fn()

describe("WebhookTrafficSwitch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("sends correct POST payload to webhook", async () => {
    const plugin = new WebhookTrafficSwitch({
      url: "https://example.com/switch",
      headers: { Authorization: "Bearer token123" },
    })

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    })

    const ctx: TrafficSwitchContext = {
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: "api_new_123",
    }

    await plugin.switchTraffic(ctx)

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/switch",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token123",
        },
        body: JSON.stringify({
          projectName: "myapp",
          serviceName: "api",
          oldTarget: "api",
          newTarget: "api_new_123",
        }),
      }),
    )
  })

  test("throws error when webhook returns non-OK", async () => {
    const plugin = new WebhookTrafficSwitch({
      url: "https://example.com/switch",
    })

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("server error"),
    })

    const ctx: TrafficSwitchContext = {
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: "api_new_123",
    }

    await expect(plugin.switchTraffic(ctx)).rejects.toThrow("Webhook failed: 500 server error")
  })
})
