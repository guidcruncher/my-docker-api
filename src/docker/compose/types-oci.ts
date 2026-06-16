export interface OCIComposeFile {
  services: Record<string, OCIService>
  networks?: Record<string, OCINetwork>
  volumes?: Record<string, OCIVolume>
  secrets?: Record<string, OCISecret>
  configs?: Record<string, OCIConfig>
}

export interface OCIService {
  image?: string
  build?: OCIBuild

  command?: string | string[]
  entrypoint?: string | string[]

  environment?: Record<string, string> | string[]
  env_file?: string[]

  // OCI SPEC: only long syntax allowed
  ports?: OCIPortLong[]

  // OCI SPEC: only long syntax allowed
  volumes?: OCIVolumeMount[]

  // OCI SPEC: only long syntax allowed
  networks?: OCIServiceNetworkConfig[]

  // OCI SPEC: only long syntax allowed
  depends_on?: Record<string, OCIDependsOnCondition>

  profiles?: string[]
  healthcheck?: OCIHealthcheck
  labels?: Record<string, string>

  secrets?: OCISecretMount[]
  configs?: OCIConfigMount[]

  working_dir?: string
}

export interface OCIBuild {
  context?: string
  dockerfile?: string
  args?: Record<string, string>
  target?: string
  cache_from?: string[]
}

export interface OCIPortLong {
  target: number | string
  published?: number | string
  protocol?: string
  mode?: string
  host_ip?: string
}

export interface OCIVolume {
  driver?: string
  driver_opts?: Record<string, string>
  labels?: Record<string, string>
  external?: boolean | { name: string }
  name?: string
}

export interface OCIVolumeMount {
  type?: "volume" | "bind" | "tmpfs" | "npipe"
  source?: string
  target: string
  read_only?: boolean
  bind?: { propagation?: string }
  volume?: { nocopy?: boolean }
  tmpfs?: { size?: number }
}

export interface OCINetwork {
  driver?: string
  driver_opts?: Record<string, string>
  labels?: Record<string, string>
  external?: boolean | { name: string }
  attachable?: boolean
  internal?: boolean
  ipam?: {
    driver?: string
    config?: Array<{
      subnet?: string
      gateway?: string
      ip_range?: string
    }>
  }
  name?: string
}

export interface OCIServiceNetworkConfig {
  name: string
  aliases?: string[]
  ipv4_address?: string
  ipv6_address?: string
}

export interface OCISecret {
  file?: string
  external?: boolean | { name: string }
  name?: string
}

export interface OCIConfig {
  file?: string
  external?: boolean | { name: string }
  name?: string
}

export interface OCISecretMount {
  source: string
  target?: string
  uid?: string
  gid?: string
  mode?: number
}

export interface OCIConfigMount {
  source: string
  target?: string
  uid?: string
  gid?: string
  mode?: number
}

export interface OCIDependsOnCondition {
  condition?: "service_started" | "service_healthy" | "service_completed_successfully"
}

export interface OCIHealthcheck {
  test: string | string[]
  interval?: string
  timeout?: string
  retries?: number
  start_period?: string
}
