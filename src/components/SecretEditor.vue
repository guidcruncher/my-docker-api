<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Secrets</h2>

      <button class="px-3 py-1 rounded bg-blue-600 text-white text-sm" @click="addSecret">
        Add Secret
      </button>
    </div>

    <div
      v-for="(secret, name) in secrets"
      :key="name"
      class="p-3 rounded border border-gray-700 bg-gray-900 space-y-3"
    >
      <!-- Name + remove -->
      <div class="flex items-center justify-between">
        <input
          v-model="nameMap[name]"
          @change="renameSecret(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-48"
          placeholder="secret name"
        />

        <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" @click="removeSecret(name)">
          Remove
        </button>
      </div>

      <!-- File -->
      <div class="space-y-1">
        <label class="text-xs">File</label>
        <input
          v-model="secret.file"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
          placeholder="/path/to/secret.txt"
        />

        <p v-if="missingRequired(name)" class="text-xs text-yellow-400">
          A secret must have a file path unless external.
        </p>
      </div>

      <!-- External -->
      <div class="space-y-1">
        <label class="text-xs">External</label>

        <select
          v-model="externalMode[name]"
          @change="syncExternal(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
        >
          <option value="false">Not external</option>
          <option value="true">External (boolean)</option>
          <option value="named">External (named)</option>
        </select>

        <input
          v-if="externalMode[name] === 'named'"
          v-model="externalName[name]"
          @input="syncExternal(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
          placeholder="external secret name"
        />
      </div>

      <!-- Labels -->
      <div class="space-y-1">
        <label class="text-xs">Labels</label>

        <div v-for="(entry, key) in labels[name]" :key="key" class="flex items-center gap-2">
          <input
            v-model="entry.k"
            @input="syncLabels(name)"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-32"
            placeholder="key"
          />
          <input
            v-model="entry.v"
            @input="syncLabels(name)"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs flex-1"
            placeholder="value"
          />
          <button
            class="px-2 py-1 rounded bg-red-600 text-white text-xs"
            @click="removeLabel(name, key)"
          >
            X
          </button>
        </div>

        <button class="px-2 py-1 rounded bg-gray-700 text-white text-xs" @click="addLabel(name)">
          Add Label
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue"
import type { DockerSecret } from "../docker/compose/types-docker"

const props = defineProps<{ modelValue: Record<string, DockerSecret> }>()
const secrets = props.modelValue

/* UI state */
const nameMap = reactive<Record<string, string>>({})
const externalMode = reactive<Record<string, "false" | "true" | "named">>({})
const externalName = reactive<Record<string, string>>({})
const labels = reactive<Record<string, Record<string, { k: string; v: string }>>>({})

/* Init */
for (const name in secrets) {
  nameMap[name] = name

  const sec = secrets[name]

  if (sec.external === true) externalMode[name] = "true"
  else if (typeof sec.external === "object") {
    externalMode[name] = "named"
    externalName[name] = sec.external.name
  } else externalMode[name] = "false"

  labels[name] = {}
  for (const k in sec.labels || {}) {
    labels[name][k] = { k, v: sec.labels![k] }
  }
}

/* -------------------------
   VALIDATION
------------------------- */
function missingRequired(name: string): boolean {
  const sec = secrets[name]
  const ext = externalMode[name]
  return !sec.file && ext === "false"
}

/* -------------------------
   EXTERNAL SYNC
------------------------- */
function syncExternal(name: string) {
  if (externalMode[name] === "true") {
    secrets[name].external = true
  } else if (externalMode[name] === "named") {
    secrets[name].external = { name: externalName[name] }
  } else {
    secrets[name].external = undefined
  }
}

/* -------------------------
   LABELS SYNC
------------------------- */
function syncLabels(name: string) {
  const out: Record<string, string> = {}

  for (const key in labels[name]) {
    const entry = labels[name][key]
    if (entry.k.trim()) out[entry.k] = entry.v
  }

  secrets[name].labels = out
}

/* -------------------------
   CRUD
------------------------- */
function addSecret() {
  const name = "secret_" + Math.random().toString(36).slice(2, 7)

  secrets[name] = {}
  nameMap[name] = name
  externalMode[name] = "false"
  labels[name] = {}
}

function removeSecret(name: string) {
  delete secrets[name]
  delete nameMap[name]
  delete externalMode[name]
  delete externalName[name]
  delete labels[name]
}

function renameSecret(oldName: string) {
  const newName = nameMap[oldName]
  if (!newName || newName === oldName) return

  secrets[newName] = secrets[oldName]
  delete secrets[oldName]

  labels[newName] = labels[oldName]
  delete labels[oldName]

  externalMode[newName] = externalMode[oldName]
  delete externalMode[oldName]

  externalName[newName] = externalName[oldName]
  delete externalName[oldName]
}

/* -------------------------
   LABEL CRUD
------------------------- */
function addLabel(name: string) {
  const key = "label_" + Math.random().toString(36).slice(2, 7)
  labels[name][key] = { k: key, v: "" }

  syncLabels(name)
}

function removeLabel(name: string, key: string) {
  delete labels[name][key]
  syncLabels(name)
}
</script>
