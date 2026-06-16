import { ManifestFetcher } from "../src/docker/registry/fetchManifest"
import { RegistryClient } from "../src/docker/registryClient"
import { DockerDaemonClient } from "../src/docker/dockerDaemonClient"
import type { ImageInspectResponse } from "../src/docker/types/docker-api-1_54"

jest.mock("../src/docker/registryClient")
jest.mock("../src/docker/dockerDaemonClient")

const MockRegistryClient = RegistryClient as jest.MockedClass<typeof RegistryClient>
const MockDockerDaemonClient = DockerDaemonClient as jest.MockedClass<typeof DockerDaemonClient>

describe("ManifestFetcher", () => {
  let fetcher: ManifestFetcher
  let registry: jest.Mocked<RegistryClient>
  let docker: jest.Mocked<DockerDaemonClient>

  beforeEach(() => {
    registry = new MockRegistryClient({} as any) as any
    docker = new MockDockerDaemonClient({} as any) as any

    fetcher = new ManifestFetcher()
    ;(fetcher as any).registry = registry
    ;(fetcher as any).docker = docker

    // -----------------------------
    // TOKEN MOCKS
    // -----------------------------
    registry.getToken.mockImplementation(async (url: string) => {
      if (url.startsWith("https://ghcr.io/token")) return "TOKEN_GHCR"
      if (url.startsWith("https://quay.io")) return "TOKEN_QUAY"
      return "TOKEN"
    })

    // -----------------------------
    // MANIFEST MOCKS (correct signature)
    // -----------------------------
    registry.getManifestList.mockImplementation(
      async (registryUrl: string, repo: string, reference: string, token: string) => {
        // docker.io
        if (registryUrl === "") {
          return {
            schemaVersion: 2,
            mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
            manifests: [],
          }
        }

        // ghcr.io
        if (registryUrl === "https://ghcr.io") {
          return {
            schemaVersion: 2,
            mediaType: "application/vnd.oci.image.index.v1+json",
            manifests: [],
          }
        }

        // lscr.io
        if (registryUrl === "https://lscr.io") {
          return {
            schemaVersion: 2,
            mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
            manifests: [],
          }
        }

        // quay.io
        if (registryUrl === "https://quay.io") {
          return {
            schemaVersion: 2,
            mediaType: "application/vnd.oci.image.index.v1+json",
            manifests: [],
          }
        }

        // fallback — MUST return a ManifestList, never undefined
        return {
          schemaVersion: 2,
          mediaType: "application/vnd.docker.distribution.manifest.list.v2+json",
          manifests: [],
        }
      },
    )

    // -----------------------------
    // DOCKER INSPECT MOCK
    // -----------------------------
    docker.inspectImage.mockResolvedValue({
      Id: "sha256:123",
      Created: "2024-01-01T00:00:00Z",
      Size: 12345,
      Architecture: "amd64",
      Os: "linux",
      RepoTags: null,
      RepoDigests: ["sha256:abc"],
    } as any)
  })

  // -----------------------------
  // docker.io
  // -----------------------------
  test("dockerHub() returns manifest", async () => {
    const res = await fetcher.dockerHub("pihole/pihole", "latest")

    expect(res.source).toBe("docker.io")
    expect(res.manifest.manifests).toEqual([])
  })

  // -----------------------------
  // LSCR
  // -----------------------------
  test("lscr() returns manifest", async () => {
    const res = await fetcher.lscr("linuxserver/webtop", "latest")

    expect(res.source).toBe("lscr.io")
    expect(res.manifest).toBeDefined()
  })

  test("fromImage() routes lscr.io", async () => {
    const res = await fetcher.fromImage("lscr.io/linuxserver/webtop:latest")

    expect(res.source).toBe("lscr.io")
    expect(res.manifest).toBeDefined()
  })

  // -----------------------------
  // ghcr.io
  // -----------------------------
  test("ghcr() returns manifest", async () => {
    const res = await fetcher.ghcr("linuxserver/webtop", "debian-mate")

    expect(res.source).toBe("ghcr.io")
    expect(res.manifest).toBeDefined()
  })

  // -----------------------------
  // quay.io
  // -----------------------------
  test("quay() returns manifest", async () => {
    const res = await fetcher.quay("prometheus/prometheus", "latest")

    expect(res.source).toBe("quay.io")
    expect(res.manifest).toBeDefined()
  })

  // -----------------------------
  // local docker inspect
  // -----------------------------
  test("local() returns inspect data", async () => {
    const mockInspect: ImageInspectResponse = {
      Id: "sha256:123",
      Created: "2024-01-01T00:00:00Z",
      Size: 12345,
      Architecture: "amd64",
      Os: "linux",
      RepoTags: null,
      RepoDigests: ["sha256:abc"],
    }

    docker.inspectImage.mockResolvedValue(mockInspect)

    const res = await fetcher.local("pihole/pihole")

    expect(res.source).toBe("local")
    expect(res.manifest.Architecture).toBe("amd64")
    expect(res.manifest.RepoDigests).toEqual(["sha256:abc"])
  })

  // -----------------------------
  // fromImage() auto-router
  // -----------------------------
  test("fromImage() routes docker.io", async () => {
    const res = await fetcher.fromImage("pihole/pihole:latest")
    expect(res.source).toBe("docker.io")
  })

  test("fromImage() routes ghcr.io", async () => {
    const res = await fetcher.fromImage("ghcr.io/linuxserver/webtop:debian-mate")
    expect(res.source).toBe("ghcr.io")
  })

  test("fromImage() routes quay.io", async () => {
    const res = await fetcher.fromImage("quay.io/prometheus/prometheus")
    expect(res.source).toBe("quay.io")
  })

  test("fromImage() routes local://", async () => {
    const mockInspect: ImageInspectResponse = {
      Id: "sha256:999",
      Created: "2024-01-01T00:00:00Z",
      Size: 99999,
      Architecture: "arm64",
      Os: "linux",
      RepoTags: null,
      RepoDigests: [],
    }

    docker.inspectImage.mockResolvedValue(mockInspect)

    const res = await fetcher.fromImage("local://pihole/pihole")
    expect(res.source).toBe("local")
  })
})
