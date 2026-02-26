<script lang="ts">
  interface Props {
    id: string;
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
  }

  let { id, label, value = $bindable(), min = 0, max = 100, step = 10 }: Props = $props();
</script>

<div class="flex flex-col gap-1">
  <label for={id} class="text-xs text-pulsar uppercase tracking-wide">{label}: {value}</label>
  <input {id} type="range" {min} {max} {step} bind:value class="w-full accent-aurora" />
</div>
