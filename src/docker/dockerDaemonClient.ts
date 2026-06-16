// ./src/docker/dockerDaemonClient.ts
import { IncomingMessage } from "http"

import type { DockerRequestOptions, LocalClient } from "./clients/localClient"
import { DEFAULT_DOCKER_API_VERSION } from "./clients/localClient"
import { DockerMultiplexedStream } from "./streams/dockerMultiplexedStream"
import type {
  ContainerCreateResponse,
  ContainerInspectResponse,
  ContainerSummaryResponse,
  ExecCreateResponse,
  ImageInspectResponse,
  ImageSummary,
  SystemInfo,
  SystemVersion,
} from "./types/docker-api-1_54"

export class DockerDaemonClient {
  constructor(
    private readonly client: LocalClient,
    private readonly apiVersion: string = DEFAULT_DOCKER_API_VERSION,
  ) {}

  // -----------------------------
  // System
  // -----------------------------
  version() {
    return this.get<SystemVersion>("/version")
  }

  info() {
    return this.get<SystemInfo>("/info")
  }

  ping() {
    return this.get<string>("/_ping")
  }

  events(filters?: Record<string, string[]>) {
    const qs =
      filters && Object.keys(filters).length
        ? `?filters=${encodeURIComponent(JSON.stringify(filters))}`
        : ""
    return this.stream<IncomingMessage>(`/events${qs}`)
  }

  // -----------------------------
  // Containers
  // -----------------------------
  // Pause container
  pauseContainer(id: string) {
    return this.post<void>(`/containers/${id}/pause`)
  }

  // Unpause container
  unpauseContainer(id: string) {
    return this.post<void>(`/containers/${id}/unpause`)
  }

  // Kill container
  killContainer(id: string, signal = "SIGKILL") {
    return this.post<void>(`/containers/${id}/kill?signal=${signal}`)
  }

  // Resize TTY
  resizeContainerTTY(id: string, height: number, width: number) {
    return this.post<void>(`/containers/${id}/resize?h=${height}&w=${width}`)
  }

  // Update container resources
  updateContainer(
    id: string,
    config: {
      CpuShares?: number
      Memory?: number
      MemorySwap?: number
      BlkioWeight?: number
      CpuPeriod?: number
      CpuQuota?: number
      CpusetCpus?: string
      CpusetMems?: string
      PidsLimit?: number
    },
  ) {
    return this.post(`/containers/${id}/update`, config)
  }

  // List processes inside container
  topContainer(id: string, psArgs = "-ef") {
    return this.get<{ Titles: string[]; Processes: string[][] }>(
      `/containers/${id}/top?ps_args=${encodeURIComponent(psArgs)}`,
    )
  }

  // Wait for container to exit
  waitContainer(id: string, condition: "not-running" | "next-exit" = "not-running") {
    return this.post<{ StatusCode: number }>(`/containers/${id}/wait?condition=${condition}`)
  }

  // Stat container archive (HEAD)
  statContainerArchive(id: string, path: string) {
    return this.request<IncomingMessage>({
      path: `/containers/${id}/archive?path=${encodeURIComponent(path)}`,
      method: "HEAD",
    })
  }

  listContainers(all = true) {
    return this.get<ContainerSummaryResponse[]>(`/containers/json?all=${all ? 1 : 0}`)
  }

  inspectContainer(id: string) {
    return this.get<ContainerInspectResponse>(`/containers/${id}/json`)
  }

  createContainer(config: unknown, query?: Record<string, string>) {
    const qs = query ? `?${new URLSearchParams(query).toString()}` : ""
    return this.post<ContainerCreateResponse>(`/containers/create${qs}`, config)
  }

  startContainer(id: string) {
    return this.post<void>(`/containers/${id}/start`)
  }

  stopContainer(id: string, timeout?: number) {
    const qs = timeout ? `?t=${timeout}` : ""
    return this.post<void>(`/containers/${id}/stop${qs}`)
  }

  restartContainer(id: string, timeout?: number) {
    const qs = timeout ? `?t=${timeout}` : ""
    return this.post<void>(`/containers/${id}/restart${qs}`)
  }

  removeContainer(id: string, opts: { force?: boolean; volumes?: boolean } = {}) {
    const qs = new URLSearchParams()
    if (opts.force) qs.set("force", "1")
    if (opts.volumes) qs.set("v", "1")
    return this.delete<void>(`/containers/${id}?${qs.toString()}`)
  }

