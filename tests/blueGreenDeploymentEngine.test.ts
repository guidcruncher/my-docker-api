import { BlueGreenDeploymentEngine } from "../src/docker/deployment/blueGreenDeploymentEngine"
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

describe("BlueGreenDeploymentEngine", () => {
  let orchestrator: any
  let engine: BlueGreenDeploymentEngine
  let project: ComposeProject
  let traffic: MockTrafficSwitch

  beforeEach(() => {
    orchestrator = new MockOrchestrator()
    engine = new BlueGreenDeploymentEngine(orchestrator)
    traffic = new MockTrafficSwitch()

    project = new ComposeProject("myapp", {
      services: {
        web: { image: "old:1.0" },
      },
    })
  })

  test("deploys green, switches traffic, removes blue", async () => {
    orchestrator.docker.listContainers.mockResolvedValue([{ Id: "blue1", Names: ["/web_blue"] }])

    orchestrator.docker.createContainer.mockResolvedValue({ Id: "green1" })

    await engine.deployBlueGreen(project, {
      service: "web",
      newImage: "new:2.0",
      blueName: "web_blue",
      greenName: "web_green",
      trafficSwitch: traffic,
      trafficTargetLabel: "web",
    })

    expect(orchestrator.docker.createContainer).toHaveBeenCalled()
    expect(orchestrator.docker.startContainer).toHaveBeenCalledWith("green1")
    expect(orchestrator.waitForHealthy).toHaveBeenCalled()

    expect(traffic.switchTraffic).toHaveBeenCalledWith({
      projectName: "myapp",
      serviceName: "web",
      oldTarget: "web_blue",
      newTarget: "web_green",
    })

    expect(orchestrator.docker.stopContainer).toHaveBeenCalledWith("blue1")
    expect(orchestrator.docker.removeContainer).toHaveBeenCalledWith("blue1")
  })
})
