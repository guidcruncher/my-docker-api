import type {
  OCIConfig,
  OCIConfigMount,
  OCIDependsOnCondition,
  OCIHealthcheck,
  OCINetwork,
  OCIPortLong,
  OCISecret,
  OCISecretMount,
  OCIService,
  OCIServiceNetworkConfig,
  OCIVolume,
  OCIVolumeMount,
} from "./types-oci"

//
// DOCKER COMPOSE FILE (no longer extends OCIComposeFile to avoid type conflicts)
//
export interface DockerComposeFile {
  services: Record<string, DockerService>
  networks?: Record<string, DockerNetwork>
  volumes?: Record<string, DockerVolume>
  secrets?: Record<string, DockerSecret>
  configs?: Record<string, DockerConfig>
}

//
// DOCKER SERVICE
// - Based on OCIService, but overrides fields where Docker allows short syntax
//
export interface DockerService extends Omit<
  OCIService,
  "ports" | "volumes" | "networks" | "depends_on" | "secrets" | "configs"
> {
  // Docker-only fields
  container_name?: string
  hostname?: string

  restart?: "no" | "always" | "on-failure" | "unless-stopped"

  cap_add?: string[]
  cap_drop?: string[]
  privileged?: boolean
  security_opt?: string[]

  devices?: string[]
  sysctls?: Record<string, string>
  ulimits?: Record<string, DockerUlimit>
  tmpfs?: string[] | string

  dns?: string[] | string
  dns_search?: string[] | string
  extra_hosts?: Record<string, string> | string[]

  ipc?: string
  network_mode?: string

  user?: string
  stop_signal?: string
  stop_grace_period?: string

  pid?: string
  cgroup_parent?: string

  mem_limit?: string | number
  mem_reservation?: string | number
  memswap_limit?: string | number

  cpus?: number
  cpu_shares?: number
  cpu_quota?: number
  cpu_period?: number

  oom_kill_disable?: boolean
  oom_score_adj?: number

  logging?: {
    driver?: string
    options?: Record<string, string>
  }

  shm_size?: string | number

  deploy?: DockerDeploy

  // Docker short + long syntax

  // e.g. "8080:80", "127.0.0.1:9000:9000/tcp" OR long syntax
  ports?: Array<string | OCIPortLong>

  // e.g. "./src:/app/src", "namedvol:/path:ro" OR long syntax
  volumes?: Array<string | OCIVolumeMount>

  // e.g. ["default", "backend"] OR long syntax
  networks?: string[] | Record<string, OCIServiceNetworkConfig>

  // e.g. ["db"] OR long syntax
  depends_on?: string[] | Record<string, OCIDependsOnCondition>

  // e.g. ["mysecret"] OR long syntax
  secrets?: Array<string | OCISecretMount>

  // e.g. ["myconfig"] OR long syntax
  configs?: Array<string | OCIConfigMount>

  // Extra Docker fields
  expose?: Array<number | string>
  links?: string[]
  extends?: string | { file?: string; service: string }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerVolume extends OCIVolume {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerNetwork extends OCINetwork {}

export interface DockerSecret extends OCISecret {
  labels?: Record<string, string>
}

export interface DockerConfig extends OCIConfig {
  labels?: Record<string, string>
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerVolumeMount extends OCIVolumeMount {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerPortLong extends OCIPortLong {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerHealthcheck extends OCIHealthcheck {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DockerDependsOnCondition extends OCIDependsOnCondition {}

export interface DockerUlimit {
  soft?: number
  hard?: number
}

export interface DockerDeploy {
  replicas?: number
  mode?: string
  restart_policy?: {
    condition?: string
    delay?: string
    max_attempts?: number
    window?: string
  }
  resources?: {
    limits?: {
      cpus?: string
      memory?: string
    }
    reservations?: {
      cpus?: string
      memory?: string
    }
  }
  placement?: {
    constraints?: string[]
  }
  update_config?: {
    parallelism?: number
    delay?: string
    failure_action?: string
    monitor?: string
    max_failure_ratio?: number
    order?: string
  }
  labels?: Record<string, string>
}

export const NetworkDrivers: Record<string, string> = {
  bridge: "Standard Linux bridge networking (default for local networks)",
  overlay: "Multi-host overlay network (Swarm / distributed)",
  host: "Use the host's network namespace",
  macvlan: "Assign MAC addresses to containers (L2 isolation)",
  ipvlan: "Lightweight L3/L2 container networking",
  none: "Disable networking for this container",
}

export const VolumeDrivers: Record<string, string> = {
  local: "Local filesystem volume (default)",
  nfs: "NFS network filesystem volume",
  smb: "SMB/CIFS network share volume",
  tmpfs: "In-memory temporary filesystem",
  azurefile: "Azure File Storage volume",
  rexray: "RexRay storage orchestrator driver",
  flocker: "Flocker clustered volume driver",
  glusterfs: "GlusterFS distributed filesystem",
}

export const NetworkDriverOpts: Record<string, Record<string, string>> = {
  bridge: {
    "com.docker.network.bridge.enable_icc": "Enable inter‑container communication",
    "com.docker.network.bridge.enable_ip_masquerade": "Enable IP masquerading",
    "com.docker.network.bridge.host_binding_ipv4": "Host IPv4 binding address",
    "com.docker.network.bridge.name": "Linux bridge name",
    "com.docker.network.driver.mtu": "MTU size",
  },

  overlay: {
    "com.docker.network.driver.mtu": "MTU size",
    "com.docker.network.overlay.vxlanid_list": "VXLAN ID list",
    "com.docker.network.overlay.encrypt": "Enable encrypted overlay",
  },

  macvlan: {
    parent: "Parent interface (eth0, enp3s0, etc.)",
    mode: "Bridge, private, vepa, passthru",
  },

  ipvlan: {
    parent: "Parent interface",
    mode: "L2 or L3 mode",
  },

  host: {},

  none: {},
}

export const VolumeDriverOpts: Record<string, Record<string, string>> = {
  local: {
    type: "Filesystem type (none, nfs, tmpfs, etc.)",
    device: "Device path or mount source",
    o: "Mount options (comma‑separated)",
  },

  nfs: {
    addr: "NFS server address",
    nfsvers: "NFS protocol version",
    proto: "Transport protocol (tcp/udp)",
    mountopts: "Additional mount options",
  },

  smb: {
    share: "SMB share path",
    username: "SMB username",
    password: "SMB password",
    domain: "SMB domain",
  },

  tmpfs: {
    size: "Size in bytes",
    mode: "Permissions (octal)",
  },

  azurefile: {
    share_name: "Azure File share name",
    storage_account_name: "Azure storage account",
    storage_account_key: "Storage account key",
  },

  rexray: {
    size: "Volume size",
    volume_type: "Storage backend type",
    iops: "IOPS provisioning",
  },

  flocker: {
    dataset_name: "Flocker dataset name",
    dataset_id: "Flocker dataset ID",
  },

  glusterfs: {
    volume: "GlusterFS volume name",
    backupvolfile_server: "Backup volfile server",
  },
}
