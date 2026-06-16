// src/registry/types/local.ts
export interface LocalImageInspect {
  Architecture: string
  Os: string
  Variant: string | null
  RepoDigests: string[]
}
