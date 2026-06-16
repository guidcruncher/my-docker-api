import { ResilientClient } from "../src/docker/clients/resilientClient"
import type { LocalClient, DockerRequestOptions } from "../src/docker/clients/localClient"

class MockClient implements LocalClient {
  calls = 0
  nextError: Error | null = null
  nextResponse: any = null

  async request<T>(opts: DockerRequestOptions): Promise<T> {
    this.calls++
    if (this.nextError) throw this.nextError
    return this.nextResponse as T
  }
}

describe("ResilientClient", () => {
  test("retries on failure", async () => {
    const inner = new MockClient()
    inner.nextError = new Error("fail")

    const client = new ResilientClient(inner, { retries: 2 })

    await expect(client.request({ path: "/x" })).rejects.toThrow("fail")
    expect(inner.calls).toBe(3)
  })

  test("success resets circuit breaker", async () => {
    const inner = new MockClient()
    const client = new ResilientClient(inner, {
      circuitBreakerFailures: 1,
      circuitBreakerResetMs: 100,
    })

    // First call fails → breaker opens
    inner.nextError = new Error("boom")
    await expect(client.request({ path: "/x" })).rejects.toThrow()

    // Wait for breaker to close
    await new Promise((r) => setTimeout(r, 110))

    // Now success should work
    inner.nextError = null
    inner.nextResponse = { ok: true }

    const res = await client.request<{ ok: boolean }>({ path: "/x" })
    expect(res.ok).toBe(true)
  })

  test("circuit breaker opens after threshold", async () => {
    const inner = new MockClient()
    const client = new ResilientClient(inner, {
      circuitBreakerFailures: 2,
      circuitBreakerResetMs: 5000,
    })

    inner.nextError = new Error("fail")

    await expect(client.request({ path: "/x" })).rejects.toThrow()
    await expect(client.request({ path: "/x" })).rejects.toThrow()

    await expect(client.request({ path: "/x" })).rejects.toThrow(
      "Circuit breaker is OPEN — refusing requests",
    )
  })
})
