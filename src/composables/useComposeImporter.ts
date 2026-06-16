import { parse } from "yaml"

import type {
  DockerConfig,
  DockerNetwork,
  DockerSecret,
  DockerService,
  DockerVolume,
} from "../docker/compose/types-docker"

export interface ComposeModel {
  services: Record<string, DockerService>
  networks: Record<string, DockerNetwork>
  volumes: Record<string, DockerVolume>
  secrets: Record<string, DockerSecret>
  configs: Record<string, DockerConfig>
}

/* -------------------------------------------------------
   ENVIRONMENT NORMALIZATION
------------------------------------------------------- */
function normalizeEnvironment(env: any): Record<string, string> {
  const out: Record<string, string> = {}
  if (!env) return out

  if (!Array.isArray(env) && typeof env === "object") {
    for (const k in env) out[k] = String(env[k] ?? "")
    return out
  }

  if (Array.isArray(env)) {
    for (const entry of env) {
      if (typeof entry === "string" && entry.includes("=")) {
        const idx = entry.indexOf("=")
        out[entry.slice(0, idx)] = entry.slice(idx + 1)
      }
    }
  }

  return out
}

/* -------------------------------------------------------
   SHORTHAND → LONG SYNTAX NORMALIZATION
------------------------------------------------------- */
function normalizeVolumeMount(m: any) {
  if (typeof m === "string") {
    const [source, target, mode] = m.split(":")

    const isBind =
      source.startsWith("/") ||
      source.startsWith("./") ||
      source.startsWith("../") ||
      /^[A-Za-z]:[\\/]/.test(source)

    return {
      type: isBind ? "bind" : "volume",
      source,
      target,
      read_only: mode === "ro",
    }
  }
  return m
}

function normalizeSecretMount(m: any) {
  if (typeof m === "string") {
    return {
      source: m,
      target: `/run/secrets/${m}`,
      mode: "0440",
    }
  }
  return m
}

function normalizeConfigMount(m: any) {
  if (typeof m === "string") {
    return {
      source: m,
      target: `/etc/configs/${m}`,
      mode: "0444",
    }
  }
  return m
}

function normalizeNetworkAttach(m: any) {
  // Docker short syntax: "backend"
  if (typeof m === "string") return m

  // Docker long syntax: { backend: { aliases: [...] } }
  if (typeof m === "object" && m?.name) return m.name

  return ""
}
/* -------------------------------------------------------
   ARRAY / OBJECT NORMALIZATION
------------------------------------------------------- */
function normalizeToArray<T>(value: any, mapper: (v: any) => T): T[] {
  if (!value) return []

  if (Array.isArray(value)) return value.map(mapper)

  if (typeof value === "object") {
    return Object.entries(value).map(([name, cfg]) => mapper({ name, ...(cfg || {}) }))
  }

  return []
}

/* -------------------------------------------------------
   DEPENDS_ON NORMALIZATION
------------------------------------------------------- */
function normalizeDepends(dep: any): any {
  if (!dep) return undefined

  if (Array.isArray(dep)) {
    const out: any = {}
    for (const s of dep) out[s] = { condition: "service_started" }
    return out
  }

  if (typeof dep === "object") {
    const out: any = {}
    for (const name in dep) {
      out[name] = {
        condition: dep[name]?.condition || "service_started",
      }
    }
    return out
  }

  return undefined
}

/* -------------------------------------------------------
   MAIN IMPORTER
------------------------------------------------------- */
export function useComposeImporter() {
  function importYaml(yamlText: string): ComposeModel {
    const raw = parse(yamlText) || {}

    const services: Record<string, DockerService> = {}

    for (const [name, svc] of Object.entries<any>(raw.services || {})) {
      services[name] = {
        ...svc,

        environment: normalizeEnvironment(svc.environment),

        volumes: normalizeToArray(svc.volumes, normalizeVolumeMount),
        secrets: normalizeToArray(svc.secrets, normalizeSecretMount),
        configs: normalizeToArray(svc.configs, normalizeConfigMount),
        networks: normalizeToArray(svc.networks, normalizeNetworkAttach),

        depends_on: normalizeDepends(svc.depends_on),
      }
    }

    return {
      services,
      networks: raw.networks || {},
      volumes: raw.volumes || {},
      secrets: raw.secrets || {},
      configs: raw.configs || {},
    }
  }

  return { importYaml }
}
