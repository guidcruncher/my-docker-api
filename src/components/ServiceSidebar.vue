<template>
  <div class="w-64 bg-gray-900 border-r border-gray-700 h-full flex flex-col">
    <div class="p-3 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Services</h2>
      <button class="px-2 py-1 bg-blue-600 text-white text-xs rounded" @click="$emit('add')">
        <Plus class="w-4 h-4" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div
        v-for="name in serviceList"
        :key="name"
        class="px-3 py-2 cursor-pointer flex items-center justify-between"
        :class="name === selected ? 'bg-gray-800 text-white' : 'text-gray-300'"
        @click="$emit('select', name)"
      >
        <span class="truncate">{{ name }}</span>

        <button class="text-red-400 hover:text-red-300 text-xs" @click.stop="$emit('remove', name)">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Trash2, Plus } from "@lucide/vue"

interface Props {
  services: Record<string, any>
  selected: string
}

const props = defineProps<Props>()
const emit = defineEmits(["select", "add", "remove"])

const serviceList = computed(() => Object.keys(props.services))
</script>
