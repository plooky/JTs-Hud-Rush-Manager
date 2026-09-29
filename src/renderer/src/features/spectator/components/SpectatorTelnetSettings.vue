<script setup lang="ts">
import BaseButton from '@renderer/components/base/BaseButton.vue';

defineProps<{
  testing: boolean;
  testResult: { ok: boolean; message: string } | null;
}>();

const emit = defineEmits<{
  (e: 'test'): void;
}>();
</script>

<template>
  <div class="mb-5 bg-zinc-800 border border-zinc-700 rounded-xl p-4">
    <h3 class="text-sm font-semibold text-zinc-300 mb-3">CS2 Command Pipe</h3>
    <div class="flex flex-wrap items-end gap-3">
      <BaseButton
        @click="emit('test')"
        :disabled="testing"
        variant="secondary"
      >
        {{ testing ? 'Testing…' : 'Test Connection' }}
      </BaseButton>
      <span
        v-if="testResult"
        class="text-sm font-medium"
        :class="testResult.ok ? 'text-emerald-400' : 'text-red-400'"
      >
        {{ testResult.message }}
      </span>
    </div>
    <p class="text-xs text-zinc-600 mt-3">
      Start this Manager before CS2, then use
      <code class="text-zinc-400 break-all">-insecure -concommandpipe \\.\pipe\jts_hud_rush_cmd,\\.\pipe\jts_hud_rush_out</code>.
      <code class="text-amber-400">-insecure</code> prevents Valve matchmaking; use the command preview and paste it into the console for secure sessions.
    </p>
  </div>
</template>
