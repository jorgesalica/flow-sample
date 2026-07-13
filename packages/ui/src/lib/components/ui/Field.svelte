<script lang="ts">
  let {
    value = $bindable(''),
    label,
    labelHidden = false,
    placeholder = '',
    type = 'text',
    oninput,
    multiline = false,
    rows = 4,
    disabled = false,
    required = false,
    mono = false,
    class: className = '',
  }: {
    value?: string;
    label: string;
    labelHidden?: boolean;
    placeholder?: string;
    type?: 'text' | 'search';
    oninput?: (event: Event) => void;
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
  <span class:sr-only={labelHidden} class="ui-field__label">{label}</span>
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
      {type}
      bind:value
      {oninput}
      {placeholder}
      {disabled}
      {required}
      class:ui-field__control--mono={mono}
      class="ui-field__control"
    />
  {/if}
</label>
