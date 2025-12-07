<script lang="ts">
  import type { SelectOption } from '@lib/types';

  interface Props {
    id: string;
    label: string;
    value: string;
    options: SelectOption[];
    onchange?: (value: string) => void;
  }

  let { id, label, value = $bindable(), options }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <label for={id} class="text-xs text-pulsar uppercase tracking-wide">{label}</label>
  <select
    {id}
    class="glass px-3 py-2 rounded-lg bg-void text-cosmic outline-none cursor-pointer text-sm focus:ring-2 focus:ring-aurora/50"
    bind:value
  >
    {#each options as opt (opt.value)}
      <option value={opt.value} class="bg-void">{opt.label}</option>
    {/each}
  </select>
</div>
