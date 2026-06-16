import { parseImageRef } from "../src/docker/registry/parseImageRef"

describe("parseImageRef", () => {
  test("parses docker.io implicit library image", () => {
    const ref = parseImageRef("alpine")
    expect(ref).toEqual({
      original: "alpine",
      registry: "docker.io",
      normalizedRegistry: "docker.io",
      repository: "library/alpine",
      namespace: "library",
      image: "alpine",
      reference: "latest",
      isLocal: false,
      isDigest: false,
      isTag: true,
    })
  })

  test("parses docker.io explicit repo", () => {
    const ref = parseImageRef("pihole/pihole:latest")
    expect(ref).toEqual({
      original: "pihole/pihole:latest",
      registry: "docker.io",
      normalizedRegistry: "docker.io",
      repository: "pihole/pihole",
      namespace: "pihole",
      image: "pihole",
      reference: "latest",
      isLocal: false,
      isDigest: false,
      isTag: true,
    })
  })

  test("parses ghcr.io", () => {
    const ref = parseImageRef("ghcr.io/linuxserver/webtop:debian-mate")
    expect(ref).toEqual({
      original: "ghcr.io/linuxserver/webtop:debian-mate",
      registry: "ghcr.io",
      normalizedRegistry: "ghcr.io",
      repository: "linuxserver/webtop",
      namespace: "linuxserver",
      image: "webtop",
      reference: "debian-mate",
      isLocal: false,
      isDigest: false,
      isTag: true,
    })
  })

  test("parses quay.io", () => {
    const ref = parseImageRef("quay.io/prometheus/prometheus")
    expect(ref).toEqual({
      original: "quay.io/prometheus/prometheus",
      registry: "quay.io",
      normalizedRegistry: "quay.io",
      repository: "prometheus/prometheus",
      namespace: "prometheus",
      image: "prometheus",
      reference: "latest",
      isLocal: false,
      isDigest: false,
      isTag: true,
    })
  })

  test("parses local:// image", () => {
    const ref = parseImageRef("local://pihole/pihole")
    expect(ref).toEqual({
      original: "local://pihole/pihole",
      registry: null,
      normalizedRegistry: "",
      repository: "pihole/pihole",
      namespace: "pihole",
      image: "pihole",
      reference: "latest",
      isLocal: true,
      isDigest: false,
      isTag: true,
    })
  })
})
