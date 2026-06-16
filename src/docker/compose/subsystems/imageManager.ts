import type { DockerDaemonClient } from "../../dockerDaemonClient"
import type { ComposeProject } from "../project"
import type { DockerService } from "../types-docker"

export class ImageManager {
  constructor(private docker: DockerDaemonClient) {}

  async ensureImage(_project: ComposeProject, _name: string, svc: DockerService) {
    if (!svc.image) return

    const [img, tag] = svc.image.split(":")
    await this.docker.pullImage(img, tag)
  }
}
