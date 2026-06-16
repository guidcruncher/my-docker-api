<template>
  <div v-if="issues.length" class="p-3 rounded bg-red-900/40 border border-red-700 space-y-2">
    <div class="text-red-300 text-xs font-semibold">
      {{ issues.length }} validation issue{{ issues.length === 1 ? "" : "s" }}
    </div>

    <div class="space-y-1">
      <button
        v-for="(issue, idx) in issues"
        :key="idx"
        class="w-full text-left text-xs text-red-200 hover:text-red-100 hover:bg-red-800/40 px-2 py-1 rounded transition"
        @click="jump(issue.path)"
      >
        <span class="font-mono text-red-300">{{ issue.path }}</span> — {{ issue.message }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ValidationIssue } from "../docker/compose/composeValidator"

interface Props {
  issues: ValidationIssue[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: "jump-to", path: string): void
}>()

function jump(path: string) {
  emit("jump-to", path)
}
</script>

<style scoped>
/* No extra styling needed — Tailwind handles it */
</style>
