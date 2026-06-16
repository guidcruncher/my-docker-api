import yaml from "yaml"

import type { DockerComposeFile } from "./types-docker"

export interface ComposeParser {
  parse(input: string): any
}

export const YamlParser: ComposeParser = {
  parse(input: string) {
    return yaml.parse(input)
  },
}

export const JsonParser: ComposeParser = {
  parse(input: string) {
    return JSON.parse(input)
  },
}

export class ComposeLoader {
  /**
   * Generic loader that accepts a parser implementation.
   * Parser must expose: parse(string) → object
   */
  static load(
    composeText: string,
    parser: ComposeParser = YamlParser,
    envLines: string[] = [],
  ): DockerComposeFile {
    let raw: any

    try {
      raw = parser.parse(composeText)
    } catch (err) {
      // TS‑safe error cause assignment
      const e = new Error("Invalid compose input: " + (err as Error).message)
      ;(e as any).cause = err
      throw e
    }

    if (!raw?.services) {
      throw new Error("compose file must contain services")
    }

    // 1. Build environment map
    const env = this.buildEnvMap(envLines)

    // 2. Deep‑clone and interpolate variables
    const resolved = this.interpolate(raw, env)

    // 3. Normalize missing sections
    return {
      services: resolved.services,
      networks: resolved.networks ?? {},
      volumes: resolved.volumes ?? {},
      secrets: resolved.secrets ?? {},
      configs: resolved.configs ?? {},
    }
  }

  // -----------------------------------------------------
  // ENV MAP
  // -----------------------------------------------------
  private static buildEnvMap(envLines: string[]): Record<string, string> {
    const env: Record<string, string> = {}

    // 1. Start with system environment
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === "string") env[k] = v
    }

    // 2. Merge env lines (override system env)
    for (const line of envLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const eq = trimmed.indexOf("=")
      if (eq === -1) continue

      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      env[key] = value
    }

    return env
  }

  // -----------------------------------------------------
  // VARIABLE INTERPOLATION
  // -----------------------------------------------------
  private static interpolate(obj: any, env: Record<string, string>): any {
    if (typeof obj === "string") {
      return this.expandString(obj, env)
    }

    if (Array.isArray(obj)) {
      return obj.map((v) => this.interpolate(v, env))
    }

    if (obj && typeof obj === "object") {
      const out: any = {}
      for (const [k, v] of Object.entries(obj)) {
        out[k] = this.interpolate(v, env)
      }
      return out
    }

    return obj
  }

  private static expandString(str: string, env: Record<string, string>): string {
    return str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const match = expr.match(/^([A-Za-z_][A-Za-z0-9_]*)(?:(:?[-?])(.*))?$/)
      if (!match) return ""

      const [, name, op, value] = match
      const exists = Object.prototype.hasOwnProperty.call(env, name)
      const val = env[name]

      if (!op) return exists ? val : ""

      switch (op) {
        case ":-":
          return exists && val !== "" ? val : value
        case "-":
          return exists ? val : value
        case ":?":
          if (!exists || val === "") {
            throw new Error(value || `Environment variable ${name} is required`)
          }
          return val
        case "?":
          if (!exists) {
            throw new Error(value || `Environment variable ${name} is required`)
          }
          return val
        default:
          return ""
      }
    })
  }
}
