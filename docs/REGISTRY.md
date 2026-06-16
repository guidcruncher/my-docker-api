# ManifestFetcher API

`ManifestFetcher` provides a high-level, registry-aware interface for: fetching image manifests, inspecting local images, and checking for updates between local images and remote registries with platform awareness.

## Class: ManifestFetcher

class new ManifestFetcher()

Creates a new `ManifestFetcher` instance wired to: Docker Hub (as default registry client) and the local Docker daemon.

Example

```ts
import { ManifestFetcher } from "./docker/registry/fetchManifest"

const fetcher = new ManifestFetcher()
```

## Method: dockerHub

async dockerHub(repo: string, reference = "latest"): Promise<ManifestResult<ManifestList>>

Fetches a multi-architecture manifest list from Docker Hub for the given repository and tag (or digest). Uses the Docker Hub token service and requests both Docker and OCI manifest list media types.

### Parameters

- **repo** – Repository name, e.g. `"library/alpine"` or `"pihole/pihole"`.
- **reference** – Tag or digest, defaults to `"latest"`.

### Returns

A `ManifestResult<ManifestList>` with: `source = "docker.io"` and the parsed manifest list.

### Example

```ts
const fetcher = new ManifestFetcher()

const result = await fetcher.dockerHub("library/alpine", "latest")

console.log(result.source) // "docker.io"
console.log(result.manifest.mediaType)
console.log(result.manifest.manifests.length)
```

## Method: ghcr

async ghcr(repo: string, reference: string): Promise<ManifestResult<ManifestList>>

Fetches a manifest list from GitHub Container Registry / lscr.io for the given repository and reference. Uses the GHCR token endpoint and queries the lscr.io registry endpoint.

### Parameters

- **repo** – Repository path, e.g. `"linuxserver/webtop"`.
- **reference** – Tag or digest, e.g. `"debian-mate"`.

### Returns

A `ManifestResult<ManifestList>` with `source = "ghcr.io/lscr.io"`.

### Example

```ts
const fetcher = new ManifestFetcher()

const result = await fetcher.ghcr("linuxserver/webtop", "debian-mate")

console.log(result.source) // "ghcr.io/lscr.io"
console.log(result.manifest.manifests[0].platform)
```

## Method: quay

async quay(repo: string, reference = "latest"): Promise<ManifestResult<ManifestList>>

Fetches a manifest list from Quay.io for the given repository and reference. Uses Quay's auth endpoint and registry API.

### Parameters

- **repo** – Repository path, e.g. `"prometheus/prometheus"`.
- **reference** – Tag or digest, defaults to `"latest"`.

### Returns

A `ManifestResult<ManifestList>` with `source = "quay.io"`.

### Example

```ts
const fetcher = new ManifestFetcher()

const result = await fetcher.quay("prometheus/prometheus", "latest")

console.log(result.source) // "quay.io"
console.log(result.manifest.manifests.map((m) => m.platform))
```

## Method: local

async local(image: string): Promise<ManifestResult<LocalImageInspect>>

Inspects a local Docker image via the Docker daemon and normalizes the result into a minimal `LocalImageInspect` structure.

### Parameters

- **image** – Local image name or ID, e.g. `"pihole/pihole"`.

### Returns

A `ManifestResult<LocalImageInspect>` with `source = "local"` and: `Architecture`, `Os`, `RepoDigests: string[]`.

### Example

```ts
const fetcher = new ManifestFetcher()

const result = await fetcher.local("pihole/pihole")

console.log(result.source) // "local"
console.log(result.manifest.Architecture)
console.log(result.manifest.RepoDigests)
```

## Method: fromImage

async fromImage(image: string): Promise<ManifestResult<ManifestList | LocalImageInspect>>

High-level auto-router that parses an image URI and dispatches to the correct fetcher: Docker Hub, GHCR/lscr.io, Quay.io, or local Docker daemon.

### Parameters

