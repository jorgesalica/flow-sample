<script lang="ts">
  let {
    value = $bindable(''),
    label,
    placeholder = '',
    multiline = false,
    rows = 4,
    disabled = false,
    required = false,
    mono = false,
    class: className = '',
  }: {
    value?: string;
    label?: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    disabled?: boolean;
    required?: boolean;
    mono?: boolean;
    class?: string;
  } = $props();

  const id = $props.id();
</script>

<label class="ui-field {className}" for={id}>
  {#if label}<span class="ui-field__label">{label}</span>{/if}
  {#if multiline}
    <textarea
      {id}
      bind:value
      {rows}
      {placeholder}
      {disabled}
      {required}
      class:ui-field__control--mono={mono}
      class="ui-field__control ui-field__textarea"
    ></textarea>
  {:else}
    <input
      {id}
      bind:value
      {placeholder}
      {disabled}
      {required}
      class:ui-field__control--mono={mono}
      class="ui-field__control"
    />
  {/if}
</label>
