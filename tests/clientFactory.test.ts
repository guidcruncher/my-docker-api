// tests/clientFactory.test.ts
import { ClientFactory } from "../src/docker/clients/clientFactory"
import { SocketClient } from "../src/docker/clients/socketClient"
import { TcpClient } from "../src/docker/clients/tcpClient"
import { SecureTcpClient } from "../src/docker/clients/secureTcpClient"
import fs from "fs"

jest.mock("fs")

describe("ClientFactory", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    delete process.env.DOCKER_HOST
    delete process.env.DOCKER_TLS_VERIFY
    delete process.env.DOCKER_CERT_PATH
  })

  test("explicit type: socket", () => {
    const client = ClientFactory.create("socket", { path: "/x.sock" })
    expect(client).toBeInstanceOf(SocketClient)
  })

  test("explicit type: tcp", () => {
    const client = ClientFactory.create("tcp", { host: "1.2.3.4", port: 9999 })
    expect(client).toBeInstanceOf(TcpClient)
  })

  test("explicit type: securetcp", () => {
    ;(fs.existsSync as jest.Mock).mockReturnValue(true)

    const client = ClientFactory.create("securetcp", {
      host: "host",
      caPath: "/ca",
      certPath: "/cert",
      keyPath: "/key",
    })

    expect(client).toBeInstanceOf(SecureTcpClient)
  })

  test("env: unix socket", () => {
    process.env.DOCKER_HOST = "unix:///var/run/docker.sock"

    const client = ClientFactory.create()
    expect(client).toBeInstanceOf(SocketClient)
  })

  test("env: tcp without TLS", () => {
    process.env.DOCKER_HOST = "tcp://1.2.3.4:2375"

    const client = ClientFactory.create()
    expect(client).toBeInstanceOf(TcpClient)
  })

  test("env: TLS requires certs", () => {
    process.env.DOCKER_HOST = "tcp://1.2.3.4:2376"
    process.env.DOCKER_TLS_VERIFY = "1"
    process.env.DOCKER_CERT_PATH = "/certs"
    ;(fs.existsSync as jest.Mock).mockReturnValue(false)

    expect(() => ClientFactory.create()).toThrow("TLS file not found")
  })

  test("default: unix socket", () => {
    const client = ClientFactory.create()
    expect(client).toBeInstanceOf(SocketClient)
  })
})
