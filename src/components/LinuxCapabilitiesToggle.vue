<template>
  <div class="space-y-2">
    <!-- Header + bulk actions -->
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Linux Capabilities</h2>

      <div class="flex gap-3">
        <button class="px-3 py-1 rounded bg-blue-600 text-white text-sm" @click="selectAll">
          Select All
        </button>

        <button class="px-3 py-1 rounded bg-gray-700 text-white text-sm" @click="clearAll">
          Clear All
        </button>
      </div>
    </div>

    <!-- Capability list -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div
        v-for="cap in sortedCaps"
        :key="cap"
        class="flex items-center justify-between p-2 rounded border border-gray-700 bg-gray-900"
      >
        <div class="flex flex-col">
          <span class="font-mono text-sm">{{ cap }}</span>
          <span class="text-xs text-gray-400">{{ LinuxCapabilities[cap] }}</span>
        </div>

        <!-- Custom toggle -->
        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="modelValue.includes(cap)"
            @change="toggle(cap)"
          />
          <div
            class="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-colors"
          ></div>
          <div
            class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"
          ></div>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { LinuxCapabilities } from "../docker/compose/linuxCapabilities"

interface Props {
  modelValue: string[]
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

// Sorted capability keys
const sortedCaps = computed(() => Object.keys(LinuxCapabilities).sort())

function toggle(cap: string) {
  const next = props.modelValue.includes(cap)
    ? props.modelValue.filter((c) => c !== cap)
    : [...props.modelValue, cap]

  emit("update:modelValue", next)
}

function selectAll() {
  emit("update:modelValue", [...sortedCaps.value])
}

function clearAll() {
  emit("update:modelValue", [])
}
</script>

<style scoped>
/* Optional: dark mode polish */
</style>
