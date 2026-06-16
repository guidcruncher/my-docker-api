<template>
  <div class="space-y-2">
    <label class="text-xs">Volumes</label>

    <div
      v-for="(item, idx) in local"
      :key="idx"
      class="flex flex-col gap-2 p-2 rounded bg-gray-900 border border-gray-700"
    >
      <!-- Type -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Type</label>
        <select
          v-model="item.type"
          class="input"
          :class="{ 'border-red-500': blockErrors(idx).value.length }"
        >
          <option value="volume">volume</option>
          <option value="bind">bind</option>
          <option value="tmpfs">tmpfs</option>
        </select>
      </div>

      <!-- Source -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Source</label>
        <input
          v-model="item.source"
          class="input"
          :class="{ 'border-red-500': blockErrors(idx).value.length }"
          placeholder="e.g. mydata or ./local/path"
        />
      </div>

      <!-- Target -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Target</label>
        <input
          v-model="item.target"
          class="input"
          :class="{ 'border-red-500': blockErrors(idx).value.length }"
          placeholder="/data"
        />
      </div>

      <!-- Read Only -->
      <div class="flex items-center gap-2">
        <input type="checkbox" v-model="item.read_only" class="w-4 h-4" />
        <label class="text-xs">Read Only</label>
      </div>

      <!-- Validation -->
      <div v-if="blockErrors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in blockErrors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>

      <!-- Remove -->
      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Volume
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface VolumeItem {
  type: "volume" | "bind" | "tmpfs"
  source: string
  target: string
  read_only: boolean
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
const local = reactive<VolumeItem[]>(
  (props.modelValue.volumes || []).map((v: any) => ({
    type: v.type || "volume",
    source: v.source || "",
    target: v.target || "",
    read_only: !!v.read_only,
  })),
)

/* Validation */
function blockErrors(idx: number) {
  return useFieldError(props.issues, field(`volumes[${idx}]`))
}

/* Add/remove */
function add() {
  local.push({
    type: "volume",
    source: "",
    target: "",
    read_only: false,
  })
}

function remove(idx: number) {
  local.splice(idx, 1)
}

/* Sync UI → modelValue */
watch(
  local,
  () => {
    emit("update:modelValue", {
      ...props.modelValue,
      volumes: local.map((v) => ({
        type: v.type,
        source: v.source,
        target: v.target,
        read_only: v.read_only,
      })),
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
