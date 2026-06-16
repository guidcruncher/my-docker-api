<template>
  <div class="flex flex-col h-full">
    <!-- TOOLBAR -->
    <ComposeToolbar
      :isValid="validation.isValid"
      :status="toolbarStatus"
      @new="resetCompose"
      @save="saveYaml"
      @format="formatYaml"
      @validate="runValidation"
      @toggleSidebar="toggleSidebar"
      @oci="generateOci"
    />

    <!-- GLOBAL TABS -->
    <div class="flex gap-2 border-b border-gray-700 p-3">
      <button
        v-for="tab in tabs"
        :key="tab"
        class="px-3 py-1 text-sm rounded"
        :class="activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- TAB CONTENT -->
    <div class="flex-1 overflow-y-auto">
      <!-- SERVICES TAB -->
      <div v-if="activeTab === 'Services'" class="flex flex-1 h-full min-h-0">
        <!-- SIDEBAR -->
        <div
          v-if="sidebarOpen"
          class="h-full flex-shrink-0 border-r border-gray-800 bg-gray-900 transition-all duration-200"
          style="width: 260px"
        >
          <ServiceSidebar
            :services="services"
            :selected="activeService"
            :issues="serviceIssues"
            @select="activeService = $event"
            @add="addService"
            @remove="removeService"
          />
        </div>

        <!-- SERVICE EDITOR -->
        <div class="flex-1 p-4 overflow-y-auto min-h-0">
          <div v-if="activeService">
            <ServiceEditor
              :key="activeService"
              :model-value="services[activeService]"
              :issues="serviceIssues[activeService] || []"
              :base-path="`services.${activeService}`"
              @update:model-value="(updated: any) => (services[activeService] = updated)"
            />
          </div>
          <div v-else class="text-gray-400 text-sm">No service selected.</div>
        </div>
      </div>

      <!-- NETWORKS TAB -->
      <div v-if="activeTab === 'Networks'" class="p-4">
        <NetworkEditor v-model="networks" />
      </div>

      <!-- VOLUMES TAB -->
      <div v-if="activeTab === 'Volumes'" class="p-4">
        <VolumeEditor v-model="volumes" />
      </div>

      <!-- SECRETS TAB -->
      <div v-if="activeTab === 'Secrets'" class="p-4">
        <SecretEditor v-model="secrets" />
      </div>

      <!-- CONFIGS TAB -->
      <div v-if="activeTab === 'Configs'" class="p-4">
        <ConfigEditor v-model="configs" />
      </div>

      <!-- YAML TAB -->
      <div v-if="activeTab === 'YAML'" class="p-4">
        <textarea
          v-model="yamlInput"
          @input="sync.onYamlChanged(yamlInput)"
          class="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm w-full h-[600px] font-mono"
        ></textarea>
      </div>
    </div>
  </div>

  <Dialog v-model="showOciDialog" title="OCI Compliant Compose" :closeOnBackdrop="true">
    <p class="text-slate-700 dark:text-slate-300">
      <textarea
        v-model="yamlOciOutput"
        class="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm w-full h-[300px] font-mono"
      ></textarea>
    </p>

    <template #footer>
      <button
        class="px-3 py-1.5 rounded-md text-sm border border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        @click="showOciDialog = false"
      >
        Cancel
      </button>

      <button
        class="px-3 py-1.5 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-500"
        @click="showOciDialog = false"
      >
        OK
      </button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from "vue"

import { LiveYamlSync } from "../docker/compose/liveYamlSync"
import { ComposeSerializer } from "../docker/compose/composeSerializer"
import { ComposeValidator } from "../docker/compose/composeValidator"
import { dockerToOCI } from "../docker/compose/dockerToOci"

import type {
  DockerService,
  DockerNetwork,
  DockerVolume,
  DockerSecret,
  DockerConfig,
} from "../docker/compose/types-docker"
import type { OCIComposeFile } from "../docker/compose/types-oci"

