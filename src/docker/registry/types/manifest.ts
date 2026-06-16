// src/registry/types/manifest.ts

// -------------------------------------------------------------
// Common Descriptor
// -------------------------------------------------------------
export interface Descriptor {
  mediaType: string
  digest: string
  size: number

  // OCI + Docker optional fields
  urls?: string[]
  annotations?: Record<string, string>

  platform?: {
    architecture: string
    os: string
    variant?: string
    features?: string[]
  }
}

// -------------------------------------------------------------
// OCI Image Index (multi-arch)
// -------------------------------------------------------------
export interface OCIImageIndex {
  schemaVersion: 2
  mediaType: "application/vnd.oci.image.index.v1+json"

  manifests: Descriptor[]

  // OCI optional fields
  annotations?: Record<string, string>
  artifactType?: string
  subject?: Descriptor
}

// -------------------------------------------------------------
// Docker Manifest List (multi-arch)
// -------------------------------------------------------------
export interface DockerManifestList {
  schemaVersion: 2
  mediaType: "application/vnd.docker.distribution.manifest.list.v2+json"

  manifests: Descriptor[]

  // Docker supports annotations too (GHCR, Quay return them)
  annotations?: Record<string, string>
}

// Union of multi-arch types
export type ManifestList = OCIImageIndex | DockerManifestList

// -------------------------------------------------------------
// OCI Image Manifest (single-arch)
// -------------------------------------------------------------
export interface OCIImageManifest {
  schemaVersion: 2
  mediaType: "application/vnd.oci.image.manifest.v1+json"

  config: Descriptor
  layers: Descriptor[]

  // OCI optional fields
  annotations?: Record<string, string>
  artifactType?: string
  subject?: Descriptor
}

// -------------------------------------------------------------
// Docker Image Manifest (single-arch)
// -------------------------------------------------------------
export interface DockerImageManifest {
  schemaVersion: 2
  mediaType: "application/vnd.docker.distribution.manifest.v2+json"

  config: Descriptor
  layers: Descriptor[]

  // Docker optional fields
  annotations?: Record<string, string>
}

// Union of single-arch types
export type ImageManifest = OCIImageManifest | DockerImageManifest
