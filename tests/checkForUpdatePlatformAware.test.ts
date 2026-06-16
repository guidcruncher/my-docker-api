import { ManifestFetcher } from "../src/docker/registry/fetchManifest"
import { RegistryClient } from "../src/docker/registryClient"
import { DockerDaemonClient } from "../src/docker/dockerDaemonClient"
import type { ImageInspectResponse } from "../src/docker/types/docker-api-1_54"
import type { ManifestList } from "../src/docker/registry/types/manifest"

jest.mock("../src/docker/registryClient")
jest.mock("../src/docker/dockerDaemonClient")

const MockRegistryClient = RegistryClient as jest.MockedClass<typeof RegistryClient>
const MockDockerDaemonClient = DockerDaemonClient as jest.MockedClass<typeof DockerDaemonClient>

describe("ManifestFetcher.checkForUpdate() — platform aware", () => {
  let fetcher: ManifestFetcher
  let registry: jest.Mocked<RegistryClient>
  let docker: jest.Mocked<DockerDaemonClient>

  beforeEach(() => {
    registry = new MockRegistryClient({} as any) as any
    docker = new MockDockerDaemonClient({} as any) as any

    fetcher = new ManifestFetcher()
    ;(fetcher as any).registry = registry
    ;(fetcher as any).docker = docker
  })

  // -----------------------------
  // Helpers
  // -----------------------------
  const localInspect = (arch: string, os: string, digest: string | null): ImageInspectResponse => ({
    Id: "sha256:local",
    Created: "2024-01-01T00:00:00Z",
    Size: 12345,
    Architecture: arch,
    Os: os,
    RepoTags: null,
    RepoDigests: digest ? [`pihole/pihole@${digest}`] : null,
  })

  const remoteManifest = (
    arch: string,
    os: string,
    digest: string,
    variant?: string,
  ): ManifestList => ({
    schemaVersion: 2,
    mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
    manifests: [
      {
        mediaType: "application/vnd.docker.distribution.manifest.v2+json",
        digest,
        size: 123,
        platform: {
          architecture: arch,
          os,
          variant,
        },
      },
    ],
  })

  // -----------------------------
  // Tests
  // -----------------------------

  test("matches amd64 → amd64", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("amd64", "linux", "sha256:abc"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("amd64", "linux", "sha256:abc"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(false)
    expect(res.localDigest).toBe("sha256:abc")
    expect(res.remoteDigest).toBe("sha256:abc")
  })

  test("matches arm64 → arm64/v8 (variant fallback)", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("arm64", "linux", "sha256:old"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("arm64", "linux", "sha256:new", "v8"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(true)
    expect(res.remoteDigest).toBe("sha256:new")
  })

  test("matches arm → arm/v7", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("arm", "linux", "sha256:old"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("arm", "linux", "sha256:new", "v7"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(true)
    expect(res.remoteDigest).toBe("sha256:new")
  })

  test("returns no update when OS mismatches", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("amd64", "linux", "sha256:abc"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("amd64", "windows", "sha256:zzz"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(false)
    expect(res.localDigest).toBe(null)
    expect(res.remoteDigest).toBe(null)
  })

  test("returns updateAvailable=true when local digest missing", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("amd64", "linux", null))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("amd64", "linux", "sha256:new"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(true)
    expect(res.localDigest).toBe(null)
    expect(res.remoteDigest).toBe("sha256:new")
  })

  test("returns no update when no matching platform exists", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("amd64", "linux", "sha256:abc"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: remoteManifest("arm64", "linux", "sha256:new"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(false)
    expect(res.localDigest).toBe(null)
    expect(res.remoteDigest).toBe(null)
  })

  test("throws for local-only images", async () => {
    docker.inspectImage.mockResolvedValue(localInspect("amd64", "linux", "sha256:abc"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "local",
      manifest: {
        Architecture: "amd64",
        Os: "linux",
        Variant: null,
        RepoDigests: ["sha256:abc"],
      },
    })

    await expect(fetcher.checkForUpdate("local://pihole/pihole")).rejects.toThrow(
      "checkForUpdate() requires a remote registry image",
    )
  })
})
