export const parseDurationToSeconds = (input: string): number => {
  const match = input.trim().match(/^(\d+(?:\.\d+)?)(ns|us|ms|s|m|h|d)?$/i)
  if (!match) throw new Error(`Invalid duration: ${input}`)

  const value = parseFloat(match[1])
  const unit = match[2]?.toLowerCase() ?? "ms"

  switch (unit) {
    case "ns":
      return Math.floor(value / 1_000_000_000)
    case "us":
      return Math.floor(value / 1_000_000)
    case "ms":
      return Math.floor(value / 1000)
    case "s":
      return Math.floor(value)
    case "m":
      return Math.floor(value * 60)
    case "h":
      return Math.floor(value * 3600)
    case "d":
      return Math.floor(value * 86400)
    default:
      throw new Error(`Unknown duration unit: ${unit}`)
  }
}
