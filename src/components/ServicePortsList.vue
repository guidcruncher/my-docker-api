<template>
  <div class="space-y-2">
    <label class="text-xs">Ports</label>

    <div v-for="(_, idx) in local" :key="idx" class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <input
          v-model="local[idx]"
          class="input flex-1"
          :class="{ 'border-red-500': portErrors(idx).value.length }"
          placeholder="8080:80"
        />
        <button class="btn-red" @click="remove(idx)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <div v-if="portErrors(idx).value.length" class="text-red-400 text-xs">
        <div v-for="err in portErrors(idx).value" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Port
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import type { OCIPortLong } from "../docker/compose/types-oci"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

/* Convert long syntax → short syntax */
function normalizePort(p: string | OCIPortLong): string {
  if (typeof p === "string") return p

  const target = p.target
  const published = p.published
  const protocol = p.protocol

  let out = ""

  if (published !== undefined) out += `${published}:`
  out += `${target}`

  if (protocol) out += `/${protocol}`

  return out
}

/* Local editable list */
const local = reactive<string[]>((props.modelValue.ports || []).map((p) => normalizePort(p)))

/* Validation */
function portErrors(idx: number) {
  return useFieldError(props.issues, field(`ports[${idx}]`))
}

/* Add/remove */
function add() {
  local.push("")
}

function remove(idx: number) {
  local.splice(idx, 1)
}

/* Emit as string[] */
watch(
  local,
  () => {
    const ports = local.map((p) => p.trim()).filter(Boolean)

    emit("update:modelValue", {
      ...props.modelValue,
      ports: ports.length ? ports : undefined,
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
