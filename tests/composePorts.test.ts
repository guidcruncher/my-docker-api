import { ContainerFactory } from "../src/docker/compose/subsystems/containerFactory"
import { DockerDaemonClient } from "../src/docker/dockerDaemonClient"

// Minimal mocks for dependencies
const docker = {} as unknown as DockerDaemonClient
const env = { buildEnv: () => ({}) } as any
const networks = {} as any
const secrets = {} as any
const configs = {} as any
const health = {} as any

const factory = new ContainerFactory(docker, env, networks, secrets, configs, health)

// Expose private method for testing
const parsePorts = (ports: any) => (factory as any).parsePorts(ports)

describe("Port Parsing", () => {
  test("parses simple short syntax (TCP default)", () => {
    const out = parsePorts(["8080:80"])
    expect(out).toEqual({
      "80/tcp": [{ HostPort: "8080" }],
    })
  })

  test("parses short syntax with UDP", () => {
    const out = parsePorts(["8080:80/udp"])
    expect(out).toEqual({
      "80/udp": [{ HostPort: "8080" }],
    })
  })

  test("parses short syntax with host IP", () => {
    const out = parsePorts(["127.0.0.1:8080:80"])
    expect(out).toEqual({
      "80/tcp": [{ HostIp: "127.0.0.1", HostPort: "8080" }],
    })
  })

  test("parses short syntax with host IP + UDP", () => {
    const out = parsePorts(["127.0.0.1:8080:80/udp"])
    expect(out).toEqual({
      "80/udp": [{ HostIp: "127.0.0.1", HostPort: "8080" }],
    })
  })

  test("parses port ranges", () => {
    const out = parsePorts(["8000-8002:9000-9002"])
    expect(out).toEqual({
      "9000/tcp": [{ HostPort: "8000" }],
      "9001/tcp": [{ HostPort: "8001" }],
      "9002/tcp": [{ HostPort: "8002" }],
    })
  })

  test("parses long syntax (TCP)", () => {
    const out = parsePorts([
      {
        target: 80,
        published: 8080,
        protocol: "tcp",
        host_ip: "0.0.0.0",
      },
    ])

    expect(out).toEqual({
      "80/tcp": [{ HostIp: "0.0.0.0", HostPort: "8080" }],
    })
  })

  test("parses long syntax (UDP)", () => {
    const out = parsePorts([
      {
        target: 53,
        published: 5353,
        protocol: "udp",
      },
    ])

    expect(out).toEqual({
      "53/udp": [{ HostPort: "5353" }],
    })
  })

  test("supports multiple bindings for same container port", () => {
    const out = parsePorts(["8080:80", "8081:80/udp"])

    expect(out).toEqual({
      "80/tcp": [{ HostPort: "8080" }],
      "80/udp": [{ HostPort: "8081" }],
    })
  })

  test("supports container-only port (no host binding)", () => {
    const out = parsePorts(["80"])
    expect(out).toEqual({
      "80/tcp": [{ HostPort: undefined }],
    })
  })

  test("supports mixed protocols on same port", () => {
    const out = parsePorts(["53:53/tcp", "53:53/udp"])

    expect(out).toEqual({
      "53/tcp": [{ HostPort: "53" }],
      "53/udp": [{ HostPort: "53" }],
    })
  })
})
