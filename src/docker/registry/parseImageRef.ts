import type { ParsedImageRef } from "./types/imageRef"

const isRegistryLike = (part: string): boolean => {
  return part.includes(".") || part.includes(":") || part === "localhost" || part === "local"
}

export function parseImageRef(input: string): ParsedImageRef {
  const original = input.trim()

  // -----------------------------------------------------
  // Special case: local:// images
  // -----------------------------------------------------
  if (original.startsWith("local://")) {
    const remainder = original.replace("local://", "")
    const parts = remainder.split("/")

    const namespace = parts.length > 1 ? parts[0] : null
    const image = parts.length > 1 ? parts[1] : parts[0]

    return {
      original,
      registry: null,
      normalizedRegistry: "",
      repository: remainder,
      namespace,
      image,
      reference: "latest",
      isLocal: true,
      isDigest: false,
      isTag: true,
    }
  }

  // -----------------------------------------------------
  // Split registry vs remainder
  // -----------------------------------------------------
  let registry: string | null = null
  let remainder = original

  const firstSlash = original.indexOf("/")
  if (firstSlash !== -1) {
    const firstPart = original.slice(0, firstSlash)
    const rest = original.slice(firstSlash + 1)

    if (isRegistryLike(firstPart)) {
      registry = firstPart
      remainder = rest
    }
  }

  // -----------------------------------------------------
  // Extract tag or digest
  // -----------------------------------------------------
  let reference: string
  let repoPart: string

  const atIndex = remainder.indexOf("@")
  if (atIndex !== -1) {
    repoPart = remainder.slice(0, atIndex)
    reference = remainder.slice(atIndex + 1)
  } else {
    const lastColon = remainder.lastIndexOf(":")
    const lastSlash = remainder.lastIndexOf("/")

    if (lastColon !== -1 && lastColon > lastSlash) {
      repoPart = remainder.slice(0, lastColon)
      reference = remainder.slice(lastColon + 1)
    } else {
      repoPart = remainder
      reference = "latest"
    }
  }

  // -----------------------------------------------------
  // Determine namespace + image
  // -----------------------------------------------------
  const parts = repoPart.split("/")
  let namespace: string | null
  let image: string

  if (parts.length > 1) {
    namespace = parts.slice(0, -1).join("/")
    image = parts[parts.length - 1]
  } else {
    namespace = null
    image = repoPart
  }

  // -----------------------------------------------------
  // Docker.io implicit rules
  // -----------------------------------------------------
  if (!registry) {
    registry = "docker.io"

    if (!namespace) {
      namespace = "library"
      repoPart = `library/${repoPart}`
    }
  }

  const repository = repoPart

  // -----------------------------------------------------
  // Flags
  // -----------------------------------------------------
  const isDigest = reference.startsWith("sha256:")
  const isTag = !isDigest

  return {
    original,
    registry,
    normalizedRegistry: registry,
    repository,
    namespace,
    image,
    reference,
    isLocal: false,
    isDigest,
    isTag,
  }
}
