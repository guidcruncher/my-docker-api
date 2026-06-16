<template>
  <div class="space-y-4">
    <label class="text-xs font-semibold">Logging</label>

    <!-- Driver -->
    <div class="space-y-1">
      <label class="text-xs">Driver</label>
      <input
        v-model="local.driver"
        class="input"
        :class="{ 'border-red-500': driverErrors.length }"
        placeholder="json-file"
      />
      <div v-if="driverErrors.length" class="text-red-400 text-xs">
        <div v-for="err in driverErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Options -->
    <div class="space-y-2">
      <div class="text-xs text-gray-300">Options</div>

      <div
        v-for="(pair, idx) in local.options"
        :key="idx"
        class="flex flex-col gap-1 p-2 rounded bg-gray-900 border border-gray-700"
      >
        <!-- Key -->
        <div class="flex flex-col gap-1">
          <label class="text-xs">Key</label>
          <input
            v-model="pair.key"
            class="input"
            :class="{ 'border-red-500': optionKeyErrors(idx).value.length }"
            placeholder="max-size"
          />
          <div v-if="optionKeyErrors(idx).value.length" class="text-red-400 text-xs">
            <div v-for="err in optionKeyErrors(idx).value" :key="String(err)">
              {{ err }}
            </div>
          </div>
        </div>

        <!-- Value -->
        <div class="flex flex-col gap-1">
          <label class="text-xs">Value</label>
          <input
            v-model="pair.value"
            class="input"
            :class="{ 'border-red-500': optionValueErrors(idx).value.length }"
            placeholder="10m"
          />
          <div v-if="optionValueErrors(idx).value.length" class="text-red-400 text-xs">
            <div v-for="err in optionValueErrors(idx).value" :key="String(err)">
              {{ err }}
            </div>
          </div>
        </div>

        <!-- Remove -->
        <button class="btn-red w-fit" @click="removeOption(idx)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <button class="btn-gray flex items-center gap-1" @click="addOption">
        <Plus class="w-4 h-4" /> Add Option
      </button>
    </div>

    <!-- Remove logging -->
    <button class="btn-red w-fit" @click="clearLogging">
      <Trash2 class="w-4 h-4" /> Remove Logging
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface LoggingOption {
  key: string
  value: string
}

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "update:modelValue", value: DockerService): void
}>()

const field = (p: string) => `${props.basePath}.${p}`

/* Local reactive copy */
const log = props.modelValue.logging || {}

const local = reactive({
  driver: log.driver || "",
  options: Object.entries(log.options || {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  })) as LoggingOption[],
})

/* Validation */
const driverErrors = useFieldError(props.issues, field("logging.driver"))

function optionKeyErrors(idx: number) {
  return useFieldError(props.issues, field(`logging.options.${local.options[idx].key}`))
}
function optionValueErrors(idx: number) {
  return useFieldError(props.issues, field(`logging.options.${local.options[idx].key}`))
}

/* Add/remove */
function addOption() {
  local.options.push({ key: "", value: "" })
}

function removeOption(idx: number) {
  local.options.splice(idx, 1)
}

/* Clear logging */
function clearLogging() {
  emit("update:modelValue", {
    ...props.modelValue,
    logging: undefined,
  })
}

/* Sync UI → modelValue */
watch(
  local,
  () => {
    const options: Record<string, string> = {}

    for (const pair of local.options) {
      if (pair.key.trim()) {
        options[pair.key.trim()] = pair.value
      }
    }

    const logging =
      local.driver || Object.keys(options).length
        ? {
            ...(local.driver ? { driver: local.driver } : {}),
            ...(Object.keys(options).length ? { options } : {}),
          }
        : undefined

    emit("update:modelValue", {
      ...props.modelValue,
      logging,
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
