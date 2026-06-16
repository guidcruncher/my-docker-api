<template>
  <div class="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-3 py-2">
    <!-- TOGGLE SIDEBAR -->
    <button class="btn flex items-center gap-1" @click="emit('toggleSidebar')">
      <LayoutPanelLeft class="w-4 h-4" />
      Panel
    </button>

    <!-- NEW -->
    <button class="btn flex items-center gap-1" @click="emit('new')">
      <Plus class="w-4 h-4" />
      New
    </button>

    <!-- SAVE -->
    <button class="btn flex items-center gap-1" @click="emit('save')">
      <Save class="w-4 h-4" />
      Save
    </button>

    <!-- FORMAT -->
    <button class="btn flex items-center gap-1" @click="emit('format')">
      <Wand2 class="w-4 h-4" />
      Format
    </button>

    <button class="btn flex items-center gap-1" @click="emit('oci')">
      <Container class="w-4 h-4" />
      OCI
    </button>

    <!-- VALIDATE -->
    <button
      class="btn flex items-center gap-1"
      :class="isValid ? 'text-green-400' : 'text-red-400'"
      @click="emit('validate')"
    >
      <ShieldCheck v-if="isValid" class="w-4 h-4" />
      <ShieldAlert v-else class="w-4 h-4" />
      {{ isValid ? "Valid" : "Invalid" }}
    </button>

    <div class="flex-1"></div>

    <!-- STATUS -->
    <span class="text-xs text-gray-500">
      {{ status }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  LayoutPanelLeft,
  Plus,
  Save,
  Wand2,
  Container,
  ShieldCheck,
  ShieldAlert,
} from "@lucide/vue"

const props = defineProps<{
  isValid: boolean
  status: string
}>()

const emit = defineEmits(["new", "save", "format", "validate", "toggleSidebar", "oci"])
</script>

<style scoped>
.btn {
  @apply px-3 py-1 text-sm rounded bg-gray-800 border border-gray-700 hover:bg-gray-700;
}
</style>
