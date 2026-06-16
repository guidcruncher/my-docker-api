// tests/compose/orchestrator.test.ts
import { ComposeOrchestrator } from "../src/docker/compose/orchestrator"
import { ComposeProject } from "../src/docker/compose/project"

jest.mock("fs", () => ({
  readFileSync: jest.fn().mockReturnValue("dummy"),
}))

jest.mock("../src/docker/dockerDaemonClient", () => {
  return {
    DockerDaemonClient: jest.fn().mockImplementation(() => ({
      // network
      networkInspect: jest.fn().mockRejectedValue(new Error("not found")),
      networkCreate: jest.fn().mockResolvedValue({}),
      networkRemove: jest.fn().mockResolvedValue({}),

      // volume
      volumeInspect: jest.fn().mockRejectedValue(new Error("not found")),
      volumeCreate: jest.fn().mockResolvedValue({}),
      volumeRemove: jest.fn().mockResolvedValue({}),

      // secrets
      secretInspect: jest.fn().mockRejectedValue(new Error("not found")),
      secretCreate: jest.fn().mockResolvedValue({}),
      secretRemove: jest.fn().mockResolvedValue({}),

      // configs
      configInspect: jest.fn().mockRejectedValue(new Error("not found")),
      configCreate: jest.fn().mockResolvedValue({}),
      configRemove: jest.fn().mockResolvedValue({}),

      // containers
      listContainers: jest.fn().mockResolvedValue([]),
      inspectContainer: jest.fn().mockResolvedValue({
        State: { Health: { Status: "healthy" } },
      }),
      createContainer: jest.fn().mockResolvedValue({ Id: "abc123" }),
      startContainer: jest.fn().mockResolvedValue({}),
      stopContainer: jest.fn().mockResolvedValue({}),
      removeContainer: jest.fn().mockResolvedValue({}),

      // images
      pullImage: jest.fn().mockResolvedValue({}),

      // logs
      logs: jest.fn().mockResolvedValue({}),
    })),
  }
})

describe("ComposeOrchestrator", () => {
  test("creates networks, volumes, secrets, configs and starts services", async () => {
    const orchestrator = new ComposeOrchestrator()

    const project = new ComposeProject("demo", {
      services: {
        web: { image: "nginx" },
      },
      networks: { net1: {} },
      volumes: { vol1: {} },
      secrets: { secret1: { file: "test.txt" } },
      configs: { cfg1: { file: "test.cfg" } },
    })

    await orchestrator.up(project)

    const docker = orchestrator["docker"]

    expect(docker.networkCreate).toHaveBeenCalled()
    expect(docker.volumeCreate).toHaveBeenCalled()
    expect(docker.secretCreate).toHaveBeenCalled()
    expect(docker.configCreate).toHaveBeenCalled()
    expect(docker.createContainer).toHaveBeenCalled()
    expect(docker.startContainer).toHaveBeenCalled()
  })
})

describe("environment normalization", () => {
  const orchestrator = new ComposeOrchestrator()

  test("converts array env to KEY=value", () => {
    process.env.TEST = "123"
    const env = orchestrator["buildEnv"](["TEST"])
    expect(env).toEqual(["TEST=123"])
  })

  test("keeps KEY=value pairs intact", () => {
    const env = orchestrator["buildEnv"](["A=1", "B=2"])
    expect(env).toEqual(["A=1", "B=2"])
  })

  test("converts map env to KEY=value", () => {
    const env = orchestrator["buildEnv"]({ A: "1", B: "2" })
    expect(env).toEqual(["A=1", "B=2"])
  })
})

describe("dependency ordering", () => {
  const orchestrator = new ComposeOrchestrator()

  test("orders services based on depends_on", () => {
    const order = orchestrator["resolveOrder"]({
      db: {},
      api: { depends_on: ["db"] },
      web: { depends_on: ["api"] },
    })

    expect(order).toEqual(["db", "api", "web"])
  })
})

describe("healthcheck wait", () => {
  test("waits until container is healthy", async () => {
    const orchestrator = new ComposeOrchestrator()
    const docker = orchestrator["docker"]

    docker.inspectContainer = jest
      .fn()
      .mockResolvedValueOnce({ State: { Health: { Status: "starting" } } })
      .mockResolvedValueOnce({ State: { Health: { Status: "healthy" } } })

    const fakeProject = { emit: jest.fn() } as any

    await orchestrator["waitForHealthy"]("abc", "web", fakeProject)

    expect(docker.inspectContainer).toHaveBeenCalledTimes(2)
  })
})

describe("profiles", () => {
  const orchestrator = new ComposeOrchestrator()

  test("filters services by active profiles", () => {
    const filtered = orchestrator["filterByProfiles"](
      {
        web: { profiles: ["prod"] },
        debug: { profiles: ["dev"] },
        db: {},
      },
      ["dev"],
    )

    expect(Object.keys(filtered)).toEqual(["debug", "db"])
  })
})
