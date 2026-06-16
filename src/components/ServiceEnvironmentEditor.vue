<template>
  <div class="space-y-2">
    <label class="text-xs">Environment</label>

    <div v-for="(_pair, idx) in rows" :key="idx" class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <!-- KEY -->
        <input
          v-model="rows[idx].key"
          class="input w-1/3"
          placeholder="KEY"
          :class="{ 'border-red-500': errors(idx).value.length }"
        />

        <!-- VALUE -->
        <input
          v-model="rows[idx].value"
          class="input flex-1"
          placeholder="value"
          :class="{ 'border-red-500': errors(idx).value.length }"
        />

        <!-- DELETE -->
        <button class="btn-red" @click="remove(idx)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <div v-if="errors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in errors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Variable
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { ValidationIssue } from "../composables/useFieldError"
import { useFieldError } from "../composables/useFieldError"

interface Props {
  modelValue: Record<string, string> | undefined
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

/* Convert object → [{ key, value }] */
const rows = reactive<{ key: string; value: string }[]>(
  props.modelValue ? Object.entries(props.modelValue).map(([k, v]) => ({ key: k, value: v })) : [],
)

/* Validation hook */
function errors(idx: number) {
  return useFieldError(props.issues, field(`env[${idx}]`))
}

/* Add/remove */
function add() {
  rows.push({ key: "", value: "" })
}

function remove(idx: number) {
  rows.splice(idx, 1)
}

/* Emit object form */
watch(
  rows,
  () => {
    const env: Record<string, string> = {}

    for (const { key, value } of rows) {
      const k = key.trim()
      if (!k) continue
      env[k] = value
    }

    emit("update:modelValue", Object.keys(env).length ? env : undefined)
  },
  { deep: true },
)
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs;
}
.btn-gray {
  @apply px-2 py-1 rounded bg-gray-700 text-white text-xs;
}
.btn-red {
  @apply px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center justify-center;
}
</style>
