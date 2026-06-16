import { EventEmitter } from "node:events"

import { ComposeOrchestrator } from "./orchestrator"
import type {
  DockerComposeFile,
  DockerConfig,
  DockerNetwork,
  DockerSecret,
  DockerService,
  DockerVolume,
} from "./types-docker"

export class ComposeProject extends EventEmitter {
  name: string
  services: Record<string, DockerService>
  networks: Record<string, DockerNetwork>
  volumes: Record<string, DockerVolume>
  secrets: Record<string, DockerSecret>
  configs: Record<string, DockerConfig>
  activeProfiles: string[]
  file: DockerComposeFile
  orchestrator: ComposeOrchestrator

  constructor(
    name: string,
    file: DockerComposeFile,
    activeProfiles: string[] = [],
    orchestrator = new ComposeOrchestrator(),
  ) {
    super()

    this.name = name
    this.file = file
    this.activeProfiles = activeProfiles
    this.orchestrator = orchestrator

    this.services = file.services
    this.networks = file.networks ?? {}
    this.volumes = file.volumes ?? {}
    this.secrets = file.secrets ?? {}
    this.configs = file.configs ?? {}
  }

  async up() {
    await this.orchestrator.up(this)
  }

  async down() {
    await this.orchestrator.down(this)
  }

  async logs(service: string) {
    return this.orchestrator.logs(this, service)
  }

  async ps() {
    return this.orchestrator.ps(this)
  }
}
