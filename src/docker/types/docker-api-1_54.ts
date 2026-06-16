// docker-api-1_54.ts

export interface SystemVersion {
  Version: string
  ApiVersion: string
  MinAPIVersion: string
  GitCommit: string
  GoVersion: string
  Os: string
  Arch: string
  KernelVersion: string
  BuildTime: string
}

export interface SystemInfo {
  ID: string
  Containers: number
  ContainersRunning: number
  ContainersPaused: number
  ContainersStopped: number
  Images: number
  Driver: string
  LoggingDriver: string
  CgroupDriver: string
  KernelVersion: string
  OperatingSystem: string
  OSType: string
  Architecture: string
  NCPU: number
  MemTotal: number
  ServerVersion: string
}

export interface ContainerSummaryResponse {
  Id: string
  Names: string[]
  Image: string
  ImageID: string
  Command: string
  Created: number
  State: string
  Status: string
}

export interface ContainerInspectResponse {
  Id: string
  Name: string
  Path: string
  Args: string[]
  State: {
    Status: string
    Running: boolean
    Paused: boolean
    Restarting: boolean
    OOMKilled: boolean
    Dead: boolean
    ExitCode: number
    Error: string
    StartedAt: string
    FinishedAt: string
  }
  Config: {
    Hostname: string
    Env: string[]
    Cmd: string[] | null
    Image: string
  }
}

export interface ContainerCreateResponse {
  Id: string
  Warnings?: string[] | null
}

export interface ImageSummary {
  Id: string
  RepoTags?: string[] | null
  Size: number
  VirtualSize: number
}

export interface ImageInspectResponse {
  Id: string
  RepoTags?: string[] | null
  RepoDigests?: string[] | null
  Created: string
  Size: number
  Architecture: string
  Os: string
  OsVersion?: string | null
  Variant?: string | null
  RootFS?: {
    Type?: string
    Layers?: string[]
  }
  Config?: {
    User?: string
    Env?: string[]
    Cmd?: string[]
    Entrypoint?: string[]
    WorkingDir?: string
    Labels?: Record<string, string>
  }
  GraphDriver?: {
    Name: string
    Data: Record<string, string>
  }
  VirtualSize?: number
  Author?: string
  Comment?: string
}

export interface ExecCreateResponse {
  Id: string
}

export interface EventMessage {
  Type: string
  Action: string
  Actor: {
    ID: string
    Attributes: Record<string, string>
  }
  time: number
  timeNano: number
}

export interface ContainerStatsResponse {
  read: string
  pids_stats: { current: number }
  cpu_stats: Record<string, unknown>
  memory_stats: Record<string, unknown>
  networks: Record<string, unknown>
}