  logs(id: string, follow = false, stdout = true, stderr = true) {
    const qs = new URLSearchParams({
      stdout: stdout ? "1" : "0",
      stderr: stderr ? "1" : "0",
      follow: follow ? "1" : "0",
    })
    return this.stream<IncomingMessage>(`/containers/${id}/logs?${qs.toString()}`)
  }

  stats(id: string, stream = true) {
    return this.stream<IncomingMessage>(`/containers/${id}/stats?stream=${stream ? 1 : 0}`)
  }

  // -----------------------------
  // Attach (multiplexed or raw)
  // -----------------------------
  async attachContainer(
    id: string,
    opts: {
      logs?: boolean
      stream?: boolean
      stdin?: boolean
      stdout?: boolean
      stderr?: boolean
      detachKeys?: string
      tty?: boolean
    } = {},
  ) {
    const qs = new URLSearchParams({
      logs: opts.logs ? "1" : "0",
      stream: opts.stream ? "1" : "0",
      stdin: opts.stdin ? "1" : "0",
      stdout: opts.stdout ? "1" : "0",
      stderr: opts.stderr ? "1" : "0",
    })

    if (opts.detachKeys) qs.set("detachKeys", opts.detachKeys)

    const stream = await this.post<IncomingMessage>(`/containers/${id}/attach?${qs.toString()}`, {})

    if (opts.tty) return stream // raw stream

    return new DockerMultiplexedStream(stream)
  }

  // -----------------------------
  // Exec
  // -----------------------------
  createExec(id: string, config: unknown) {
    return this.post<ExecCreateResponse>(`/containers/${id}/exec`, config)
  }

  startExec(execId: string, config: unknown) {
    return this.post<IncomingMessage>(`/exec/${execId}/start`, config)
  }

  async startExecMultiplexed(execId: string, config: unknown) {
    const stream = await this.post<IncomingMessage>(`/exec/${execId}/start`, config)
    return new DockerMultiplexedStream(stream)
  }

  // -----------------------------
  // Images
  // -----------------------------
  listImages() {
    return this.get<ImageSummary[]>("/images/json")
  }

  inspectImage(name: string) {
    return this.get<ImageInspectResponse>(`/images/${encodeURIComponent(name)}/json`)
  }

  pullImage(name: string, tag?: string) {
    const qs = new URLSearchParams({ fromImage: name })
    if (tag) qs.set("tag", tag)
    return this.stream<IncomingMessage>(`/images/create?${qs.toString()}`)
  }

  removeImage(name: string, force = false) {
    return this.delete<void>(`/images/${encodeURIComponent(name)}?force=${force ? 1 : 0}`)
  }

  // -----------------------------
  // Networks
  // -----------------------------
  // List networks
  listNetworks(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.get<any[]>(`/networks${qs}`)
  }

  // Connect container to network
  connectNetwork(
    network: string,
    config: {
      Container: string
      EndpointConfig?: {
        IPAMConfig?: {
          IPv4Address?: string
          IPv6Address?: string
          LinkLocalIPs?: string[]
        }
        Links?: string[]
        Aliases?: string[]
      }
    },
  ) {
    return this.post(`/networks/${network}/connect`, config)
  }

  // Disconnect container from network
  disconnectNetwork(network: string, config: { Container: string; Force?: boolean }) {
    return this.post(`/networks/${network}/disconnect`, config)
  }

  async networkInspect(name: string) {
    return this.get(`/networks/${name}`)
  }

  async networkCreate(config: { Name: string; Driver?: string; Labels?: Record<string, string> }) {
    return this.post(`/networks/create`, config)
  }

  async networkRemove(name: string) {
    return this.delete(`/networks/${name}`)
  }

  // -----------------------------
  // Volumes
  // -----------------------------
  listVolumes(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.get<{
      Volumes: Array<{
        Name: string
        Driver: string
        Mountpoint: string
        Labels?: Record<string, string>
        Scope: string
      }>
      Warnings?: string[]
    }>(`/volumes${qs}`)
  }

  async volumeInspect(name: string) {
    return this.get(`/volumes/${name}`)
  }

  async volumeCreate(config: { Name: string; Driver?: string; Labels?: Record<string, string> }) {
    return this.post(`/volumes/create`, config)
  }

  async volumeRemove(name: string) {
    return this.delete(`/volumes/${name}`)
  }