import type { ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: {
    services: Record<string, DockerService>
    networks: Record<string, DockerNetwork>
    volumes: Record<string, DockerVolume>
    secrets: Record<string, DockerSecret>
    configs: Record<string, DockerConfig>
  }
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])
const showOciDialog = ref(false)
const yamlOciOutput = ref("")

/* REACTIVE MODEL */
let services = reactive({ ...props.modelValue.services })
let networks = reactive({ ...props.modelValue.networks })
let volumes = reactive({ ...props.modelValue.volumes })
let secrets = reactive({ ...props.modelValue.secrets })
let configs = reactive({ ...props.modelValue.configs })

/* SIDEBAR STATE */
let activeService = ref<string>(Object.keys(services)[0] || "")

/* TABS */
const tabs = ["Services", "Networks", "Volumes", "Secrets", "Configs", "YAML"]
const activeTab = ref("Services")

/* YAML INPUT */
const yamlInput = ref("")

/* LIVE SYNC */
const sync = new LiveYamlSync(yamlInput, {
  services,
  networks,
  volumes,
  secrets,
  configs,
})

watch(
  () => ({ services, networks, volumes, secrets, configs }),
  () => sync.onUiChanged(),
  { deep: true },
)

/* VALIDATION */
const validation = computed(() =>
  ComposeValidator.validate({
    services,
    networks,
    volumes,
    secrets,
    configs,
  }),
)

/* SERVICE ISSUES (keyed by service name) */
const serviceIssues = computed<Record<string, ValidationIssue[]>>(() => {
  const map: Record<string, ValidationIssue[]> = {}
  for (const svc of validation.value.services) {
    map[svc.service] = svc.issues
  }
  return map
})

/* TOOLBAR STATUS */
const toolbarStatus = ref("Ready")

/* TOOLBAR ACTIONS */
function resetCompose() {
  Object.keys(services).forEach((k) => delete services[k])
  Object.keys(networks).forEach((k) => delete networks[k])
  Object.keys(volumes).forEach((k) => delete volumes[k])
  Object.keys(secrets).forEach((k) => delete secrets[k])
  Object.keys(configs).forEach((k) => delete configs[k])

  toolbarStatus.value = "New compose created"
}

function saveYaml() {
  const yaml = ComposeSerializer.serialize({
    services,
    networks,
    volumes,
    secrets,
    configs,
  })

  const blob = new Blob([yaml], { type: "text/yaml" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = "docker-compose.yaml"
  a.click()

  URL.revokeObjectURL(url)
  toolbarStatus.value = "Saved"
}

function formatYaml() {
  yamlInput.value = ComposeSerializer.serialize({
    services,
    networks,
    volumes,
    secrets,
    configs,
  })
  toolbarStatus.value = "Formatted"
}

function runValidation() {
  toolbarStatus.value = validation.value.isValid ? "Compose is valid" : "Compose has issues"
}

/* EMIT UPDATED MODEL */
watch(
  () => ({ services, networks, volumes, secrets, configs }),
  () => {
    emit("update:modelValue", {
      services,
      networks,
      volumes,
      secrets,
      configs,
    })
  },
  { deep: true },
)

/* SERVICE MANAGEMENT */
function addService() {
  const name = "service_" + Math.random().toString(36).slice(2, 7)
  services[name] = {}
  activeService.value = name
}

function removeService(name: string) {
  delete services[name]
  const keys = Object.keys(services)
  activeService.value = keys[0] || ""
}

/* SIDEBAR TOGGLE */
const sidebarOpen = ref(localStorage.getItem("compose.sidebarOpen") !== "0")

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
  localStorage.setItem("compose.sidebarOpen", sidebarOpen.value ? "1" : "0")
}

function generateOci() {
  const res: OCIComposeFile = dockerToOCI({
    services,
    networks,
    volumes,
    secrets,
    configs,
  })
  yamlOciOutput.value = ComposeSerializer.rawSerialize(res)
  showOciDialog.value = true
}
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full;
}
</style>
