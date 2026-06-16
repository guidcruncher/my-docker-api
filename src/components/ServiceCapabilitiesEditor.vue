<template>
  <div class="space-y-2">
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

        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            class="sr-only peer"
            :checked="effectiveCaps.includes(cap)"
            @change="toggle(cap)"
          />
          <div
            class="w-11 h-6 bg-gray-600 peer-checked:bg-blue-600 rounded-full transition-colors"
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
  capAdd?: string[]
  capDrop?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits(["update:capAdd", "update:capDrop"])

/* Safe arrays */
const add = computed(() => props.capAdd ?? [])
const drop = computed(() => props.capDrop ?? [])

/* Effective state = cap_add minus cap_drop */
const effectiveCaps = computed(() => add.value.filter((c) => !drop.value.includes(c)))

/* Sorted capability keys */
const sortedCaps = computed(() => Object.keys(LinuxCapabilities).sort())

function toggle(cap: string) {
  const isEnabled = effectiveCaps.value.includes(cap)

  if (isEnabled) {
    // Turning OFF → add to drop, remove from add
    emit(
      "update:capAdd",
      add.value.filter((c) => c !== cap),
    )
    emit("update:capDrop", [...drop.value, cap])
  } else {
    // Turning ON → add to add, remove from drop
    emit("update:capAdd", [...add.value, cap])
    emit(
      "update:capDrop",
      drop.value.filter((c) => c !== cap),
    )
  }
}

function selectAll() {
  emit("update:capAdd", [...sortedCaps.value])
  emit("update:capDrop", [])
}

function clearAll() {
  emit("update:capAdd", [])
  emit("update:capDrop", [])
}
</script>
