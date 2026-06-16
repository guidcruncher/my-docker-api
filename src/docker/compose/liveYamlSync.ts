import { useComposeImporter } from "../../composables/useComposeImporter"
import { debounce } from "../../utils/debounce"
import { ComposeSerializer } from "./composeSerializer"

export class LiveYamlSync {
  private lastYamlFromUI = ""
  private lastYamlFromEditor = ""
  private importer = useComposeImporter()

  constructor(
    private yamlRef: any, // ref<string>
    private modelRefs: {
      services: any
      networks: any
      volumes: any
      secrets: any
      configs: any
    },
  ) {}

  /** Called when YAML editor changes */
  onYamlChanged = debounce((newYaml: string) => {
    if (newYaml === this.lastYamlFromUI) return

    this.lastYamlFromEditor = newYaml

    try {
      const model = this.importer.importYaml(newYaml)

      // mutate instead of replace
      this.mutate(this.modelRefs.services, model.services)
      this.mutate(this.modelRefs.networks, model.networks)
      this.mutate(this.modelRefs.volumes, model.volumes)
      this.mutate(this.modelRefs.secrets, model.secrets)
      this.mutate(this.modelRefs.configs, model.configs)
    } catch {
      // ignore parse errors until YAML is valid
    }
  }, 200)

  /** Called when UI changes */
  onUiChanged = debounce(() => {
    const yaml = ComposeSerializer.serialize({
      services: this.modelRefs.services,
      networks: this.modelRefs.networks,
      volumes: this.modelRefs.volumes,
      secrets: this.modelRefs.secrets,
      configs: this.modelRefs.configs,
    })

    if (yaml === this.lastYamlFromEditor) return

    this.lastYamlFromUI = yaml
    this.yamlRef.value = yaml
  }, 200)

  /** Mutate reactive objects without replacing them */
  private mutate(target: any, source: any) {
    Object.keys(target).forEach((k) => delete target[k])
    Object.assign(target, source)
  }
}
