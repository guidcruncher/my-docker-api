<template>
  <div class="space-y-2">
    <label class="text-xs">Networks</label>

    <div v-for="(_name, idx) in local" :key="idx" class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <input
          v-model="local[idx]"
          class="input flex-1"
          :class="{ 'border-red-500': networkErrors(idx).value.length }"
          placeholder="default"
        />
        <button class="btn-red" @click="remove(idx)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <div v-if="networkErrors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in networkErrors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Network
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import type { OCIServiceNetworkConfig } from "../docker/compose/types-oci"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

const local = reactive<string[]>(
  (() => {
    const raw = props.modelValue.networks
    if (!raw) return []
    if (Array.isArray(raw)) return [...raw]
    return Object.keys(raw as Record<string, OCIServiceNetworkConfig>)
  })(),
)

function networkErrors(idx: number) {
  return useFieldError(props.issues, field(`networks[${idx}]`))
}

function add() {
  local.push("")
}

function remove(idx: number) {
  local.splice(idx, 1)
}

watch(
  local,
  () => {
    const names = local.map((n) => n.trim()).filter(Boolean)

    emit("update:modelValue", {
      ...props.modelValue,
      networks: names.length ? names : undefined,
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
  @apply px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1;
}
</style>
