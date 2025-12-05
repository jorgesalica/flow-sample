<script lang="ts">
  import { status } from '../stores';

  const toneColors: Record<string, string> = {
    info: 'bg-blue-500/20 border-blue-500/30 text-blue-200',
    success: 'bg-green-500/20 border-green-500/30 text-green-200',
    warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-200',
    error: 'bg-red-500/20 border-red-500/30 text-red-200',
  };

  $: colors = toneColors[$status.tone] || toneColors.info;
</script>

<p class="px-4 py-3 rounded-xl border {colors} text-sm">
  {$status.message}
</p>
