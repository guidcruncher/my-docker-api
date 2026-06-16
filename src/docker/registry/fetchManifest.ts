import { ClientFactory } from "../clients/clientFactory"
import { DockerDaemonClient } from "../dockerDaemonClient"
import { RegistryClient } from "../registryClient"
import type { ImageInspectResponse } from "../types/docker-api-1_54"
import { parseImageRef } from "./parseImageRef"
import type { LocalImageInspect } from "./types/local"
import type { ManifestList } from "./types/manifest"

export interface ManifestResult<T> {
  source: string
  manifest: T
}

export interface PlatformMatch {
  architecture: string
  os: string
  variant?: string | null
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  localDigest: string | null
  remoteDigest: string | null
  platform: PlatformMatch
  matchedDescriptor?: {
    digest: string
    mediaType: string
  }
}

export class ManifestFetcher {
  private registry: RegistryClient
  private docker: DockerDaemonClient

  constructor() {
    const httpClient = ClientFactory.create("tcp", {
      host: "registry-1.docker.io",
      port: 443,
      tls: true,
    })

    this.registry = new RegistryClient(httpClient)
    this.docker = new DockerDaemonClient(ClientFactory.create())
  }

  // -----------------------------------------------------
  // Registry fetchers
  // -----------------------------------------------------

  async dockerHub(repo: string, reference = "latest"): Promise<ManifestResult<ManifestList>> {
    const token = await this.registry.getToken(
      `/token?service=registry.docker.io&scope=repository:${repo}:pull`,
    )

    const manifest = await this.registry.getManifestList("", repo, reference, token)

    return { source: "docker.io", manifest }
  }

  // GHCR — separate from LSCR
  async ghcr(repo: string, reference: string): Promise<ManifestResult<ManifestList>> {
    const token = await this.registry.getToken(
      `https://ghcr.io/token?service=ghcr.io&scope=repository:${repo}:pull`,
    )

    const manifest = await this.registry.getManifestList("https://ghcr.io", repo, reference, token)

    return { source: "ghcr.io", manifest }
  }

  // LSCR — separate registry, but uses GHCR token service
  async lscr(repo: string, reference: string): Promise<ManifestResult<ManifestList>> {
    const token = await this.registry.getToken(
      `https://ghcr.io/token?service=ghcr.io&scope=repository:${repo}:pull`,
    )

    const manifest = await this.registry.getManifestList("https://lscr.io", repo, reference, token)

    return { source: "lscr.io", manifest }
  }

  async quay(repo: string, reference = "latest"): Promise<ManifestResult<ManifestList>> {
    const token = await this.registry.getToken(
      `https://quay.io/v2/auth?service=quay.io&scope=repository:${repo}:pull`,
    )

    const manifest = await this.registry.getManifestList("https://quay.io", repo, reference, token)

    return { source: "quay.io", manifest }
  }

  async local(image: string): Promise<ManifestResult<LocalImageInspect>> {
    const inspect = await this.docker.inspectImage(image)

    return {
      source: "local",
      manifest: {
        Architecture: inspect.Architecture,
        Os: inspect.Os,
        Variant: (inspect as any).Variant ?? null,
        RepoDigests: inspect.RepoDigests ?? [],
      },
    }
  }

  // -----------------------------------------------------
  // Registry normalization + auto-router
  // -----------------------------------------------------

  private normalizeRegistry(reg: string | null): string {
    const r = (reg ?? "").toLowerCase()

    if (r === "" || r === "docker.io" || r === "registry-1.docker.io" || r === "index.docker.io") {
      return "docker.io"
    }

    if (r === "ghcr.io") return "ghcr.io"
    if (r === "lscr.io") return "lscr.io"
    if (r === "quay.io") return "quay.io"

    return r
  }

  async fromImage(image: string): Promise<ManifestResult<ManifestList | LocalImageInspect>> {
    const ref = parseImageRef(image)

    if (ref.isLocal) {
      return this.local(ref.repository)
    }

    const registry = this.normalizeRegistry(ref.registry)

    switch (registry) {
      case "docker.io":
        return this.dockerHub(ref.repository, ref.reference)

      case "ghcr.io":
        return this.ghcr(ref.repository, ref.reference)

      case "lscr.io":
        return this.lscr(ref.repository, ref.reference)

      case "quay.io":
        return this.quay(ref.repository, ref.reference)

      default:
        throw new Error(`Unsupported registry: ${registry}`)
    }
  }

  // -----------------------------------------------------
  // Platform matching helpers
  // -----------------------------------------------------

  private normalizeArch(arch: string): string {
    switch (arch) {
      case "x86_64":
      case "amd64":
        return "amd64"
      case "aarch64":
      case "arm64":
        return "arm64"
      case "armv7":
      case "armhf":
        return "arm"
      default:
        return arch
    }
  }

  private normalizeVariant(variant?: string | null): string | null {
    if (!variant) return null
    return variant.toLowerCase()
  }

  private matchPlatform(manifest: ManifestList, local: LocalImageInspect) {
    const localArch = this.normalizeArch(local.Architecture)
    const localOs = local.Os.toLowerCase()
    const localVariant = this.normalizeVariant(local.Variant)

    let best: { score: number; m: (typeof manifest.manifests)[number] } | null = null

    for (const m of manifest.manifests) {
      if (!m.platform) continue

      const remoteArch = this.normalizeArch(m.platform.architecture)
      const remoteOs = m.platform.os.toLowerCase()
      const remoteVariant = this.normalizeVariant(m.platform.variant)

      if (remoteOs !== localOs) continue
      if (remoteArch !== localArch) continue

      let score = 0

      if (remoteVariant && localVariant && remoteVariant === localVariant) {
        score += 3
      }

      if (remoteVariant && remoteVariant.startsWith("v")) {
        score += 2
      }

      if (!remoteVariant) {
        score += 1
      }

      if (!best || score > best.score) {
        best = { score, m }
      }
    }

    return best?.m ?? null
  }

  // -----------------------------------------------------
  // Platform-aware update checker
  // -----------------------------------------------------

  async checkForUpdate(image: string): Promise<UpdateCheckResult> {
    const ref = parseImageRef(image)

    const remote = await this.fromImage(image)

    if (remote.source === "local") {
      throw new Error("checkForUpdate() requires a remote registry image")
    }

    const manifest = remote.manifest as ManifestList

    const localInspect: ImageInspectResponse = await this.docker.inspectImage(ref.repository)

    const local: LocalImageInspect = {
      Architecture: localInspect.Architecture,
      Os: localInspect.Os,
      Variant: (localInspect as any).Variant ?? null,
      RepoDigests: localInspect.RepoDigests ?? [],
    }

    const descriptor = this.matchPlatform(manifest, local)

    if (!descriptor) {
      return {
        updateAvailable: false,
        localDigest: null,
        remoteDigest: null,
        platform: {
          architecture: local.Architecture,
          os: local.Os,
          variant: local.Variant ?? null,
        },
      }
    }

    const remoteDigest = descriptor.digest

    const localDigestFull = local.RepoDigests.find((d) => d.includes("@")) ?? null
    const localDigest = localDigestFull ? localDigestFull.split("@")[1] : null

    const updateAvailable = localDigest === null || localDigest !== remoteDigest

    return {
      updateAvailable,
      localDigest,
      remoteDigest,
      platform: {
        architecture: local.Architecture,
        os: local.Os,
        variant: local.Variant ?? null,
      },
      matchedDescriptor: {
        digest: descriptor.digest,
        mediaType: descriptor.mediaType,
      },
    }
  }
}
