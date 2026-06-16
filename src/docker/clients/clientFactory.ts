import * as fs from "fs"
import * as path from "path"

import type { LocalClient } from "./localClient"
import { SecureTcpClient } from "./secureTcpClient"
import { SocketClient } from "./socketClient"
import { TcpClient } from "./tcpClient"

export class ClientFactory {
  /**
   * Create a LocalClient based on explicit type or Docker-style environment variables.
   */
  static create(type?: string, opts: any = {}): LocalClient {
    // 1. Explicit type always wins
    if (type) return this.fromExplicitType(type, opts)

    // 2. Auto-detect from environment (Docker CLI semantics)
    const envClient = this.fromEnvironment()
    if (envClient) return envClient

    // 3. Default to Unix socket
    return new SocketClient("/var/run/docker.sock")
  }

  // -------------------------------
  // Explicit type selection
  // -------------------------------
  private static fromExplicitType(type: string, opts: any): LocalClient {
    switch (type) {
      case "socket":
        return new SocketClient(opts?.path ?? "/var/run/docker.sock")

      case "tcp":
        return new TcpClient(opts?.host, opts?.port ?? 2375)

      case "securetcp":
        this.ensureTlsFiles(opts)
        return new SecureTcpClient(
          opts.host,
          opts.caPath,
          opts.certPath,
          opts.keyPath,
          opts.port ?? 2376,
        )

      default:
        throw new Error(`Unknown client type: ${type}`)
    }
  }

  // -------------------------------
  // Docker CLI-style environment detection
  // -------------------------------
  private static fromEnvironment(): LocalClient | null {
    const host = process.env.DOCKER_HOST
    const tlsVerify = process.env.DOCKER_TLS_VERIFY === "1"
    const certPath = process.env.DOCKER_CERT_PATH

    if (!host) return null

    // unix:///var/run/docker.sock
    if (host.startsWith("unix://")) {
      return new SocketClient(host.replace("unix://", ""))
    }

    // tcp://host:2375
    if (host.startsWith("tcp://") && !tlsVerify) {
      const { hostname, port } = this.parseTcpUrl(host)
      return new TcpClient(hostname, port)
    }

    // https://host:2376 (TLS)
    if (tlsVerify) {
      if (!certPath) {
        throw new Error("DOCKER_TLS_VERIFY=1 but DOCKER_CERT_PATH is not set")
      }

      const ca = path.join(certPath, "ca.pem")
      const cert = path.join(certPath, "cert.pem")
      const key = path.join(certPath, "key.pem")

      this.ensureTlsFiles({ caPath: ca, certPath: cert, keyPath: key })

      const { hostname, port } = this.parseTcpUrl(host)
      return new SecureTcpClient(hostname, ca, cert, key, port ?? 2376)
    }

    throw new Error(`Unsupported DOCKER_HOST format: ${host}`)
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  private static parseTcpUrl(url: string): { hostname: string; port: number } {
    const stripped = url.replace("tcp://", "").replace("https://", "")
    const [hostname, portStr] = stripped.split(":")
    const port = portStr ? Number(portStr) : 2375
    return { hostname, port }
  }

  private static ensureTlsFiles(opts: any) {
    const required = ["caPath", "certPath", "keyPath"]
    for (const key of required) {
      if (!opts[key]) throw new Error(`Missing TLS option: ${key}`)
      if (!fs.existsSync(opts[key])) {
        throw new Error(`TLS file not found: ${opts[key]}`)
      }
    }
  }
}
