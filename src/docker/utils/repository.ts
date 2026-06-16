export const getFullImagePath = (uri: string): string => {
  const parts = uri.split("/")

  if (parts.length == 3) {
    return uri
  }

  return `docker.io/${uri}`
}
