<template>
  <div class="space-y-3">
    <label class="text-xs">Ports</label>

    <div
      v-for="(entry, idx) in local"
      :key="idx"
      class="p-3 rounded border border-gray-700 bg-gray-900 space-y-2"
    >
      <!-- MODE SWITCH -->
      <div class="flex items-center justify-between">
        <select
          v-model="entry.mode"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs"
        >
          <option value="short">Short Syntax</option>
          <option value="long">Long Syntax</option>
        </select>
      </div>

      <!-- SHORT SYNTAX -->
      <div v-if="entry.mode === 'short'" class="flex flex-col gap-1">
        <input
          v-model="entry.short"
          class="input"
          placeholder="8080:80 or 8000-8005:9000-9005/udp"
          :class="{ 'border-red-500': portErrors(idx).value.length }"
        />

        <div v-if="portErrors(idx).value.length" class="text-red-400 text-xs">
          <div v-for="err in portErrors(idx).value" :key="String(err)">
            {{ err }}
          </div>
        </div>
      </div>

      <!-- LONG SYNTAX -->
      <div v-else class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-xs">Target</label>
          <input v-model="entry.long.target" class="input" placeholder="80 or 9000-9005" />
        </div>

        <div>
          <label class="text-xs">Published</label>
          <input v-model="entry.long.published" class="input" placeholder="8080 or 8000-8005" />
        </div>

        <div>
          <label class="text-xs">Protocol</label>
          <select v-model="entry.long.protocol" class="input">
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
          </select>
        </div>

        <div>
          <label class="text-xs">Mode</label>
          <select v-model="entry.long.mode" class="input">
            <option value="host">host</option>
            <option value="ingress">ingress</option>
          </select>
        </div>
      </div>

      <!-- REMOVE -->
      <button class="btn-red w-fit" @click="remove(idx)">
        <Trash2 class="w-4 h-4" />
      </button>
    </div>

    <button class="btn-gray flex items-center gap-1" @click="add">
      <Plus class="w-4 h-4" /> Add Port
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue"
import { Plus, Trash2 } from "@lucide/vue"
import type { DockerService } from "../docker/compose/types-docker"
import type { OCIPortLong } from "../docker/compose/types-oci"
import { useFieldError, type ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

const field = (p: string) => `${props.basePath}.${p}`

/* ------------------------------
   RANGE-AWARE SHORT SYNTAX PARSER
------------------------------ */
function parseShort(p: string): OCIPortLong {
  // Examples:
  // "127.0.0.1:8080:80"
  // "127.0.0.1:8000-8005:9000-9005/udp"
  // "8080:80"
  // "80"

  const [left, proto] = p.split("/")
  const parts = left.split(":")

  let host_ip: string | undefined
  let publishedRaw: string | undefined
  let targetRaw: string | undefined

  if (parts.length === 3) {
    // host_ip:published:target
    host_ip = parts[0]
    publishedRaw = parts[1]
    targetRaw = parts[2]
  } else if (parts.length === 2) {
    // published:target
    publishedRaw = parts[0]
    targetRaw = parts[1]
  } else {
    // only target
    targetRaw = parts[0]
  }

  const parseRange = (v: string | undefined): number | string =>
    !v ? "" : v.includes("-") ? v : Number(v)

  return {
    target: parseRange(targetRaw),
    published: parseRange(publishedRaw),
    protocol: proto || "tcp",
    mode: "host",
    host_ip,
  }
}

/* ------------------------------
   LONG → SHORT (range-safe)
------------------------------ */

function toShort(p: OCIPortLong): string {
  const pub = p.published !== undefined ? p.published : ""
  const tgt = p.target
  const proto = p.protocol ? `/${p.protocol}` : ""
  return `${pub}:${tgt}${proto}`
}

/* ------------------------------
   LOCAL EDITABLE MODEL
------------------------------ */

type Entry = {
  mode: "short" | "long"
  short: string
  long: OCIPortLong
}

const local = reactive<Entry[]>(
  (props.modelValue.ports || []).map((p) => {
    if (typeof p === "string") {
      return {
        mode: "short",
        short: p,
        long: parseShort(p),
      }
    }
    return {
      mode: "long",
      short: toShort(p),
      long: { ...p },
    }
  }),
)

/* ------------------------------
   VALIDATION
------------------------------ */

function portErrors(idx: number) {
  return useFieldError(props.issues, field(`ports[${idx}]`))
}

/* ------------------------------
   ADD / REMOVE
------------------------------ */

function add() {
  local.push({
    mode: "short",
    short: "",
    long: { target: 0, protocol: "tcp", mode: "host" },
  })
}

function remove(idx: number) {
  local.splice(idx, 1)
}

/* ------------------------------
   EMIT UPDATED MODEL
------------------------------ */

watch(
  local,
  () => {
    const out = local
      .map((e) => {
        if (e.mode === "short") {
          const trimmed = e.short.trim()
          if (!trimmed) return null
          return trimmed
        }
        return e.long
      })
      .filter(Boolean)

    emit("update:modelValue", {
      ...props.modelValue,
      ports: out.length ? out : undefined,
    })
  },
  { deep: true },
)
</script>

<style scoped>
.input {
  @apply bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full;
}
.btn-gray {
  @apply px-2 py-1 rounded bg-gray-700 text-white text-xs;
}
.btn-red {
  @apply px-2 py-1 rounded bg-red-600 text-white text-xs flex items-center gap-1;
}
</style>