- **image** – Image URI, e.g. `"pihole/pihole:latest"`, `"ghcr.io/linuxserver/webtop:debian-mate"`, `"quay.io/prometheus/prometheus"`, `"local://pihole/pihole"`.

### Returns

A `ManifestResult` whose `manifest` is either a remote `ManifestList` or a `LocalImageInspect`, depending on the URI.

### Example

```ts
const fetcher = new ManifestFetcher()

const a = await fetcher.fromImage("pihole/pihole:latest")
const b = await fetcher.fromImage("ghcr.io/linuxserver/webtop:debian-mate")
const c = await fetcher.fromImage("quay.io/prometheus/prometheus")
const d = await fetcher.fromImage("local://pihole/pihole")

console.log(a.source) // "docker.io"
console.log(b.source) // "ghcr.io/lscr.io"
console.log(c.source) // "quay.io"
console.log(d.source) // "local"
```

## Method: checkForUpdate

async checkForUpdate(image: string): Promise<UpdateCheckResult>

Platform-aware update checker that: fetches the remote manifest list, inspects the local image, matches the correct platform (architecture + OS + variant), and compares digests to determine if an update is available.

### Parameters

- **image** – Remote image URI, e.g. `"pihole/pihole:latest"`, `"ghcr.io/linuxserver/webtop:debian-mate"`. Must not be a `local://` URI.

### Returns

An `UpdateCheckResult`:

- **updateAvailable** – `true` if remote digest differs or local digest is missing.
- **localDigest** – Normalized local digest (e.g. `"sha256:abc..."`) or `null`.
- **remoteDigest** – Remote digest for the matched platform or `null`.
- **platform** – Local platform (architecture + os).
- **matchedDescriptor** – Optional descriptor (digest + mediaType) for the matched remote manifest.

### Example: basic usage

```ts
const fetcher = new ManifestFetcher()

const result = await fetcher.checkForUpdate("pihole/pihole:latest")

if (result.updateAvailable) {
  console.log("Update available!")
  console.log("Local digest: ", result.localDigest)
  console.log("Remote digest:", result.remoteDigest)
} else {
  console.log("Image is up to date for platform:", result.platform)
}
```

### Example: platform-aware behavior

```ts
const fetcher = new ManifestFetcher()

// On an arm64 host, this will match the arm64 (or arm64/v8) manifest
const result = await fetcher.checkForUpdate("ghcr.io/linuxserver/webtop:debian-mate")

console.log(result.platform) // { architecture: "arm64", os: "linux" } on arm64
console.log(result.matchedDescriptor?.digest)
```

### Example: handling errors for local-only images

```ts
const fetcher = new ManifestFetcher()

try {
  await fetcher.checkForUpdate("local://pihole/pihole")
} catch (err) {
  console.error(String(err))
  // "Error: checkForUpdate() requires a remote registry image"
}
```

## Supporting Function: parseImageRef

function parseImageRef(input: string): ParsedImageRef

Parses an image reference into registry, repository, reference (tag or digest), and a flag indicating whether it is a local image URI. Used internally by `fromImage` and `checkForUpdate`.

### Returns

- **registry** – Registry hostname or `null` for `local://`.
- **repository** – Repository path (e.g. `"library/alpine"`).
- **reference** – Tag or digest (default `"latest"`).
- **isLocal** – `true` if URI starts with `"local://"`.

### Example

```ts
import { parseImageRef } from "./docker/registry/parseImageRef"

console.log(parseImageRef("alpine"))
// { registry: "docker.io", repository: "library/alpine", reference: "latest", isLocal: false }

console.log(parseImageRef("ghcr.io/linuxserver/webtop:debian-mate"))
// { registry: "ghcr.io", repository: "linuxserver/webtop", reference: "debian-mate", isLocal: false }

console.log(parseImageRef("local://pihole/pihole"))
// { registry: null, repository: "pihole/pihole", reference: "latest", isLocal: true }
```
