import { RollingUpdateEngine } from "../src/docker/deployment/rollingUpdateEngine"
import { ComposeProject } from "../src/docker/compose/project"
import { TrafficSwitchPlugin } from "../src/docker/deployment/trafficSwitch"

class MockOrchestrator {
  docker = {
    createContainer: jest.fn(),
    startContainer: jest.fn(),
    stopContainer: jest.fn(),
    removeContainer: jest.fn(),
    listContainers: jest.fn(),
  }

  waitForHealthy = jest.fn()
  buildContainerConfig = jest.fn((project, svc, name) => ({ name, Image: svc.image }))
}

class MockTrafficSwitch implements TrafficSwitchPlugin {
  name = "mock"
  switchTraffic = jest.fn()
}

describe("RollingUpdateEngine", () => {
  let orchestrator: any
  let engine: RollingUpdateEngine
  let project: ComposeProject
  let traffic: MockTrafficSwitch

  beforeEach(() => {
    orchestrator = new MockOrchestrator()
    engine = new RollingUpdateEngine(orchestrator)
    traffic = new MockTrafficSwitch()

    project = new ComposeProject("myapp", {
      services: {
        api: { image: "old:1.0" },
      },
    })
  })

  test("performs rolling update with traffic switching", async () => {
    orchestrator.docker.listContainers.mockResolvedValue([{ Id: "old1", Names: ["/myapp_api_1"] }])

    orchestrator.docker.createContainer.mockResolvedValue({ Id: "new1" })

    await engine.rollingUpdate(project, {
      service: "api",
      newImage: "new:2.0",
      replicas: 1,
      trafficSwitch: traffic,
      trafficTargetLabel: "api",
    })

    expect(orchestrator.docker.createContainer).toHaveBeenCalledTimes(1)
    expect(orchestrator.docker.startContainer).toHaveBeenCalledWith("new1")
    expect(orchestrator.waitForHealthy).toHaveBeenCalled()

    expect(traffic.switchTraffic).toHaveBeenCalledWith({
      projectName: "myapp",
      serviceName: "api",
      oldTarget: "api",
      newTarget: expect.stringContaining("api_new_"),
    })

    expect(orchestrator.docker.stopContainer).toHaveBeenCalledWith("old1")
    expect(orchestrator.docker.removeContainer).toHaveBeenCalledWith("old1")
  })
})
