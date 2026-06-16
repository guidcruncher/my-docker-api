<template>
  <div class="space-y-2">
    <label class="text-xs">Depends On</label>

    <div
      v-for="(item, idx) in local"
      :key="idx"
      class="flex flex-col gap-2 p-2 rounded bg-gray-900 border border-gray-700"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs">Service</label>
        <input
          v-model="item.service"
          class="input"
          :class="{ 'border-red-500': serviceErrors(idx).value.length }"
          placeholder="database"
        />
        <div v-if="serviceErrors(idx).value.length" class="text-red-400 text-xs">
          <div v-for="err in serviceErrors(idx).value" :key="String(err)">
            {{ err }}
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs">Condition</label>
        <select
          v-model="item.condition"
          class="input"
          :class="{ 'border-red-500': conditionErrors(idx).value.length }"
        >
          <option value="service_started">service_started</option>
          <option value="service_healthy">service_healthy</option>
          <option value="service_completed_successfully">service_completed_successfully</option>
        </select>
        <div v-if="conditionErrors(idx).value.length" class="text-red-400 text-xs">
          <div v-for="err in conditionErrors(idx).value" :key="String(err)">
            {{ err }}
          </div>
        </div>
      </div>

      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Dependency
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import type { OCIDependsOnCondition } from "../docker/compose/types-oci"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

type DependsCondition = OCIDependsOnCondition["condition"]

interface LocalDependsOn {
  service: string
  condition: DependsCondition
}

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

const local = reactive<LocalDependsOn[]>(
  (() => {
    const raw = props.modelValue.depends_on
    if (!raw) return []

    if (Array.isArray(raw)) {
      return raw.map((service) => ({
        service: String(service),
        condition: "service_started" as DependsCondition,
      }))
    }

    return Object.entries(raw).map(([service, condition]) => ({
      service,
      condition: (condition.condition ?? "service_started") as DependsCondition,
    }))
  })(),
)

function serviceErrors(idx: number) {
  return useFieldError(props.issues, field(`depends_on.${local[idx].service}`))
}
function conditionErrors(idx: number) {
  return useFieldError(props.issues, field(`depends_on.${local[idx].service}`))
}

function add() {
  local.push({
    service: "",
    condition: "service_started",
  })
}

function remove(idx: number) {
  local.splice(idx, 1)
}

watch(
  local,
  () => {
    const out: Record<string, OCIDependsOnCondition> = {}

    for (const d of local) {
      const name = d.service.trim()
      if (!name) continue
      out[name] = { condition: d.condition }
    }

    emit("update:modelValue", {
      ...props.modelValue,
      depends_on: Object.keys(out).length ? out : undefined,
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
