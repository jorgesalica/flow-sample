<script lang="ts">
  import { Button, Field } from '@lib/components';
  import { canvasStore } from './stores.svelte';

  let title = $state('');
  let author = $state('');
  let text = $state('');

  function handleSubmit(): void {
    if (!text.trim()) return;
    canvasStore.createAndAnalyze(text, title, author);
    title = '';
    author = '';
    text = '';
  }
</script>

<section class="canvas-editor" aria-labelledby="canvas-editor-title">
  <header>
    <h2 id="canvas-editor-title">New Canvas</h2>
    <p>Paste any text (poetry, prose, lyrics) to get a dense literary analysis.</p>
  </header>

  <div class="canvas-editor__form">
    <div class="canvas-editor__metadata">
      <Field
        label="Canvas title"
        labelHidden
        placeholder="Title (optional)"
        bind:value={title}
        class="canvas-editor__field"
        disabled={canvasStore.isAnalyzing}
      />
      <Field
        label="Canvas author"
        labelHidden
        placeholder="Author (optional)"
        bind:value={author}
        class="canvas-editor__field"
        disabled={canvasStore.isAnalyzing}
      />
    </div>

    <Field
      label="Text to analyze"
      labelHidden
      placeholder="Paste your text here..."
      bind:value={text}
      multiline
      mono
      class="canvas-editor__body"
      disabled={canvasStore.isAnalyzing}
    />

    <div class="canvas-editor__actions">
      <Button
        size="lg"
        onclick={handleSubmit}
        disabled={!text.trim() || canvasStore.isAnalyzing}
        loading={canvasStore.isAnalyzing}
      >
        {#if canvasStore.isAnalyzing}
          Analyzing...
        {:else}
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-8.7-3-3a1 1 0 0 0-1.4 1.4L10.6 9H7a1 1 0 1 0 0 2h3.6l-1.3 1.3a1 1 0 1 0 1.4 1.4l3-3a1 1 0 0 0 0-1.4Z"
              clip-rule="evenodd"
            />
          </svg>
          Analyze text
        {/if}
      </Button>
    </div>
  </div>
</section>

<style>
  .canvas-editor {
    display: flex;
    width: min(56rem, 100%);
    min-height: 100%;
    margin: 0 auto;
    flex-direction: column;
    padding: 2rem;
  }

  header {
    margin-bottom: 2rem;
  }

  h2 {
    margin: 0;
    color: var(--ui-text);
    font-size: 1.75rem;
    letter-spacing: 0;
  }

  p {
    margin: 0.5rem 0 0;
    color: var(--ui-text-muted);
  }

  .canvas-editor__form {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1rem;
  }

  .canvas-editor__metadata {
    display: flex;
    gap: 1rem;
  }

  .canvas-editor__metadata :global(.canvas-editor__field) {
    flex: 1 1 0;
  }

  .canvas-editor__form :global(.canvas-editor__body) {
    min-height: 15rem;
    flex: 1 1 auto;
  }

  .canvas-editor__actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.5rem;
  }

  .canvas-editor svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  @media (max-width: 40rem) {
    .canvas-editor {
      padding: 1rem;
    }

    .canvas-editor__metadata {
      flex-direction: column;
    }
  }
</style>
