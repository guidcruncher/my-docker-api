<template>
  <div class="space-y-2">
    <label class="text-xs">Secrets</label>

    <div
      v-for="(item, idx) in local"
      :key="idx"
      class="flex flex-col gap-2 p-2 rounded bg-gray-900 border border-gray-700"
    >
      <!-- Source -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Source</label>
        <input
          v-model="item.source"
          class="input"
          :class="{ 'border-red-500': secretErrors(idx).value.length }"
          placeholder="my_secret"
        />
      </div>

      <!-- Target -->
      <div class="flex flex-col gap-1">
        <label class="text-xs">Target (optional)</label>
        <input
          v-model="item.target"
          class="input"
          :class="{ 'border-red-500': secretErrors(idx).value.length }"
          placeholder="/run/secrets/my_secret"
        />
      </div>

      <!-- Validation -->
      <div v-if="secretErrors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in secretErrors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>

      <!-- Remove -->
      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Secret
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface SecretItem {
  source: string
  target?: string
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
const local = reactive<SecretItem[]>(
  (props.modelValue.secrets || []).map((s: any) => ({
    source: typeof s === "string" ? s : s.source || "",
    target: typeof s === "string" ? undefined : s.target || "",
  })),
)

/* Validation */
function secretErrors(idx: number) {
  return useFieldError(props.issues, field(`secrets[${idx}]`))
}

/* Add/remove */
function add() {
  local.push({
    source: "",
    target: "",
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
      secrets: local.map((s) => ({
        source: s.source,
        ...(s.target ? { target: s.target } : {}),
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
