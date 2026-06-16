<template>
  <div class="space-y-4">
    <label class="text-xs font-semibold">Healthcheck</label>

    <!-- Test -->
    <div class="space-y-1">
      <label class="text-xs">Test</label>
      <input
        v-model="local.testString"
        class="input"
        :class="{ 'border-red-500': testErrors.length }"
        placeholder="CMD curl -f http://localhost/ || exit 1"
      />
      <div v-if="testErrors.length" class="text-red-400 text-xs">
        <div v-for="err in testErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Interval -->
    <div class="space-y-1">
      <label class="text-xs">Interval</label>
      <input
        v-model="local.interval"
        class="input"
        :class="{ 'border-red-500': intervalErrors.length }"
        placeholder="30s"
      />
      <div v-if="intervalErrors.length" class="text-red-400 text-xs">
        <div v-for="err in intervalErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Timeout -->
    <div class="space-y-1">
      <label class="text-xs">Timeout</label>
      <input
        v-model="local.timeout"
        class="input"
        :class="{ 'border-red-500': timeoutErrors.length }"
        placeholder="10s"
      />
      <div v-if="timeoutErrors.length" class="text-red-400 text-xs">
        <div v-for="err in timeoutErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Retries -->
    <div class="space-y-1">
      <label class="text-xs">Retries</label>
      <input
        type="number"
        min="0"
        v-model.number="local.retries"
        class="input"
        :class="{ 'border-red-500': retriesErrors.length }"
        placeholder="3"
      />
      <div v-if="retriesErrors.length" class="text-red-400 text-xs">
        <div v-for="err in retriesErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Start Period -->
    <div class="space-y-1">
      <label class="text-xs">Start Period</label>
      <input
        v-model="local.start_period"
        class="input"
        :class="{ 'border-red-500': startPeriodErrors.length }"
        placeholder="5s"
      />
      <div v-if="startPeriodErrors.length" class="text-red-400 text-xs">
        <div v-for="err in startPeriodErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Remove -->
    <button class="btn-red w-fit" @click="clearHealthcheck">
      <Trash2 class="w-4 h-4" /> Remove Healthcheck
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import type { OCIHealthcheck } from "../docker/compose/types-oci"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

/* Normalize healthcheck safely */
const hc = (props.modelValue.healthcheck || {}) as Partial<OCIHealthcheck>

const local = reactive({
  testString: Array.isArray(hc.test) ? hc.test.join(" ") : "",
  interval: hc.interval || "",
  timeout: hc.timeout || "",
  retries: hc.retries ?? 0,
  start_period: hc.start_period || "",
})

/* Validation */
const testErrors = useFieldError(props.issues, field("healthcheck.test"))
const intervalErrors = useFieldError(props.issues, field("healthcheck.interval"))
const timeoutErrors = useFieldError(props.issues, field("healthcheck.timeout"))
const retriesErrors = useFieldError(props.issues, field("healthcheck.retries"))
const startPeriodErrors = useFieldError(props.issues, field("healthcheck.start_period"))

/* Remove healthcheck */
function clearHealthcheck() {
  emit("update:modelValue", {
    ...props.modelValue,
    healthcheck: undefined,
  })
}

/* Sync UI → modelValue */
watch(
  local,
  () => {
    const testArray = local.testString.trim()
      ? local.testString.split(" ").filter(Boolean)
      : undefined

    /* OCIHealthcheck requires test, so only emit if test exists */
    const healthcheck: OCIHealthcheck | undefined = testArray
      ? {
          test: testArray,
          ...(local.interval ? { interval: local.interval } : {}),
          ...(local.timeout ? { timeout: local.timeout } : {}),
          ...(local.retries ? { retries: local.retries } : {}),
          ...(local.start_period ? { start_period: local.start_period } : {}),
        }
      : undefined

    emit("update:modelValue", {
      ...props.modelValue,
      healthcheck,
    })
  },
  { deep: true },
)
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full;
}
.btn-red {
  @apply px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1;
}
</style>
