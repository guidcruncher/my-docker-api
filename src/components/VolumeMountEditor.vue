<template>
  <div class="space-y-2 border border-gray-700 rounded p-3 bg-gray-900">
    <div class="flex gap-2">
      <input v-model="mount.source" class="input" placeholder="source (volume name)" />
      <input v-model="mount.target" class="input flex-1" placeholder="/path/in/container" />
    </div>

    <div class="flex gap-2">
      <select v-model="mount.type" class="input">
        <option value="volume">volume</option>
        <option value="bind">bind</option>
        <option value="tmpfs">tmpfs</option>
      </select>

      <label class="flex items-center gap-1 text-xs text-gray-300">
        <input type="checkbox" v-model="mount.read_only" />
        read_only
      </label>
    </div>

    <button class="btn-red" @click="$emit('remove')"><Trash2 class="w-4 h-4" /></button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Trash2 } from "@lucide/vue"

interface Props {
  modelValue: any
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue", "remove"])

const mount = reactive({ ...props.modelValue })

watch(mount, () => emit("update:modelValue", mount), { deep: true })
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs;
}
.btn-red {
  @apply px-2 py-1 bg-red-600 text-white text-xs rounded;
}
</style>
