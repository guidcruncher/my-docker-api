import { ManifestFetcher } from "../src/docker/registry/fetchManifest"
import { RegistryClient } from "../src/docker/registryClient"
import { DockerDaemonClient } from "../src/docker/dockerDaemonClient"
import type { ImageInspectResponse } from "../src/docker/types/docker-api-1_54"
import type { ManifestList } from "../src/docker/registry/types/manifest"

jest.mock("../src/docker/registryClient")
jest.mock("../src/docker/dockerDaemonClient")

const MockRegistryClient = RegistryClient as jest.MockedClass<typeof RegistryClient>
const MockDockerDaemonClient = DockerDaemonClient as jest.MockedClass<typeof DockerDaemonClient>

describe("ManifestFetcher.checkForUpdate()", () => {
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
  const mockLocalInspect = (digest: string | null): ImageInspectResponse => ({
    Id: "sha256:local",
    Created: "2024-01-01T00:00:00Z",
    Size: 12345,
    Architecture: "amd64",
    Os: "linux",
    RepoTags: null,
    RepoDigests: digest ? [`pihole/pihole@${digest}`] : null,
  })

  const mockRemoteManifest = (digest: string): ManifestList => ({
    schemaVersion: 2,
    mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
    manifests: [
      {
        mediaType: "application/vnd.docker.distribution.manifest.v2+json",
        digest,
        size: 123,
        platform: {
          architecture: "amd64",
          os: "linux",
        },
      },
    ],
  })

  // -----------------------------
  // Tests
  // -----------------------------

  test("returns updateAvailable=false when digests match", async () => {
    const digest = "sha256:abc"

    docker.inspectImage.mockResolvedValue(mockLocalInspect(digest))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: mockRemoteManifest(digest),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(false)
    expect(res.localDigest).toBe(digest)
    expect(res.remoteDigest).toBe(digest)
  })

  test("returns updateAvailable=true when digests differ", async () => {
    docker.inspectImage.mockResolvedValue(mockLocalInspect("sha256:old"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: mockRemoteManifest("sha256:new"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(true)
    expect(res.localDigest).toBe("sha256:old")
    expect(res.remoteDigest).toBe("sha256:new")
  })

  test("returns updateAvailable=true when local digest is missing", async () => {
    docker.inspectImage.mockResolvedValue(mockLocalInspect(null))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: mockRemoteManifest("sha256:new"),
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(true)
    expect(res.localDigest).toBe(null)
    expect(res.remoteDigest).toBe("sha256:new")
  })

  test("returns no update when no matching platform exists", async () => {
    docker.inspectImage.mockResolvedValue(mockLocalInspect("sha256:abc"))

    jest.spyOn(fetcher, "fromImage").mockResolvedValue({
      source: "docker.io",
      manifest: {
        schemaVersion: 2,
        mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
        manifests: [
          {
            mediaType: "application/vnd.docker.distribution.manifest.v2+json",
            digest: "sha256:zzz",
            size: 123,
            platform: {
              architecture: "arm64",
              os: "linux",
            },
          },
        ],
      },
    })

    const res = await fetcher.checkForUpdate("pihole/pihole:latest")

    expect(res.updateAvailable).toBe(false)
    expect(res.localDigest).toBe(null)
    expect(res.remoteDigest).toBe(null)
  })

  test("throws when image is local-only", async () => {
    docker.inspectImage.mockResolvedValue(mockLocalInspect("sha256:abc"))

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
