import http from "http"

import { commonRequestHandler } from "./commonRequest"
import type { DockerRequestOptions, LocalClient } from "./localClient"

export class SocketClient implements LocalClient {
  constructor(private socketPath = "/var/run/docker.sock") {}

  request<T>(options: DockerRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          socketPath: this.socketPath,
          path: options.path,
          method: options.method ?? "GET",
          headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
          },
        },
        (res) => resolve(commonRequestHandler<T>(res, options)),
      )

      req.on("error", reject)
      if (options.body) req.write(JSON.stringify(options.body))
      req.end()
    })
  }
}
