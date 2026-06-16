<template>
  <div class="space-y-2">
    <label class="text-xs">{{ title }}</label>

    <div
      v-for="(pair, idx) in local"
      :key="idx"
      class="flex flex-col gap-1 p-2 rounded bg-gray-900 border border-gray-700"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs">Key</label>
        <input
          v-model="pair.key"
          class="input"
          :class="{ 'border-red-500': keyErrors(idx).value.length }"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs">Value</label>
        <input
          v-model="pair.value"
          class="input"
          :class="{ 'border-red-500': valueErrors(idx).value.length }"
        />
      </div>

      <div
        v-if="keyErrors(idx).value.length || valueErrors(idx).value.length"
        class="text-red-400 text-xs"
      >
        <div v-for="err in [...keyErrors(idx).value, ...valueErrors(idx).value]" :key="String(err)">
          {{ err }}
        </div>
      </div>

      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Entry
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface Pair {
  key: string
  value: string
}

interface Props {
  modelValue: Record<string, string> | undefined
  issues: ValidationIssue[]
  basePath: string
  title: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

const local = reactive<Pair[]>(
  Object.entries(props.modelValue || {}).map(([k, v]) => ({
    key: k,
    value: String(v ?? ""),
  })),
)

function keyErrors(idx: number) {
  return useFieldError(props.issues, field(`${local[idx].key}`))
}
function valueErrors(idx: number) {
  return useFieldError(props.issues, field(`${local[idx].key}`))
}

function add() {
  local.push({ key: "", value: "" })
}
function remove(i: number) {
  local.splice(i, 1)
}

watch(
  local,
  () => {
    const out: Record<string, string> = {}
    for (const p of local) if (p.key.trim()) out[p.key.trim()] = p.value
    emit("update:modelValue", Object.keys(out).length ? out : undefined)
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
