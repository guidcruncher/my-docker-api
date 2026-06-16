<template>
  <div class="space-y-2">
    <label class="text-xs">Security Options</label>

    <div v-for="(_, idx) in local" :key="idx" class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <input
          v-model="local[idx]"
          class="input flex-1"
          :class="{ 'border-red-500': securityOptErrors(idx).value.length }"
          placeholder="e.g. no-new-privileges"
        />
        <button class="btn-red" @click="remove(idx)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <div v-if="securityOptErrors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in securityOptErrors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Security Opt
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

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
const local = reactive<string[]>([...(props.modelValue.security_opt || [])])

/* Validation for each entry */
function securityOptErrors(idx: number) {
  return useFieldError(props.issues, field(`security_opt[${idx}]`))
}

/* Add/remove */
function add() {
  local.push("")
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
      security_opt: [...local],
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
