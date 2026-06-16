import { ComposeLoader } from "../src/docker/compose/loader"
import type { DockerComposeFile } from "../src/docker/compose/types-docker"

describe("ComposeLoader", () => {
  test("loads a minimal compose file", () => {
    const yaml = `
      services:
        app:
          image: node:18
          environment:
            FOO: bar
    `

    const file = ComposeLoader.load(yaml) as DockerComposeFile

    expect(Object.keys(file.services)).toContain("app")
    const app = file.services.app

    expect(app.image).toBe("node:18")
    expect(app.environment && typeof app.environment === "object").toBe(true)
    const env = app.environment as Record<string, string>
    expect(env.FOO).toBe("bar")
  })

  test("throws a wrapped error on invalid YAML", () => {
    const badYaml = `
      services:
        app:
          image: node:18
          environment:
            - invalid: yaml: here
              another: thing
              - broken
    `

    let caught: any = null
    try {
      ComposeLoader.load(badYaml)
    } catch (e) {
      caught = e
    }

    expect(caught).toBeInstanceOf(Error)
    expect(caught.message).toContain("Invalid compose input")
  })
})
