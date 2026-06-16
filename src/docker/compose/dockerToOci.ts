import type { DockerComposeFile, DockerService } from "./types-docker"
import type {
  OCIComposeFile,
  OCIConfig,
  OCIConfigMount,
  OCIDependsOnCondition,
  OCINetwork,
  OCIPortLong,
  OCISecret,
  OCISecretMount,
  OCIService,
  OCIServiceNetworkConfig,
  OCIVolume,
  OCIVolumeMount,
} from "./types-oci"

export function dockerToOCI(input: DockerComposeFile): OCIComposeFile {
  const convertService = (svc: DockerService): OCIService => {
    const {
      image,
      build,
      command,
      entrypoint,
      environment,
      env_file,
      ports,
      volumes,
      networks,
      depends_on,
      healthcheck,
      labels,
      secrets,
      configs,
      profiles,
      working_dir,
    } = svc

    return {
      image,
      build,
      command,
      entrypoint,
      environment,
      env_file,
      ports: normalizePorts(ports),
      volumes: normalizeVolumes(volumes),
      networks: normalizeNetworks(networks),
      depends_on: normalizeDependsOn(depends_on),
      healthcheck,
      labels,
      secrets: normalizeSecrets(secrets),
      configs: normalizeConfigs(configs),
      profiles,
      working_dir,
    }
  }

  return {
    services: Object.fromEntries(
      Object.entries(input.services).map(([name, svc]) => [name, convertService(svc)]),
    ),
    networks: input.networks as Record<string, OCINetwork>,
    volumes: input.volumes as Record<string, OCIVolume>,
    secrets: input.secrets as Record<string, OCISecret>,
    configs: input.configs as Record<string, OCIConfig>,
  }
}

/* ---------------- NORMALIZERS ---------------- */

function normalizePorts(ports?: Array<string | OCIPortLong>): OCIPortLong[] | undefined {
  if (!ports) return undefined
  return ports.map((p) => (typeof p === "string" ? parsePortString(p) : p))
}

function parsePortString(p: string): OCIPortLong {
  const [hostPart, protoPart] = p.split("/")
  const protocol = protoPart ?? "tcp"

  const segments = hostPart.split(":")
  if (segments.length === 2) {
    const [published, target] = segments
    return { target, published, protocol }
  }
  if (segments.length === 3) {
    const [host_ip, published, target] = segments
    return { host_ip, target, published, protocol }
  }
  return { target: hostPart, protocol }
}

function normalizeVolumes(volumes?: Array<string | OCIVolumeMount>): OCIVolumeMount[] | undefined {
  if (!volumes) return undefined
  return volumes.map((v) => (typeof v === "string" ? parseVolumeString(v) : v))
}

function parseVolumeString(v: string): OCIVolumeMount {
  const parts = v.split(":")
  const [source, target, mode] = parts
  const read_only = mode === "ro"
  const isBind = source.startsWith(".") || source.startsWith("/")

  return {
    type: isBind ? "bind" : "volume",
    source,
    target,
    read_only,
  }
}

/* ---------------- NETWORK NORMALIZATION ---------------- */

function normalizeNetworks(
  networks?: string[] | Record<string, OCIServiceNetworkConfig>,
): OCIServiceNetworkConfig[] | undefined {
  if (!networks) return undefined

  // Array form: ["backend"]
  if (Array.isArray(networks)) {
    return networks.map((name) => ({
      name,
      aliases: undefined,
      ipv4_address: undefined,
      ipv6_address: undefined,
    }))
  }

  // Object form:
  // { backend: { aliases: ["api.local"] } }
  return Object.entries(networks).map(([name, cfg]) => ({
    name,
    aliases: cfg?.aliases,
    ipv4_address: cfg?.ipv4_address,
    ipv6_address: cfg?.ipv6_address,
  }))
}

/* ---------------- DEPENDS_ON ---------------- */

function normalizeDependsOn(
  depends_on?: string[] | Record<string, OCIDependsOnCondition>,
): Record<string, OCIDependsOnCondition> | undefined {
  if (!depends_on) return undefined

  if (Array.isArray(depends_on)) {
    const out: Record<string, OCIDependsOnCondition> = {}
    for (const name of depends_on) {
      out[name] = { condition: "service_started" }
    }
    return out
  }

  return depends_on
}

/* ---------------- SECRETS / CONFIGS ---------------- */

function normalizeSecrets(secrets?: Array<string | OCISecretMount>): OCISecretMount[] | undefined {
  if (!secrets) return undefined
  return secrets.map((s) => (typeof s === "string" ? { source: s } : s))
}

function normalizeConfigs(configs?: Array<string | OCIConfigMount>): OCIConfigMount[] | undefined {
  if (!configs) return undefined
  return configs.map((c) => (typeof c === "string" ? { source: c } : c))
}
