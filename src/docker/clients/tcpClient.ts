import http from "http"

import { commonRequestHandler } from "./commonRequest"
import type { DockerRequestOptions, LocalClient } from "./localClient"

export class TcpClient implements LocalClient {
  private agent = new http.Agent()

  constructor(
    private hostName: string,
    private port = 2375,
  ) {}

  request<T>(options: DockerRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: this.hostName,
          port: this.port,
          path: options.path,
          method: options.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
          },
          agent: this.agent,
        },
        (res) => resolve(commonRequestHandler<T>(res, options)),
      )

      req.on("error", reject)
      if (options.body) req.write(JSON.stringify(options.body))
      req.end()
    })
  }
}
