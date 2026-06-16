<template>
  <div class="space-y-1">
    <label class="text-xs">Network Mode</label>

    <select
      v-model="local.network_mode"
      class="input"
      :class="{ 'border-red-500': networkModeErrors.length }"
    >
      <option value="">(default)</option>
      <option value="bridge">bridge</option>
      <option value="host">host</option>
      <option value="none">none</option>

      <!-- Dynamic passthrough for service:<name> -->
      <option v-if="isServiceMode" :value="local.network_mode">
        {{ local.network_mode }}
      </option>

      <!-- Dynamic passthrough for container:<name> -->
      <option v-if="isContainerMode" :value="local.network_mode">
        {{ local.network_mode }}
      </option>

      <!-- Disabled templates -->
      <option disabled value="service:">service:&lt;name&gt; (type manually)</option>
      <option disabled value="container:">container:&lt;name&gt; (type manually)</option>
    </select>

    <div v-if="networkModeErrors.length" class="text-red-400 text-xs mt-1">
      <div v-for="err in networkModeErrors" :key="String(err)">
        {{ err }}
      </div>
    </div>

    <!-- Text input for service/container names -->
    <div v-if="isServiceMode || isContainerMode" class="mt-2">
      <input
        v-model="local.network_mode"
        class="input"
        placeholder="service:vpn or container:myapp"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from "vue"
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
const local = reactive({
  network_mode: props.modelValue.network_mode ?? "",
})

/* Pattern detection */
const isServiceMode = computed(
  () => typeof local.network_mode === "string" && local.network_mode.startsWith("service:"),
)

const isContainerMode = computed(
  () => typeof local.network_mode === "string" && local.network_mode.startsWith("container:"),
)

/* Validation */
const networkModeErrors = useFieldError(props.issues, field("network_mode"))

/* Sync UI → modelValue */
watch(
  local,
  () => {
    emit("update:modelValue", {
      ...props.modelValue,
      network_mode: local.network_mode?.trim() || undefined,
    })
  },
  { deep: true },
)
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full;
}
</style>
