import { RegistryClient } from "../src/docker/registryClient"
import type { LocalClient, DockerRequestOptions } from "../src/docker/clients/localClient"

class MockLocalClient implements LocalClient {
  calls: DockerRequestOptions[] = []
  nextResponse: any = null

  async request<T>(opts: DockerRequestOptions): Promise<T> {
    this.calls.push(opts)
    return this.nextResponse as T
  }
}

describe("RegistryClient", () => {
  let mock: MockLocalClient
  let client: RegistryClient

  beforeEach(() => {
    mock = new MockLocalClient()
    client = new RegistryClient(mock)
  })

  test("getToken returns token", async () => {
    mock.nextResponse = { token: "abc123" }

    const token = await client.getToken("/token?scope=x")
    expect(token).toBe("abc123")

    expect(mock.calls[0].path).toBe("/token?scope=x")
  })

  test("getManifestList sends correct headers", async () => {
    mock.nextResponse = { schemaVersion: 2, manifests: [] }

    const res = await client.getManifestList("https://registry", "repo/name", "latest", "TOKEN")

    expect(res.manifests).toEqual([])
    const call = mock.calls[0]

    expect(call.headers?.Authorization).toBe("Bearer TOKEN")
    expect(call.path).toBe("https://registry/v2/repo/name/manifests/latest")
  })
})
