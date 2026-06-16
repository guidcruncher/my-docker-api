import fs from "node:fs"

export class EnvManager {
  buildEnv(env?: Record<string, string> | string[], envFiles?: string[]): string[] {
    const out: Record<string, string> = {}

    for (const file of envFiles ?? []) {
      const content = fs.readFileSync(file, "utf8")
      for (const line of content.split("\n")) {
        if (!line.includes("=")) continue
        const [k, v] = line.split("=")
        out[k.trim()] = v.trim()
      }
    }

    if (Array.isArray(env)) {
      for (const e of env) {
        if (e.includes("=")) {
          const [k, v] = e.split("=")
          out[k] = v
        } else {
          out[e] = process.env[e] ?? ""
        }
      }
    } else if (env) {
      for (const [k, v] of Object.entries(env)) {
        out[k] = v
      }
    }

    return Object.entries(out).map(([k, v]) => `${k}=${v}`)
  }
}
