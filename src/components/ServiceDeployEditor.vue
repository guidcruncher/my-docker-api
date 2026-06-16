<template>
  <div class="space-y-6">
    <label class="text-xs font-semibold">Deploy</label>

    <!-- Mode -->
    <div class="space-y-1">
      <label class="text-xs">Mode</label>
      <select v-model="local.mode" class="input" :class="{ 'border-red-500': modeErrors.length }">
        <option value="replicated">replicated</option>
        <option value="global">global</option>
      </select>
      <div v-if="modeErrors.length" class="text-red-400 text-xs">
        <div v-for="err in modeErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Replicas -->
    <div v-if="local.mode === 'replicated'" class="space-y-1">
      <label class="text-xs">Replicas</label>
      <input
        type="number"
        min="1"
        v-model.number="local.replicas"
        class="input"
        :class="{ 'border-red-500': replicasErrors.length }"
        placeholder="1"
      />
      <div v-if="replicasErrors.length" class="text-red-400 text-xs">
        <div v-for="err in replicasErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Restart Policy -->
    <div class="space-y-2">
      <div class="text-xs text-gray-300">Restart Policy</div>

      <div class="space-y-1">
        <label class="text-xs">Condition</label>
        <select
          v-model="local.restart.condition"
          class="input"
          :class="{ 'border-red-500': restartConditionErrors.length }"
        >
          <option value="none">none</option>
          <option value="on-failure">on-failure</option>
          <option value="any">any</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-xs">Delay (e.g. 5s)</label>
        <input
          v-model="local.restart.delay"
          class="input"
          :class="{ 'border-red-500': restartDelayErrors.length }"
          placeholder="5s"
        />
      </div>

      <div class="space-y-1">
        <label class="text-xs">Max Attempts</label>
        <input
          type="number"
          min="0"
          v-model.number="local.restart.max_attempts"
          class="input"
          :class="{ 'border-red-500': restartAttemptsErrors.length }"
          placeholder="3"
        />
      </div>
    </div>

    <!-- Resources -->
    <div class="space-y-4">
      <div class="text-xs text-gray-300">Resources</div>

      <!-- Limits -->
      <div class="space-y-2">
        <div class="text-xs text-gray-400">Limits</div>

        <div class="space-y-1">
          <label class="text-xs">CPUs</label>
          <input
            v-model="local.resources.limits.cpus"
            class="input"
            :class="{ 'border-red-500': limitsCpuErrors.length }"
            placeholder="0.5"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs">Memory</label>
          <input
            v-model="local.resources.limits.memory"
            class="input"
            :class="{ 'border-red-500': limitsMemErrors.length }"
            placeholder="512M"
          />
        </div>
      </div>

      <!-- Reservations -->
      <div class="space-y-2">
        <div class="text-xs text-gray-400">Reservations</div>

        <div class="space-y-1">
          <label class="text-xs">CPUs</label>
          <input
            v-model="local.resources.reservations.cpus"
            class="input"
            :class="{ 'border-red-500': resCpuErrors.length }"
            placeholder="0.25"
          />
        </div>

        <div class="space-y-1">
          <label class="text-xs">Memory</label>
          <input
            v-model="local.resources.reservations.memory"
            class="input"
            :class="{ 'border-red-500': resMemErrors.length }"
            placeholder="256M"
          />
        </div>
      </div>
    </div>

    <!-- Remove deploy -->
    <button class="btn-red w-fit" @click="clearDeploy">
      <Trash2 class="w-4 h-4" /> Remove Deploy
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

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
const d = props.modelValue.deploy || {}

const local = reactive({
  mode: d.mode || "replicated",
  replicas: d.replicas ?? 1,
  restart: {
    condition: d.restart_policy?.condition || "any",
    delay: d.restart_policy?.delay || "",
    max_attempts: d.restart_policy?.max_attempts ?? 0,
  },
  resources: {
    limits: {
      cpus: d.resources?.limits?.cpus || "",
      memory: d.resources?.limits?.memory || "",
    },
    reservations: {
      cpus: d.resources?.reservations?.cpus || "",
      memory: d.resources?.reservations?.memory || "",
    },
  },
})

/* Validation */
const modeErrors = useFieldError(props.issues, field("deploy.mode"))
const replicasErrors = useFieldError(props.issues, field("deploy.replicas"))

const restartConditionErrors = useFieldError(props.issues, field("deploy.restart_policy.condition"))
const restartDelayErrors = useFieldError(props.issues, field("deploy.restart_policy.delay"))
const restartAttemptsErrors = useFieldError(
  props.issues,
  field("deploy.restart_policy.max_attempts"),
)

const limitsCpuErrors = useFieldError(props.issues, field("deploy.resources.limits.cpus"))
const limitsMemErrors = useFieldError(props.issues, field("deploy.resources.limits.memory"))

const resCpuErrors = useFieldError(props.issues, field("deploy.resources.reservations.cpus"))
const resMemErrors = useFieldError(props.issues, field("deploy.resources.reservations.memory"))

/* Clear deploy */
function clearDeploy() {
  emit("update:modelValue", {
    ...props.modelValue,
    deploy: undefined,
  })
}

/* Sync UI → modelValue */
watch(
  local,
  () => {
    const deploy =
      local.mode ||
      local.replicas ||
      local.restart.condition ||
      local.resources.limits.cpus ||
      local.resources.reservations.cpus
        ? {
            mode: local.mode,
            ...(local.mode === "replicated" ? { replicas: local.replicas } : {}),
            restart_policy: {
              condition: local.restart.condition,
              ...(local.restart.delay ? { delay: local.restart.delay } : {}),
              ...(local.restart.max_attempts ? { max_attempts: local.restart.max_attempts } : {}),
            },
            resources: {
              limits: {
                ...(local.resources.limits.cpus ? { cpus: local.resources.limits.cpus } : {}),
                ...(local.resources.limits.memory ? { memory: local.resources.limits.memory } : {}),
              },
              reservations: {
                ...(local.resources.reservations.cpus
                  ? { cpus: local.resources.reservations.cpus }
                  : {}),
                ...(local.resources.reservations.memory
                  ? { memory: local.resources.reservations.memory }
                  : {}),
              },
            },
          }
        : undefined

    emit("update:modelValue", {
      ...props.modelValue,
      deploy,
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
