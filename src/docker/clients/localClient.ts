// localClient.ts
export interface DockerRequestOptions {
  path: string
  method?: string
  headers?: Record<string, string>
  body?: any
  stream?: boolean
  timeoutMs?: number
  apiVersion?: string
}

export interface LocalClient {
  request<T = unknown>(options: DockerRequestOptions): Promise<T>
}

export const DEFAULT_DOCKER_API_VERSION = "v1.54"
