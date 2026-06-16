<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Volumes</h2>

      <button class="px-3 py-1 rounded bg-blue-600 text-white text-sm" @click="addVolume">
        Add Volume
      </button>
    </div>

    <div
      v-for="(vol, name) in volumes"
      :key="name"
      class="p-3 rounded border border-gray-700 bg-gray-900 space-y-3"
    >
      <!-- Name + remove -->
      <div class="flex items-center justify-between">
        <input
          v-model="nameMap[name]"
          @change="renameVolume(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-48"
          placeholder="volume name"
        />

        <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" @click="removeVolume(name)">
          Remove
        </button>
      </div>

      <!-- Driver -->
      <div class="space-y-1">
        <label class="text-xs">Driver</label>

        <select
          v-model="vol.driver"
          @change="onDriverChanged(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
        >
          <option v-for="(label, key) in VolumeDrivers" :key="key" :value="key">
            {{ key }} — {{ label }}
          </option>
        </select>

        <p class="text-xs text-gray-400">
          {{ VolumeDrivers[vol.driver || "local"] }}
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
          placeholder="external name"
        />
      </div>

      <!-- Driver Options -->
      <div class="space-y-2">
        <label class="text-xs">Driver Options</label>

        <div class="flex items-center gap-2">
          <select
            v-model="selectedDriverOpt[name]"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-48"
          >
            <option value="">Add preset option…</option>
            <option
              v-for="(label, key) in VolumeDriverOpts[vol.driver || 'local']"
              :key="key"
              :value="key"
            >
              {{ key }} — {{ label }}
            </option>
          </select>

          <button
            v-if="selectedDriverOpt[name]"
            class="px-2 py-1 rounded bg-blue-600 text-white text-xs"
            @click="addPresetDriverOpt(name)"
          >
            Add
          </button>
        </div>

        <div v-for="(entry, key) in driverOpts[name]" :key="key" class="flex items-center gap-2">
          <input
            v-model="entry.k"
            @input="syncDriverOpts(name)"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-32"
            placeholder="key"
          />
          <input
            v-model="entry.v"
            @input="syncDriverOpts(name)"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs flex-1"
            placeholder="value"
          />
          <button
            class="px-2 py-1 rounded bg-red-600 text-white text-xs"
            @click="removeDriverOpt(name, key)"
          >
            X
          </button>
        </div>

        <button
          class="px-2 py-1 rounded bg-gray-700 text-white text-xs"
          @click="addDriverOpt(name)"
        >
          Add Custom Option
        </button>
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
import { VolumeDrivers, VolumeDriverOpts, type DockerVolume } from "../docker/compose/types-docker"

const props = defineProps<{ modelValue: Record<string, DockerVolume> }>()
const volumes = props.modelValue

/* UI state */
const nameMap = reactive<Record<string, string>>({})
const externalMode = reactive<Record<string, "false" | "true" | "named">>({})
const externalName = reactive<Record<string, string>>({})
const driverOpts = reactive<Record<string, Record<string, { k: string; v: string }>>>({})
const labels = reactive<Record<string, Record<string, { k: string; v: string }>>>({})
const selectedDriverOpt = reactive<Record<string, string>>({})

/* Init */
for (const name in volumes) {
  nameMap[name] = name

  const vol = volumes[name]

  if (vol.external === true) externalMode[name] = "true"
  else if (typeof vol.external === "object") {
    externalMode[name] = "named"
    externalName[name] = vol.external.name
  } else externalMode[name] = "false"

  driverOpts[name] = {}
  for (const k in vol.driver_opts || {}) {
    driverOpts[name][k] = { k, v: vol.driver_opts![k] }
  }

  labels[name] = {}
  for (const k in vol.labels || {}) {
    labels[name][k] = { k, v: vol.labels![k] }
  }
}

/* -------------------------
   DRIVER OPTS SYNC
------------------------- */
function syncDriverOpts(name: string) {
  const opts: Record<string, string> = {}
  for (const key in driverOpts[name]) {
    const entry = driverOpts[name][key]
    if (entry.k.trim()) opts[entry.k] = entry.v
  }
  volumes[name].driver_opts = opts
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
  volumes[name].labels = out
}

/* -------------------------
   EXTERNAL SYNC
------------------------- */
function syncExternal(name: string) {
  if (externalMode[name] === "true") {
    volumes[name].external = true
  } else if (externalMode[name] === "named") {
    volumes[name].external = { name: externalName[name] }
  } else {
    volumes[name].external = undefined
  }
}

/* -------------------------
   DRIVER CHANGE
------------------------- */
function onDriverChanged(name: string) {
  const driver = volumes[name].driver || "local"

  for (const key in driverOpts[name]) {
    if (!(key in VolumeDriverOpts[driver])) {
      delete driverOpts[name][key]
    }
  }

  syncDriverOpts(name)
}

/* -------------------------
   CRUD
------------------------- */
function addVolume() {
  const name = "volume_" + Math.random().toString(36).slice(2, 7)

  volumes[name] = { driver: "local" }
  nameMap[name] = name
  externalMode[name] = "false"
  driverOpts[name] = {}
  labels[name] = {}
}

function removeVolume(name: string) {
  delete volumes[name]
  delete nameMap[name]
  delete externalMode[name]
  delete externalName[name]
  delete driverOpts[name]
  delete labels[name]
}

function renameVolume(oldName: string) {
  const newName = nameMap[oldName]
  if (!newName || newName === oldName) return

  volumes[newName] = volumes[oldName]
  delete volumes[oldName]

  driverOpts[newName] = driverOpts[oldName]
  delete driverOpts[oldName]

  labels[newName] = labels[oldName]
  delete labels[oldName]

  externalMode[newName] = externalMode[oldName]
  delete externalMode[oldName]

  externalName[newName] = externalName[oldName]
  delete externalName[oldName]
}

/* -------------------------
   DRIVER OPTS CRUD
------------------------- */
function addPresetDriverOpt(name: string) {
  const key = selectedDriverOpt[name]
  if (!key) return

  driverOpts[name][key] = { k: key, v: "" }
  selectedDriverOpt[name] = ""

  syncDriverOpts(name)
}

function removeDriverOpt(name: string, key: string) {
  delete driverOpts[name][key]
  syncDriverOpts(name)
}

function addDriverOpt(name: string) {
  const key = "opt_" + Math.random().toString(36).slice(2, 7)
  driverOpts[name][key] = { k: key, v: "" }

  syncDriverOpts(name)
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
