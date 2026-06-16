// src/registry/types/imageRef.ts
export interface ParsedImageRef {
  // registry hostname (normalized)
  registry: string | null

  // full repository path (namespace/name)
  repository: string

  // tag or digest (e.g. "latest", "1.2.3", "sha256:abc123")
  reference: string

  // true if image has no registry and is local-only
  isLocal: boolean

  // original input string (for debugging / logging)
  original: string

  // true if reference is a digest (sha256:...)
  isDigest: boolean

  // true if reference is a tag (latest, v1, etc.)
  isTag: boolean

  // normalized registry (docker.io, ghcr.io, quay.io, lscr.io)
  normalizedRegistry: string

  // namespace (e.g. "library" for docker.io/ubuntu)
  namespace: string | null

  // image name (e.g. "ubuntu")
  image: string
}
