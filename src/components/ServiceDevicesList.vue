<template>
  <div class="space-y-2">
    <label class="text-xs">Devices</label>

    <div
      v-for="(item, idx) in local"
      :key="idx"
      class="flex flex-col gap-1 p-2 rounded bg-gray-900 border border-gray-700"
    >
      <!-- Host Path -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Host Path</label>
        <input
          v-model="item.host"
          class="input"
          :class="{ 'border-red-500': hostErrors(idx).value.length }"
          placeholder="/dev/ttyUSB0"
        />
        <div v-if="hostErrors(idx).value.length" class="text-red-400 text-xs">
          <div v-for="err in hostErrors(idx).value" :key="String(err)">
            {{ err }}
          </div>
        </div>
      </div>

      <!-- Container Path -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Container Path</label>
        <input
          v-model="item.container"
          class="input"
          :class="{ 'border-red-500': containerErrors(idx).value.length }"
          placeholder="/dev/ttyUSB0"
        />
        <div v-if="containerErrors(idx).value.length" class="text-red-400 text-xs">
          <div v-for="err in containerErrors(idx).value" :key="String(err)">
            {{ err }}
          </div>
        </div>
      </div>

      <!-- Remove -->
      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Device
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface DeviceItem {
  host: string
  container: string
}

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string // e.g. "services.lidarr"
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "update:modelValue", value: DockerService): void
}>()

const field = (p: string) => `${props.basePath}.${p}`

/* Local reactive copy */
const local = reactive<DeviceItem[]>(
  (props.modelValue.devices || []).map((d: string) => {
    const [host, container] = d.split(":")
    return { host: host || "", container: container || "" }
  }),
)

/* Validation */
function hostErrors(idx: number) {
  return useFieldError(props.issues, field(`devices[${idx}].host`))
}
function containerErrors(idx: number) {
  return useFieldError(props.issues, field(`devices[${idx}].container`))
}

/* Add/remove */
function add() {
  local.push({ host: "", container: "" })
}

function remove(idx: number) {
  local.splice(idx, 1)
}

/* Sync UI → modelValue */
watch(
  local,
  () => {
    const formatted = local
      .filter((d) => d.host && d.container)
      .map((d) => `${d.host}:${d.container}`)

    emit("update:modelValue", {
      ...props.modelValue,
      devices: formatted,
    })
  },
  { deep: true },
)
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full;
}
.btn-gray {
  @apply px-2 py-1 rounded bg-gray-700 text-white text-xs;
}
.btn-red {
  @apply px-2 py-1 rounded bg-red-600 text-white text-xs;
}
</style>
