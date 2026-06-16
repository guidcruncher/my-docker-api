import { stringify } from "yaml"

export type SerializerFormat = "yaml" | "json"

function unwrap<T>(maybeRef: any): T {
  if (maybeRef && typeof maybeRef === "object" && "value" in maybeRef) {
    return maybeRef.value as T
  }
  return maybeRef as T
}

export class ComposeSerializer {
  static clean(value: any): any {
    if (value === null || value === undefined) return undefined

    if (Array.isArray(value)) {
      const cleaned = value.map((v) => ComposeSerializer.clean(v)).filter((v) => v !== undefined)
      return cleaned.length > 0 ? cleaned : undefined
    }

    if (typeof value === "object") {
      const cleaned: any = {}
      for (const [key, val] of Object.entries(value)) {
        const v = ComposeSerializer.clean(val)
        if (v !== undefined) cleaned[key] = v
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined
    }

    return value
  }

  static rawSerialize(model: any, format: SerializerFormat = "yaml"): string {
    switch (format) {
      case "yaml":
        return stringify(model)
      case "json":
        return JSON.stringify(model, null, 2)
    }
    return stringify(model)
  }

  static serialize(model: any, format: SerializerFormat = "yaml"): string {
    const services = unwrap<any>(model.services)

    const cleaned: any = {
      services: ComposeSerializer.clean(services),
    }

    const passthroughKeys = ["networks", "volumes", "secrets", "configs"]

    for (const key of passthroughKeys) {
      const section = unwrap<Record<string, any>>(model[key])

      if (section && Object.keys(section).length > 0) {
        cleaned[key] = {}

        for (const [name, value] of Object.entries(section)) {
          if (value && typeof value === "object" && Object.keys(value).length > 0) {
            cleaned[key][name] = value
          } else {
            cleaned[key][name] = null
          }
        }
      }
    }

    switch (format) {
      case "yaml":
        return stringify(cleaned)
      case "json":
        return JSON.stringify(cleaned, null, 2)
    }

    return stringify(cleaned)
  }
}
