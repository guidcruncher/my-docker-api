import { EventEmitter } from "events"
import { Readable } from "stream"

export enum DockerStreamType {
  Stdin = 0,
  Stdout = 1,
  Stderr = 2,
  Unknown = 255,
}

export interface DockerFrame {
  type: DockerStreamType
  data: Buffer
}

export type DockerDemuxEvents = {
  frame: (frame: DockerFrame) => void
  stdout: (chunk: Buffer) => void
  stderr: (chunk: Buffer) => void
  stdin: (chunk: Buffer) => void
  end: () => void
  error: (err: Error) => void
}

export class DockerMultiplexedStream extends EventEmitter {
  private buffer = Buffer.alloc(0)
  private ended = false

  constructor(private readonly stream: Readable) {
    super()
    this.attach()
  }

  private attach() {
    this.stream.on("data", (chunk: Buffer) => this.onData(chunk))
    this.stream.on("end", () => this.onEnd())
    this.stream.on("error", (err) => this.onError(err))
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk])

    while (this.buffer.length >= 8) {
      const typeByte = this.buffer[0]
      const streamType =
        typeByte in DockerStreamType ? (typeByte as DockerStreamType) : DockerStreamType.Unknown

      const length = this.buffer.readUInt32BE(4)
      const frameTotal = 8 + length

      if (this.buffer.length < frameTotal) break

      const payload = this.buffer.subarray(8, frameTotal)
      this.emitFrame({ type: streamType, data: payload })

      this.buffer = this.buffer.subarray(frameTotal)
    }
  }

  private emitFrame(frame: DockerFrame) {
    this.emit("frame", frame)

    switch (frame.type) {
      case DockerStreamType.Stdout:
        this.emit("stdout", frame.data)
        break
      case DockerStreamType.Stderr:
        this.emit("stderr", frame.data)
        break
      case DockerStreamType.Stdin:
        this.emit("stdin", frame.data)
        break
      default:
        break
    }
  }

  private onEnd() {
    if (this.ended) return
    this.ended = true
    this.emit("end")
  }

  private onError(err: Error) {
    this.emit("error", err)
  }

  // Typed `on` overloads for better DX
  override on<E extends keyof DockerDemuxEvents>(event: E, listener: DockerDemuxEvents[E]): this {
    return super.on(event, listener)
  }

  override once<E extends keyof DockerDemuxEvents>(event: E, listener: DockerDemuxEvents[E]): this {
    return super.once(event, listener)
  }
}
