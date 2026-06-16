<template>
  <div class="space-y-3">
    <!-- Image -->
    <div class="space-y-1">
      <label class="text-xs">Image</label>
      <input
        v-model="local.image"
        class="input"
        :class="{ 'border-red-500': imageErrors.length }"
        placeholder="nginx:latest"
      />
      <div v-if="imageErrors.length" class="text-red-400 text-xs mt-1">
        <div v-for="err in imageErrors" :key="String(err)">{{ err }}</div>
      </div>
    </div>

    <!-- Command -->
    <div class="space-y-1">
      <label class="text-xs">Command</label>
      <input
        v-model="local.command"
        class="input"
        :class="{ 'border-red-500': commandErrors.length }"
        placeholder="optional command override"
      />
      <div v-if="commandErrors.length" class="text-red-400 text-xs mt-1">
        <div v-for="err in commandErrors" :key="String(err)">{{ err }}</div>
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

const local = reactive({
  image: props.modelValue.image ?? "",
  command: props.modelValue.command ?? "",
})

const imageErrors = useFieldError(props.issues, field("image"))
const commandErrors = useFieldError(props.issues, field("command"))

watch(
  local,
  () => {
    emit("update:modelValue", {
      ...props.modelValue,
      image: local.image || undefined,
      command: local.command || undefined,
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