  // -----------------------------
  // Secrets
  // -----------------------------
  async secretInspect(name: string) {
    return this.get(`/secrets/${name}`)
  }

  async secretCreate(config: { Name: string; Data: string }) {
    return this.post(`/secrets/create`, config)
  }

  async secretRemove(name: string) {
    return this.delete(`/secrets/${name}`)
  }

  // -----------------------------
  // Configs
  // -----------------------------
  async configInspect(name: string) {
    return this.get(`/configs/${name}`)
  }

  async configCreate(config: { Name: string; Data: string }) {
    return this.post(`/configs/create`, config)
  }

  async configRemove(name: string) {
    return this.delete(`/configs/${name}`)
  }

  // -----------------------------
  // Prune
  // -----------------------------
  containerPrune(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.post(`/containers/prune${qs}`)
  }

  imagePrune(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.post(`/images/prune${qs}`)
  }

  networkPrune(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.post(`/networks/prune${qs}`)
  }

  volumePrune(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.post(`/volumes/prune${qs}`)
  }

  buildCachePrune(filters?: Record<string, string[]>) {
    const qs = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
    return this.post(`/build/prune${qs}`)
  }

  buildImage(tarStream: NodeJS.ReadableStream, options: Record<string, string> = {}) {
    const qs = new URLSearchParams(options).toString()
    return this.client.request<IncomingMessage>({
      path: `/${this.apiVersion}/build?${qs}`,
      method: "POST",
      headers: { "Content-Type": "application/x-tar" },
      body: tarStream,
      stream: true,
    })
  }

  buildPrune(filters?: Record<string, string[]>) {
    return this.buildCachePrune(filters)
  }

  commitContainer(
    id: string,
    options: {
      repo?: string
      tag?: string
      comment?: string
      author?: string
      pause?: boolean
      changes?: string[]
    } = {},
  ) {
    const qs = new URLSearchParams()

    if (options.repo) qs.set("repo", options.repo)
    if (options.tag) qs.set("tag", options.tag)
    if (options.comment) qs.set("comment", options.comment)
    if (options.author) qs.set("author", options.author)
    if (options.pause !== undefined) qs.set("pause", options.pause ? "1" : "0")
    if (options.changes) qs.set("changes", options.changes.join("\n"))

    return this.post(`/commit?container=${id}&${qs.toString()}`)
  }

  exportContainer(id: string) {
    return this.stream<IncomingMessage>(`/containers/${id}/export`)
  }

  importImage(tarStream: NodeJS.ReadableStream) {
    return this.client.request<IncomingMessage>({
      path: `/${this.apiVersion}/images/load`,
      method: "POST",
      headers: { "Content-Type": "application/x-tar" },
      body: tarStream,
      stream: true,
    })
  }

  saveImages(names: string[]) {
    const qs = new URLSearchParams()
    for (const n of names) qs.append("names", n)
    return this.stream<IncomingMessage>(`/images/get?${qs.toString()}`)
  }

  getContainerArchive(id: string, path: string) {
    const qs = new URLSearchParams({ path })
    return this.stream<IncomingMessage>(`/containers/${id}/archive?${qs.toString()}`)
  }

  putContainerArchive(id: string, path: string, tarStream: NodeJS.ReadableStream) {
    const qs = new URLSearchParams({ path })
    return this.client.request({
      path: `/${this.apiVersion}/containers/${id}/archive?${qs.toString()}`,
      method: "PUT",
      headers: { "Content-Type": "application/x-tar" },
      body: tarStream,
    })
  }

  systemDf() {
    return this.get(`/system/df`)
  }

  // -----------------------------
  // Low-level helpers
  // -----------------------------
  private get<T>(path: string) {
    return this.request<T>({ path, method: "GET" })
  }

  private post<T>(path: string, body?: unknown) {
    return this.request<T>({ path, method: "POST", body })
  }

  private delete<T>(path: string) {
    return this.request<T>({ path, method: "DELETE" })
  }

  private stream<T>(path: string) {
    return this.request<T>({ path, stream: true })
  }

  private request<T>(options: DockerRequestOptions): Promise<T> {
    const versionedPath = `/${this.apiVersion}${
      options.path.startsWith("/") ? options.path : `/${options.path}`
    }`

    return this.client.request<T>({
      ...options,
      path: versionedPath,
      apiVersion: this.apiVersion,
    })
  }
}
