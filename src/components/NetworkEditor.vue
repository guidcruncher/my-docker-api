<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Networks</h2>

      <button class="px-3 py-1 rounded bg-blue-600 text-white text-sm" @click="addNetwork">
        Add Network
      </button>
    </div>

    <div
      v-for="(net, name) in networks"
      :key="name"
      class="p-3 rounded border border-gray-700 bg-gray-900 space-y-3"
    >
      <!-- Name + remove -->
      <div class="flex items-center justify-between">
        <input
          v-model="nameMap[name]"
          @change="renameNetwork(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-48"
          placeholder="network name"
        />

        <button
          class="px-2 py-1 rounded bg-red-600 text-white text-xs"
          @click="removeNetwork(name)"
        >
          Remove
        </button>
      </div>

      <!-- Driver -->
      <div class="space-y-1">
        <label class="text-xs">Driver</label>

        <select
          v-model="net.driver"
          @change="onDriverChanged(name)"
          class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-full"
        >
          <option v-for="(label, key) in NetworkDrivers" :key="key" :value="key">
            {{ key }} — {{ label }}
          </option>
        </select>

        <p class="text-xs text-gray-400">
          {{ NetworkDrivers[net.driver || "bridge"] }}
        </p>
      </div>

      <!-- Flags -->
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-1 text-xs">
          <input type="checkbox" v-model="net.internal" class="w-4 h-4" />
          Internal
        </label>

        <label class="flex items-center gap-1 text-xs">
          <input type="checkbox" v-model="net.attachable" class="w-4 h-4" />
          Attachable
        </label>
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
              v-for="(label, key) in NetworkDriverOpts[net.driver || 'bridge']"
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

      <!-- IPAM -->
      <div class="space-y-1">
        <label class="text-xs">IPAM Config</label>

        <div
          v-for="(cfg, idx) in net.ipam?.config || []"
          :key="idx"
          class="space-y-1 border border-gray-700 p-2 rounded"
        >
          <input
            v-model="cfg.subnet"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full"
            placeholder="subnet"
          />
          <input
            v-model="cfg.gateway"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full"
            placeholder="gateway"
          />
          <input
            v-model="cfg.ip_range"
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs w-full"
            placeholder="ip_range"
          />

          <button
            class="px-2 py-1 rounded bg-red-600 text-white text-xs"
            @click="removeIpamConfig(name, idx)"
          >
            Remove
          </button>
        </div>

        <button
          class="px-2 py-1 rounded bg-gray-700 text-white text-xs"
          @click="addIpamConfig(name)"
        >
          Add IPAM Entry
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue"
import {
  NetworkDrivers,
  NetworkDriverOpts,
  type DockerNetwork,
} from "../docker/compose/types-docker"

const props = defineProps<{ modelValue: Record<string, DockerNetwork> }>()
const networks = props.modelValue

/* Local UI state */
const nameMap = reactive<Record<string, string>>({})
const externalMode = reactive<Record<string, "false" | "true" | "named">>({})
const externalName = reactive<Record<string, string>>({})
const driverOpts = reactive<Record<string, Record<string, { k: string; v: string }>>>({})
const selectedDriverOpt = reactive<Record<string, string>>({})

/* Initialize UI state */
for (const name in networks) {
  nameMap[name] = name

  const net = networks[name]

  if (net.external === true) externalMode[name] = "true"
  else if (typeof net.external === "object") {
    externalMode[name] = "named"
    externalName[name] = net.external.name
  } else externalMode[name] = "false"

  driverOpts[name] = {}
  for (const k in net.driver_opts || {}) {
    driverOpts[name][k] = { k, v: net.driver_opts![k] }
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

  networks[name].driver_opts = opts
}

/* -------------------------
   EXTERNAL SYNC
------------------------- */
function syncExternal(name: string) {
  if (externalMode[name] === "true") {
    networks[name].external = true
  } else if (externalMode[name] === "named") {
    networks[name].external = { name: externalName[name] }
  } else {
    networks[name].external = undefined
  }
}

/* -------------------------
   DRIVER CHANGE
------------------------- */
function onDriverChanged(name: string) {
  const driver = networks[name].driver || "bridge"

  for (const key in driverOpts[name]) {
    if (!(key in NetworkDriverOpts[driver])) {
      delete driverOpts[name][key]
    }
  }

  syncDriverOpts(name)
}

/* -------------------------
   NETWORK CRUD
------------------------- */
function addNetwork() {
  const name = "network_" + Math.random().toString(36).slice(2, 7)

  networks[name] = { driver: "bridge" }
  nameMap[name] = name
  externalMode[name] = "false"
  driverOpts[name] = {}
}

function removeNetwork(name: string) {
  delete networks[name]
  delete nameMap[name]
  delete externalMode[name]
  delete externalName[name]
  delete driverOpts[name]
}

function renameNetwork(oldName: string) {
  const newName = nameMap[oldName]
  if (!newName || newName === oldName) return

  networks[newName] = networks[oldName]
  delete networks[oldName]

  driverOpts[newName] = driverOpts[oldName]
  delete driverOpts[oldName]

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
   IPAM
------------------------- */
function addIpamConfig(name: string) {
  if (!networks[name].ipam) networks[name].ipam = { config: [] }
  networks[name].ipam!.config!.push({})
}

function removeIpamConfig(name: string, idx: number) {
  networks[name].ipam!.config!.splice(idx, 1)
}
</script>
