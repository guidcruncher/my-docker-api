<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="flex items-center gap-2 text-2xl font-bold">
        <Container class="w-6 h-6" />
        Compose Editor
      </h1>

      <button class="px-3 py-1 bg-blue-600 text-white rounded" @click="goToHome()">
        <X />
      </button>
    </div>

    <ComposeEditor v-model="compose" />
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue"
import { useRouter } from "vue-router"

import { X, Container } from "@lucide/vue"

import type {
  DockerService,
  DockerNetwork,
  DockerVolume,
  DockerSecret,
  DockerConfig,
} from "../docker/compose/types-docker"

const router = useRouter()

// Initial empty compose model
let compose = reactive<{
  services: Record<string, DockerService>
  networks: Record<string, DockerNetwork>
  volumes: Record<string, DockerVolume>
  secrets: Record<string, DockerSecret>
  configs: Record<string, DockerConfig>
}>({
  services: {},
  networks: {},
  volumes: {},
  secrets: {},
  configs: {},
})

const goToHome = () => {
  router.push("/")
}
</script>
