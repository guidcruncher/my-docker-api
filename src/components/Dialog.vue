<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue"
import { X } from "@lucide/vue"

const props = defineProps<{
  modelValue: boolean
  title?: string
  closeOnBackdrop?: boolean
  widthClass?: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "open"): void
  (e: "close"): void
}>()

const isOpen = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) emit("open")
    else emit("close")
    toggleBodyScroll(val)
  },
  { immediate: true },
)

function close() {
  emit("update:modelValue", false)
}

function onBackdropClick() {
  if (props.closeOnBackdrop !== false) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value) close()
}

function toggleBodyScroll(lock: boolean) {
  if (lock) document.body.classList.add("overflow-hidden")
  else document.body.classList.remove("overflow-hidden")
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown)
  toggleBodyScroll(false)
})
</script>

<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition ease-in duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="fixed inset-0 z-40 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="onBackdropClick" />

        <!-- Panel -->
        <transition
          enter-active-class="transition ease-out duration-200"
          enter-from-class="opacity-0 translate-y-4 sm:scale-95"
          leave-active-class="transition ease-in duration-150"
          leave-to-class="opacity-0 translate-y-4 sm:scale-95"
        >
          <div class="relative z-50 mx-4 sm:mx-0" :class="widthClass || 'w-full max-w-lg'">
            <div
              class="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <!-- Header -->
              <div
                class="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/70"
              >
                <h2 v-if="title" class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {{ title }}
                </h2>

                <button
                  type="button"
                  class="ml-3 inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                  @click="close"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                <slot />
              </div>

              <!-- Footer -->
              <div
                v-if="$slots.footer"
                class="px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-900/60 flex justify-end gap-2"
              >
                <slot name="footer" />
              </div>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>
