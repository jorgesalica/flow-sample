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

<div class="popularity-slider">
  <label for={id}>{label}: {value}</label>
  <input {id} type="range" {min} {max} {step} bind:value />
</div>

<style>
  .popularity-slider {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  label {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
  }

  input {
    width: 100%;
    accent-color: var(--ui-accent);
  }

  input:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }
</style>
