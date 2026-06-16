<template>
  <div
    class="rounded-lg border transition"
    :class="{
      'bg-gray-900 border-gray-700': !hasErrors,
      'bg-red-950 border-red-600': hasErrors,
    }"
  >
    <button
      class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition"
      @click="toggle"
    >
      <div class="flex items-center gap-2">
        <component
          :is="icon"
          class="w-5 h-5 transition"
          :class="hasErrors ? 'text-red-400' : 'text-gray-300'"
        />
        <span
          class="font-semibold transition"
          :class="hasErrors ? 'text-red-300' : 'text-gray-200'"
        >
          {{ title }}
        </span>
      </div>

      <ChevronDown
        class="w-5 h-5 transition-transform"
        :class="{
          'rotate-180': open,
          'text-red-400': hasErrors,
          'text-gray-400': !hasErrors,
        }"
      />
    </button>

    <transition name="collapse">
      <div v-show="open" class="p-6 space-y-6">
        <slot />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { ChevronDown } from "@lucide/vue"
import type { ValidationIssue } from "../composables/useFieldError"

interface Props {
  title: string
  icon: any
  issues?: ValidationIssue[]
  basePath?: string
  matchPaths?: string[]
  defaultOpen?: boolean
}

const props = defineProps<Props>()

const key = `service-editor:${props.title}:open`
const saved = localStorage.getItem(key)
const open = ref(saved !== null ? saved === "true" : (props.defaultOpen ?? true))

function toggle() {
  open.value = !open.value
  localStorage.setItem(key, String(open.value))
}

const hasErrors = computed(() => {
  if (!props.issues) return false

  // If explicit match paths are provided, use those
  if (props.matchPaths && props.matchPaths.length) {
    return props.issues.some((issue) => props.matchPaths!.some((p) => issue.path.startsWith(p)))
  }

  // Fallback to basePath
  if (!props.basePath) return false
  return props.issues.some((issue) => issue.path.startsWith(props.basePath!))
})
</script>

<style scoped>
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
