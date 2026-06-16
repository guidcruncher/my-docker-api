<template>
  <div class="space-y-3">
    <!-- Build Context -->
    <div class="space-y-1">
      <label class="text-xs">Build Context</label>
      <input
        v-model="local.context"
        class="input"
        :class="{ 'border-red-500': contextErrors.length }"
        placeholder="e.g. ."
      />
      <div v-if="contextErrors.length" class="text-red-400 text-xs mt-1">
        <div v-for="err in contextErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>

    <!-- Dockerfile -->
    <div class="space-y-1">
      <label class="text-xs">Dockerfile</label>
      <input
        v-model="local.dockerfile"
        class="input"
        :class="{ 'border-red-500': dockerfileErrors.length }"
        placeholder="Dockerfile"
      />
      <div v-if="dockerfileErrors.length" class="text-red-400 text-xs mt-1">
        <div v-for="err in dockerfileErrors" :key="String(err)">
          {{ err }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
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
const local = reactive({
  context: props.modelValue.build?.context ?? "",
  dockerfile: props.modelValue.build?.dockerfile ?? "",
})

/* Validation */
const contextErrors = useFieldError(props.issues, field("build.context"))
const dockerfileErrors = useFieldError(props.issues, field("build.dockerfile"))

/* Sync UI → modelValue */
watch(
  local,
  () => {
    const build: any = {}
    if (local.context) build.context = local.context
    if (local.dockerfile) build.dockerfile = local.dockerfile

    emit("update:modelValue", {
      ...props.modelValue,
      build: Object.keys(build).length ? build : undefined,
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
