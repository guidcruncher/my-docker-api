// tests/__mocks__/localClient.ts
import { Readable } from "stream"
import type { LocalClient, DockerRequestOptions } from "../../src/docker/clients/localClient"

export class MockLocalClient implements LocalClient {
  public calls: DockerRequestOptions[] = []
  public nextResponse: any = null
  public nextStream: Readable | null = null
  public nextError: Error | null = null

  async request<T>(options: DockerRequestOptions): Promise<T> {
    this.calls.push(options)

    if (this.nextError) throw this.nextError

    if (options.stream || this.nextStream) {
      return this.nextStream as unknown as T
    }

    return this.nextResponse as T
  }
}
