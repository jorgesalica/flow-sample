<script lang="ts">
  import { canvasStore } from './stores.svelte';
  import { Button, Field } from '@lib/components';

  let title = $state('');
  let author = $state('');
  let text = $state('');

  function handleSubmit() {
    if (!text.trim()) return;
    canvasStore.createAndAnalyze(text, title, author);
    title = '';
    author = '';
    text = '';
  }
</script>

<div class="h-full flex flex-col max-w-4xl mx-auto p-6 lg:p-12 w-full">
  <div class="mb-8">
    <h2 class="text-3xl font-bold text-slate-100">New Canvas</h2>
    <p class="text-slate-400 mt-2">
      Paste any text (poetry, prose, lyrics) to get a dense literary analysis.
    </p>
  </div>

  <div class="flex flex-col gap-4 flex-1">
    <div class="flex flex-col gap-4 sm:flex-row">
      <Field
        placeholder="Title (optional)"
        bind:value={title}
        class="flex-1"
        disabled={canvasStore.isAnalyzing}
      />
      <Field
        placeholder="Author (optional)"
        bind:value={author}
        class="flex-1"
        disabled={canvasStore.isAnalyzing}
      />
    </div>

    <Field
      placeholder="Paste your text here..."
      bind:value={text}
      multiline
      mono
      class="flex-1"
      disabled={canvasStore.isAnalyzing}
    />

    <div class="flex justify-end pt-2">
      <Button
        size="lg"
        onclick={handleSubmit}
        disabled={!text.trim() || canvasStore.isAnalyzing}
        loading={canvasStore.isAnalyzing}
      >
        {#if canvasStore.isAnalyzing}
          Analyzing...
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
              clip-rule="evenodd"
            />
          </svg>
          Analyze Text
        {/if}
      </Button>
    </div>
  </div>
</div>
