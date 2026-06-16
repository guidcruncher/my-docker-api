// src/registry/registryClient.ts
import type { LocalClient } from "./clients/localClient"
import type { RegistryAuthToken } from "./registry/types/auth"
import type { ImageManifest, ManifestList } from "./registry/types/manifest"

export class RegistryClient {
  constructor(private readonly client: LocalClient) {}

  async getToken(url: string): Promise<string> {
    const res = await this.client.request<RegistryAuthToken>({
      path: url,
      method: "GET",
    })
    return res.token
  }

  async getManifestList(
    registryUrl: string,
    repo: string,
    reference: string,
    token: string,
  ): Promise<ManifestList> {
    return this.client.request<ManifestList>({
      path: `${registryUrl}/v2/${repo}/manifests/${reference}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: [
          "application/vnd.docker.distribution.manifest.list.v2+json",
          "application/vnd.oci.image.index.v1+json",
        ].join(", "),
      },
    })
  }

  async getImageManifest(
    registryUrl: string,
    repo: string,
    digest: string,
    token: string,
  ): Promise<ImageManifest> {
    return this.client.request<ImageManifest>({
      path: `${registryUrl}/v2/${repo}/manifests/${digest}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: [
          "application/vnd.docker.distribution.manifest.v2+json",
          "application/vnd.oci.image.manifest.v1+json",
        ].join(", "),
      },
    })
  }
}
