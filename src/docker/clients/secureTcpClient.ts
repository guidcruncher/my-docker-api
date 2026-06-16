import fs from "fs"
import https from "https"
import path from "path"

import { commonRequestHandler } from "./commonRequest"
import type { DockerRequestOptions, LocalClient } from "./localClient"

export class SecureTcpClient implements LocalClient {
  private agent: https.Agent

  constructor(
    private hostName: string,
    caPath: string,
    certPath: string,
    keyPath: string,
    private port = 2376,
  ) {
    this.agent = new https.Agent({
      ca: fs.readFileSync(path.resolve(caPath)),
      cert: fs.readFileSync(path.resolve(certPath)),
      key: fs.readFileSync(path.resolve(keyPath)),
      rejectUnauthorized: true,
    })
  }

  request<T>(options: DockerRequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = https.request(
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
