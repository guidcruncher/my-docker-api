import { parseDurationToSeconds } from "../src/docker/utils/durationToSeconds"

describe("parseDurationToSeconds()", () => {
  //
  // MICROSECONDS + NANOSECONDS
  //
  test("parses microseconds (us)", () => {
    expect(parseDurationToSeconds("1us")).toBe(0)
    expect(parseDurationToSeconds("999999us")).toBe(0)
    expect(parseDurationToSeconds("1000000us")).toBe(1)
  })

  test("parses nanoseconds (ns)", () => {
    expect(parseDurationToSeconds("1ns")).toBe(0)
    expect(parseDurationToSeconds("999999999ns")).toBe(0)
    expect(parseDurationToSeconds("1000000000ns")).toBe(1)
  })

  //
  // MILLISECONDS
  //
  test("parses milliseconds", () => {
    expect(parseDurationToSeconds("500ms")).toBe(0)
    expect(parseDurationToSeconds("1500ms")).toBe(1)
  })

  //
  // SECONDS
  //
  test("parses seconds", () => {
    expect(parseDurationToSeconds("1s")).toBe(1)
    expect(parseDurationToSeconds("10s")).toBe(10)
  })

  //
  // MINUTES
  //
  test("parses minutes", () => {
    expect(parseDurationToSeconds("1m")).toBe(60)
    expect(parseDurationToSeconds("2.5m")).toBe(150)
  })

  //
  // HOURS
  //
  test("parses hours", () => {
    expect(parseDurationToSeconds("1h")).toBe(3600)
    expect(parseDurationToSeconds("2h")).toBe(7200)
  })

  //
  // DAYS
  //
  test("parses days", () => {
    expect(parseDurationToSeconds("1d")).toBe(86400)
    expect(parseDurationToSeconds("2d")).toBe(172800)
  })

  //
  // BARE NUMBERS
  //
  test("parses bare numbers as milliseconds", () => {
    expect(parseDurationToSeconds("1000")).toBe(1)
    expect(parseDurationToSeconds("200")).toBe(0)
  })

  //
  // WHITESPACE
  //
  test("trims whitespace", () => {
    expect(parseDurationToSeconds("  10s ")).toBe(10)
  })

  //
  // INVALID INPUTS
  //
  test("throws on invalid format", () => {
    expect(() => parseDurationToSeconds("abc")).toThrow()
    expect(() => parseDurationToSeconds("10x")).toThrow()
    expect(() => parseDurationToSeconds("s10")).toThrow()
  })

  test("throws on empty string", () => {
    expect(() => parseDurationToSeconds("")).toThrow()
  })
})
