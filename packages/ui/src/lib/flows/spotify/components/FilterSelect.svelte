<script lang="ts">
  import type { SelectOption } from '@flows/shared';

  interface Props {
    id: string;
    label: string;
    value: string;
    options: SelectOption[];
    onchange?: (value: string) => void;
  }

  let { id, label, value = $bindable(), options }: Props = $props();
</script>

<div class="ui-field">
  <label for={id} class="ui-field__label">{label}</label>
  <select {id} class="ui-field__control ui-select" bind:value>
    {#each options as opt (opt.value)}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</div>
