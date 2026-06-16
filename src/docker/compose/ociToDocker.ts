import type { DockerComposeFile, DockerService } from "./types-docker"
import type {
  OCIComposeFile,
  OCIConfig,
  OCINetwork,
  OCISecret,
  OCIService,
  OCIServiceNetworkConfig,
  OCIVolume,
} from "./types-oci"

export function ociToDocker(input: OCIComposeFile): DockerComposeFile {
  const convertService = (svc: OCIService): DockerService => {
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

      ports,
      volumes,

      networks: normalizeNetworks(networks),

      depends_on,

      healthcheck,
      labels,
      secrets,
      configs,
      profiles,
      working_dir,

      // Docker-only fields (safe defaults)
      restart: undefined,
      privileged: undefined,
      logging: undefined,
      deploy: undefined,
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

/* -------------------------------------------------------
   NETWORK NORMALIZATION (OCI → Docker)
------------------------------------------------------- */

function normalizeNetworks(
  networks?: OCIServiceNetworkConfig[],
): Record<string, OCIServiceNetworkConfig> | undefined {
  if (!networks) return undefined

  // OCI array → Docker map
  const out: Record<string, OCIServiceNetworkConfig> = {}

  for (const n of networks) {
    out[n.name] = {
      name: n.name,
      aliases: n.aliases,
      ipv4_address: n.ipv4_address,
      ipv6_address: n.ipv6_address,
    }
  }

  return out
}
