import { Readable } from "stream"
import {
  DockerMultiplexedStream,
  DockerStreamType,
} from "../src/docker/streams/dockerMultiplexedStream"

function makeFrame(type: DockerStreamType, payload: Buffer) {
  const header = Buffer.alloc(8)
  header[0] = type
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

describe("DockerMultiplexedStream", () => {
  test("parses a single stdout frame", (done) => {
    const stream = new Readable({ read() {} })
    const mux = new DockerMultiplexedStream(stream)

    mux.on("stdout", (chunk) => {
      expect(chunk.toString()).toBe("hello")
      done()
    })

    stream.push(makeFrame(DockerStreamType.Stdout, Buffer.from("hello")))
    stream.push(null)
  })

  test("parses multiple frames in one chunk", (done) => {
    const stream = new Readable({ read() {} })
    const mux = new DockerMultiplexedStream(stream)

    const frames: string[] = []

    mux.on("stdout", (c) => frames.push(c.toString()))
    mux.on("stderr", (c) => frames.push("ERR:" + c.toString()))
    mux.on("end", () => {
      expect(frames).toEqual(["one", "ERR:two"])
      done()
    })

    const chunk = Buffer.concat([
      makeFrame(DockerStreamType.Stdout, Buffer.from("one")),
      makeFrame(DockerStreamType.Stderr, Buffer.from("two")),
    ])

    stream.push(chunk)
    stream.push(null)
  })

  test("handles partial frames", (done) => {
    const stream = new Readable({ read() {} })
    const mux = new DockerMultiplexedStream(stream)

    mux.on("stdout", (c) => {
      expect(c.toString()).toBe("chunked")
      done()
    })

    const full = makeFrame(DockerStreamType.Stdout, Buffer.from("chunked"))

    stream.push(full.slice(0, 5))
    stream.push(full.slice(5))
    stream.push(null)
  })

  test("emits error", (done) => {
    const stream = new Readable({ read() {} })
    const mux = new DockerMultiplexedStream(stream)

    mux.on("error", (err) => {
      expect(err.message).toBe("boom")
      done()
    })

    stream.emit("error", new Error("boom"))
  })
})
