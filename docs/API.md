# DockerDaemonClient

`DockerDaemonClient` is a thin, typed wrapper around the Docker Engine HTTP API (default `v1.54`), built on top of a pluggable `LocalClient`.

## 1\. Construction

```ts
// localClient must implement: request(options: DockerRequestOptions): Promise<T>
import { DockerDaemonClient } from "./docker/dockerDaemonClient"
import { DEFAULT_DOCKER_API_VERSION } from "./docker/clients/localClient"
import { createLocalClient } from "./docker/clients/unixSocketClient" // example

const localClient = createLocalClient("/var/run/docker.sock")

const docker = new DockerDaemonClient(
  localClient,
  DEFAULT_DOCKER_API_VERSION, // "v1.54"
)
```

## 2\. System

### 2.1 `version()` GET

Get Docker Engine version and API compatibility.

```ts
const version = await docker.version()
console.log(version.Version, version.ApiVersion)
```

### 2.2 `info()` GET

Get detailed daemon info (containers, images, driver, etc.).

```ts
const info = await docker.info()
console.log(info.Containers, info.Driver)
```

### 2.3 `systemDf()` GET

Show disk usage for images, containers, volumes, and build cache.

```ts
const df = await docker.systemDf()
console.log(df.LayersSize, df.Images.length)
```

## 3\. Containers

### 3.1 `listContainers(all = true)` GET

```ts
const containers = await docker.listContainers(true)
for (const c of containers) {
  console.log(c.Id, c.Image, c.State)
}
```

### 3.2 `createContainer(config)` / `startContainer(id)`

```ts
const created = await docker.createContainer({
  Image: "alpine",
  Cmd: ["sh", "-c", "echo hello && sleep 60"],
  Tty: true,
})
await docker.startContainer(created.Id)
```

### 3.3 `stopContainer(id, timeout?)` / `removeContainer(id, opts?)`

```ts
await docker.stopContainer("abc123", 5)
await docker.removeContainer("abc123", { force: true, volumes: true })
```

### 3.4 `logs(id, follow?, stdout?, stderr?)` STREAM

```ts
const stream = await docker.logs("abc123", true, true, true)
stream.on("data", (chunk) => process.stdout.write(chunk))
```

### 3.5 `stats(id, stream?)` STREAM

```ts
const statsStream = await docker.stats("abc123", true)
statsStream.on("data", (chunk) => console.log(chunk.toString()))
```

## 4\. Exec & Attach

### 4.1 `createExec(id, config)` / `startExec(execId, config)`

```ts
const exec = await docker.createExec("abc123", {
  Cmd: ["ls", "/"],
  AttachStdout: true,
  AttachStderr: true,
})
const execStream = await docker.startExec(exec.Id, { Detach: false })
execStream.on("data", (chunk) => process.stdout.write(chunk))
```

### 4.2 `startExecMultiplexed(execId, config)`

Returns a `DockerMultiplexedStream` that demuxes stdout/stderr.

```ts
const mux = await docker.startExecMultiplexed(exec.Id, {
  Detach: false,
  Tty: false,
  AttachStdout: true,
  AttachStderr: true,
})

mux.onStdout((chunk) => process.stdout.write(chunk))
mux.onStderr((chunk) => process.stderr.write(chunk))
```

### 4.3 `attachContainer(id, opts)`

- `tty: true` → raw stream
- `tty: false` → multiplexed stream

```ts
// Raw TTY attach
const raw = await docker.attachContainer("abc123", {
  stdin: true,
  stdout: true,
  stderr: true,
  stream: true,
  tty: true,
})
process.stdin.pipe(raw).pipe(process.stdout)

// Multiplexed attach
const muxAttach = await docker.attachContainer("abc123", {
  stdin: true,
  stdout: true,
  stderr: true,
  stream: true,
  tty: false,
})
muxAttach.onStdout((chunk) => process.stdout.write(chunk))
muxAttach.onStderr((chunk) => process.stderr.write(chunk))
```

## 5\. Images

### 5.1 `listImages()` / `inspectImage(name)`

```ts
const images = await docker.listImages()
const nginx = await docker.inspectImage("nginx:latest")
console.log(nginx.Id, nginx.RepoTags)
```

### 5.2 `pullImage(name, tag?)` STREAM

```ts
const pullStream = await docker.pullImage("nginx", "latest")
pullStream.on("data", (chunk) => process.stdout.write(chunk))
```

### 5.3 `removeImage(name, force?)`

```ts
await docker.removeImage("nginx:old", true)
```

### 5.4 `buildImage(tarStream, options)` STREAM

Build an image from a tarred build context.

```ts
import fs from "node:fs"

const tarStream = fs.createReadStream("context.tar")
const buildStream = await docker.buildImage(tarStream, {
  t: "myimg:latest",
  dockerfile: "Dockerfile",
})

buildStream.on("data", (chunk) => process.stdout.write(chunk))
```

### 5.5 `commitContainer(id, options)`

```ts
const res = await docker.commitContainer("abc123", {
  repo: "snapshot",
  tag: "v1",
  comment: "debug snapshot",
  author: "john",
  pause: true,
  changes: ['CMD ["node", "server.js"]'],
})
console.log(res.Id)
```

### 5.6 `saveImages(names)` / `importImage(tarStream)`

```ts
import fs from "node:fs"

// Save images to tar
const saveStream = await docker.saveImages(["nginx", "redis"])
saveStream.pipe(fs.createWriteStream("images.tar"))

// Load images from tar
const loadStream = fs.createReadStream("images.tar")
await docker.importImage(loadStream)
```

## 6\. Networks & Volumes

### 6.1 Networks

```ts
await docker.networkCreate({ Name: "mynet", Driver: "bridge" })
const net = await docker.networkInspect("mynet")
console.log(net.Name)
await docker.networkRemove("mynet")
```

### 6.2 Volumes

```ts
await docker.volumeCreate({ Name: "myvol", Driver: "local" })
const vol = await docker.volumeInspect("myvol")
console.log(vol.Name)
await docker.volumeRemove("myvol")
```

## 7\. Secrets & Configs

### 7.1 Secrets

```ts
await docker.secretCreate({ Name: "api-key", Data: "supersecret" })
const sec = await docker.secretInspect("api-key")
console.log(sec.ID)
await docker.secretRemove("api-key")
```

### 7.2 Configs

```ts
await docker.configCreate({ Name: "app-config", Data: "key=value" })
const cfg = await docker.configInspect("app-config")
console.log(cfg.ID)
await docker.configRemove("app-config")
```

## 8\. Prune APIs

### 8.1 Containers, Images, Networks, Volumes, Build Cache

```ts
await docker.containerPrune({ label: ["env=dev"] })
await docker.imagePrune()
await docker.networkPrune()
await docker.volumePrune()
await docker.buildCachePrune()
```

## 9\. Export / Archive

### 9.1 `exportContainer(id)`

```ts
import fs from "node:fs"

const exportStream = await docker.exportContainer("abc123")
exportStream.pipe(fs.createWriteStream("rootfs.tar"))
```

### 9.2 `getContainerArchive(id, path)` / `putContainerArchive(id, path, tarStream)`

```ts
import fs from "node:fs"

// Download /etc from container
const etcStream = await docker.getContainerArchive("abc123", "/etc")
etcStream.pipe(fs.createWriteStream("etc.tar"))

// Upload new files into /app
const appTar = fs.createReadStream("app.tar")
await docker.putContainerArchive("abc123", "/app", appTar)
```
