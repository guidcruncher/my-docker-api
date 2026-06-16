<template>
  <div class="space-y-8">
    <ValidationSummaryPanel :issues="issues" @jump-to="scrollToField" />

    <!-- BASIC IDENTITY -->
    <SectionBox
      title="Basic Identity"
      :icon="Package"
      :issues="issues"
      :match-paths="[`${basePath}.image`, `${basePath}.build`]"
    >
      <ServiceImageEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceBuildEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- NETWORKING -->
    <SectionBox
      title="Networking"
      :icon="Network"
      :issues="issues"
      :match-paths="[
        `${basePath}.network_mode`,
        `${basePath}.dns`,
        `${basePath}.ports`,
        `${basePath}.networks`,
      ]"
    >
      <ServiceNetworkModeEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceDnsList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServicePortsDualEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceNetworksList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- DEPENDENCIES -->
    <SectionBox
      title="Dependencies"
      :icon="GitMerge"
      :issues="issues"
      :match-paths="[`${basePath}.depends_on`]"
    >
      <ServiceDependsOnList
        :model-value="modelValue"
        :issues="issues"
        :base-path="`${basePath}.depends_on`"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- FILESYSTEM & DEVICES -->
    <SectionBox
      title="Filesystem & Devices"
      :icon="FolderTree"
      :issues="issues"
      :match-paths="[
        `${basePath}.volumes`,
        `${basePath}.devices`,
        `${basePath}.secrets`,
        `${basePath}.configs`,
      ]"
    >
      <ServiceVolumesList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceDevicesList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceSecretsList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceConfigsList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- RUNTIME ENVIRONMENT -->
    <SectionBox
      title="Runtime Environment"
      :icon="List"
      :issues="issues"
      :match-paths="[
        `${basePath}.environment`,
        `${basePath}.labels`,
        `${basePath}.sysctls`,
        `${basePath}.ulimits`,
      ]"
    >
      <ServiceEnvironmentEditor
        :model-value="modelValue.environment"
        :issues="issues"
        :base-path="`${basePath}.environment`"
        @update:model-value="(v: any) => update({ environment: v })"
      />

      <ServiceLabelsEditor
        :model-value="modelValue.labels"
        :issues="issues"
        :base-path="`${basePath}.labels`"
        @update:model-value="(v: any) => update({ labels: v })"
      />

      <ServiceSysctlsEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceUlimitsEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- SECURITY -->
    <SectionBox
      title="Security"
      :icon="Shield"
      :issues="issues"
      :match-paths="[`${basePath}.security_opt`, `${basePath}.cap_add`, `${basePath}.cap_drop`]"
    >
      <ServiceSecurityOptList
        :model-value="modelValue"
        :issues="issues"
        :base-path="basePath"
        @update:model-value="update"
      />

      <ServiceCapabilitiesEditor
        :cap-add="modelValue.cap_add"
        :cap-drop="modelValue.cap_drop"
        @update:cap-add="(v: any) => update({ cap_add: v })"
        @update:cap-drop="(v: any) => update({ cap_drop: v })"
      />
    </SectionBox>

    <!-- HEALTH -->
    <SectionBox
      title="Health"
      :icon="HeartPulse"
      :issues="issues"
      :match-paths="[`${basePath}.healthcheck`]"
    >
      <ServiceHealthcheckEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="`${basePath}.healthcheck`"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- LOGGING -->
    <SectionBox
      title="Logging"
      :icon="FileText"
      :issues="issues"
      :match-paths="[`${basePath}.logging`]"
    >
      <ServiceLoggingEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="`${basePath}.logging`"
        @update:model-value="update"
      />
    </SectionBox>

    <!-- DEPLOY -->
    <SectionBox
      title="Deploy"
      :icon="ServerCog"
      :issues="issues"
      :match-paths="[`${basePath}.deploy`]"
    >
      <ServiceDeployEditor
        :model-value="modelValue"
        :issues="issues"
        :base-path="`${basePath}.deploy`"
        @update:model-value="update"
      />
    </SectionBox>
  </div>
</template>

<script setup lang="ts">
import {
  Package,
  Network,
  GitMerge,
  FolderTree,
  List,
  Shield,
  HeartPulse,
  FileText,
  ServerCog,
} from "@lucide/vue"

import type { DockerService } from "../docker/compose/types-docker"
import type { ValidationIssue } from "../composables/useFieldError"

interface Props {
  modelValue: DockerService
  issues: ValidationIssue[]
  basePath: string
}

const props = defineProps<Props>()
const emit = defineEmits(["update:modelValue"])

function update(v: DockerService) {
  emit("update:modelValue", v)
}

function scrollToField(_path: string) {
  // Optional: auto-open + scroll can be added next
}
</script>

<style scoped>
.section-box {
  @apply bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6;
}

.section-title {
  @apply text-lg font-semibold text-gray-200 border-b border-gray-700 pb-2;
}
</style>
