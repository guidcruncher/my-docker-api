// tests/dockerDaemonClient.test.ts
import { DockerDaemonClient } from "../src/docker/dockerDaemonClient"
import { MockLocalClient } from "./__mocks__/localClient"
import { Readable } from "stream"
import { DockerMultiplexedStream } from "../src/docker/streams/dockerMultiplexedStream"

describe("DockerDaemonClient", () => {
  let mock: MockLocalClient
  let docker: DockerDaemonClient

  beforeEach(() => {
    mock = new MockLocalClient()
    docker = new DockerDaemonClient(mock, "v1.54")
  })

  const expectCall = (method: string, path: string) => {
    expect(mock.calls[0].method).toBe(method)
    expect(mock.calls[0].path).toBe(path)
  }

  // -------------------------------------------------------------
  // BASIC ENDPOINTS
  // -------------------------------------------------------------
  test("version() calls correct endpoint", async () => {
    mock.nextResponse = { Version: "1.54" }

    const res = await docker.version()

    expect(res.Version).toBe("1.54")
    expect(mock.calls[0].path).toBe("/v1.54/version")
  })

  test("listContainers() returns typed list", async () => {
    mock.nextResponse = [{ Id: "abc", Image: "alpine" }]

    const res = await docker.listContainers()

    expect(res[0].Id).toBe("abc")
    expect(mock.calls[0].path).toBe("/v1.54/containers/json?all=1")
  })

  // -------------------------------------------------------------
  // NEW: CONTAINER MISSING ENDPOINTS
  // -------------------------------------------------------------
  test("pauseContainer() calls correct endpoint", async () => {
    await docker.pauseContainer("abc")
    expectCall("POST", "/v1.54/containers/abc/pause")
  })

  test("unpauseContainer() calls correct endpoint", async () => {
    await docker.unpauseContainer("abc")
    expectCall("POST", "/v1.54/containers/abc/unpause")
  })

  test("killContainer() calls correct endpoint", async () => {
    await docker.killContainer("abc", "SIGTERM")
    expectCall("POST", "/v1.54/containers/abc/kill?signal=SIGTERM")
  })

  test("resizeContainerTTY() calls correct endpoint", async () => {
    await docker.resizeContainerTTY("abc", 40, 120)
    expectCall("POST", "/v1.54/containers/abc/resize?h=40&w=120")
  })

  test("updateContainer() sends correct body", async () => {
    const cfg = { CpuShares: 512, Memory: 1024 }
    await docker.updateContainer("abc", cfg)

    expect(mock.calls[0].path).toBe("/v1.54/containers/abc/update")
    expect(mock.calls[0].method).toBe("POST")
    expect(mock.calls[0].body).toEqual(cfg)
  })

  test("topContainer() calls correct endpoint", async () => {
    await docker.topContainer("abc", "-aux")
    expectCall("GET", "/v1.54/containers/abc/top?ps_args=-aux")
  })

  test("waitContainer() calls correct endpoint", async () => {
    await docker.waitContainer("abc", "next-exit")
    expectCall("POST", "/v1.54/containers/abc/wait?condition=next-exit")
  })

  test("statContainerArchive() calls correct HEAD endpoint", async () => {
    await docker.statContainerArchive("abc", "/var/www")
    expectCall("HEAD", "/v1.54/containers/abc/archive?path=%2Fvar%2Fwww")
  })

  // -------------------------------------------------------------
  // EXEC (raw)
  // -------------------------------------------------------------
  test("startExec() returns raw stream", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const res = await docker.startExec("exec123", { AttachStdout: true })

    expect(res).toBe(stream)
    expect(mock.calls[0].path).toBe("/v1.54/exec/exec123/start")
  })

  // -------------------------------------------------------------
  // EXEC (multiplexed)
  // -------------------------------------------------------------
  test("startExecMultiplexed() wraps stream in DockerMultiplexedStream", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const mux = await docker.startExecMultiplexed("exec123", {
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    })

    expect(mux).toBeInstanceOf(DockerMultiplexedStream)
    expect(mock.calls[0].path).toBe("/v1.54/exec/exec123/start")
  })

  // -------------------------------------------------------------
  // ATTACH (raw)
  // -------------------------------------------------------------
  test("attachContainer() returns raw stream when tty=true", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const res = await docker.attachContainer("abc", { tty: true })

    expect(res).toBe(stream)
    expect(mock.calls[0].path).toContain("/v1.54/containers/abc/attach")
  })

  // -------------------------------------------------------------
  // ATTACH (multiplexed)
  // -------------------------------------------------------------
  test("attachContainer() returns multiplexed stream when tty=false", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const mux = await docker.attachContainer("abc", {
      stdout: true,
      stderr: true,
      tty: false,
    })

    expect(mux).toBeInstanceOf(DockerMultiplexedStream)
    expect(mock.calls[0].path).toContain("/v1.54/containers/abc/attach")
  })

  // -------------------------------------------------------------
  // NEW: NETWORK MISSING ENDPOINTS
  // -------------------------------------------------------------
  test("listNetworks() calls correct endpoint", async () => {
    await docker.listNetworks({ name: ["backend"] })

    expect(mock.calls[0].path).toBe(
      `/v1.54/networks?filters=${encodeURIComponent(JSON.stringify({ name: ["backend"] }))}`,
    )
  })

  test("connectNetwork() sends correct body", async () => {
    const cfg = { Container: "abc", EndpointConfig: { Aliases: ["api"] } }
    await docker.connectNetwork("net1", cfg)

    expect(mock.calls[0].path).toBe("/v1.54/networks/net1/connect")
    expect(mock.calls[0].method).toBe("POST")
    expect(mock.calls[0].body).toEqual(cfg)
  })

  test("disconnectNetwork() sends correct body", async () => {
    const cfg = { Container: "abc", Force: true }
    await docker.disconnectNetwork("net1", cfg)

    expect(mock.calls[0].path).toBe("/v1.54/networks/net1/disconnect")
    expect(mock.calls[0].method).toBe("POST")
    expect(mock.calls[0].body).toEqual(cfg)
  })

  // -------------------------------------------------------------
  // NEW: VOLUME MISSING ENDPOINTS
  // -------------------------------------------------------------
  test("listVolumes() calls correct endpoint", async () => {
    await docker.listVolumes({ driver: ["local"] })

    expect(mock.calls[0].path).toBe(
      `/v1.54/volumes?filters=${encodeURIComponent(JSON.stringify({ driver: ["local"] }))}`,
    )
  })

  // -------------------------------------------------------------
  // PRUNE ENDPOINTS
  // -------------------------------------------------------------
  test("containerPrune() calls correct endpoint", async () => {
    await docker.containerPrune({ label: ["x"] })

    expect(mock.calls[0].path).toBe(
      "/v1.54/containers/prune?filters=%7B%22label%22%3A%5B%22x%22%5D%7D",
    )
  })

  test("imagePrune() calls correct endpoint", async () => {
    await docker.imagePrune()

    expect(mock.calls[0].path).toBe("/v1.54/images/prune")
  })

  test("networkPrune() calls correct endpoint", async () => {
    await docker.networkPrune()

    expect(mock.calls[0].path).toBe("/v1.54/networks/prune")
  })

  test("volumePrune() calls correct endpoint", async () => {
    await docker.volumePrune()

    expect(mock.calls[0].path).toBe("/v1.54/volumes/prune")
  })

  test("buildCachePrune() calls correct endpoint", async () => {
    await docker.buildCachePrune()

    expect(mock.calls[0].path).toBe("/v1.54/build/prune")
  })

  // -------------------------------------------------------------
  // BUILD
  // -------------------------------------------------------------
  test("buildImage() sends tar stream and correct headers", async () => {
    const tar = new Readable({ read() {} })
    mock.nextStream = tar

    await docker.buildImage(tar, { t: "myimg:latest" })

    expect(mock.calls[0].path).toBe("/v1.54/build?t=myimg%3Alatest")
    expect(mock.calls[0].method).toBe("POST")
    expect(mock.calls[0].headers?.["Content-Type"]).toBe("application/x-tar")
    expect(mock.calls[0].body).toBe(tar)
    expect(mock.calls[0].stream).toBe(true)
  })

  // -------------------------------------------------------------
  // COMMIT
  // -------------------------------------------------------------
  test("commitContainer() calls correct endpoint", async () => {
    await docker.commitContainer("abc", {
      repo: "myimg",
      tag: "v1",
      comment: "test",
      author: "john",
      pause: true,
      changes: ["CMD echo hi"],
    })

    expect(mock.calls[0].path).toContain("/v1.54/commit?container=abc")
    expect(mock.calls[0].method).toBe("POST")
  })

  // -------------------------------------------------------------
  // EXPORT / IMPORT / SAVE / LOAD
  // -------------------------------------------------------------
  test("exportContainer() streams correct endpoint", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const res = await docker.exportContainer("abc")

    expect(res).toBe(stream)
    expect(mock.calls[0].path).toBe("/v1.54/containers/abc/export")
    expect(mock.calls[0].stream).toBe(true)
  })

  test("importImage() uploads tar", async () => {
    const tar = new Readable({ read() {} })
    mock.nextStream = tar

    await docker.importImage(tar)

    expect(mock.calls[0].path).toBe("/v1.54/images/load")
    expect(mock.calls[0].method).toBe("POST")
    expect(mock.calls[0].headers?.["Content-Type"]).toBe("application/x-tar")
    expect(mock.calls[0].body).toBe(tar)
  })

  test("saveImages() streams correct endpoint", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const res = await docker.saveImages(["nginx", "redis"])

    expect(res).toBe(stream)
    expect(mock.calls[0].path).toBe("/v1.54/images/get?names=nginx&names=redis")
    expect(mock.calls[0].stream).toBe(true)
  })

  // -------------------------------------------------------------
  // ARCHIVE
  // -------------------------------------------------------------
  test("getContainerArchive() streams correct endpoint", async () => {
    const stream = new Readable({ read() {} })
    mock.nextStream = stream

    const res = await docker.getContainerArchive("abc", "/etc")

    expect(res).toBe(stream)
    expect(mock.calls[0].path).toBe("/v1.54/containers/abc/archive?path=%2Fetc")
    expect(mock.calls[0].stream).toBe(true)
  })

  test("putContainerArchive() uploads tar", async () => {
    const tar = new Readable({ read() {} })
    mock.nextStream = tar

    await docker.putContainerArchive("abc", "/etc", tar)

    expect(mock.calls[0].path).toBe("/v1.54/containers/abc/archive?path=%2Fetc")
    expect(mock.calls[0].method).toBe("PUT")
    expect(mock.calls[0].headers?.["Content-Type"]).toBe("application/x-tar")
    expect(mock.calls[0].body).toBe(tar)
  })

  // -------------------------------------------------------------
  // SYSTEM DF
  // -------------------------------------------------------------
  test("systemDf() calls correct endpoint", async () => {
    await docker.systemDf()

    expect(mock.calls[0].path).toBe("/v1.54/system/df")
    expect(mock.calls[0].method).toBe("GET")
  })
})
