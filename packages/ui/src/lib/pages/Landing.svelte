<script lang="ts">
  import { FlowLayout } from '@lib/components';
  import { getFlows } from '@lib/flows';
  import FlowBoard from './components/FlowBoard.svelte';

  const pageTitle = 'Cosmic Flow - Data Exploration Hub';
  const flows = getFlows();
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FlowLayout>
  <section class="flow-index" aria-labelledby="flow-index-title">
    <header class="flow-index__header">
      <h1 id="flow-index-title">Board</h1>
    </header>

    <div class="flow-index__content">
      <FlowBoard {flows} />
    </div>
  </section>
</FlowLayout>

<style>
  .flow-index {
    display: flex;
    min-height: calc(100dvh - var(--app-nav-height) - 3.5rem);
    flex-direction: column;
    gap: 1.5rem;
  }

  .flow-index__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  .flow-index__header h1 {
    margin: 0;
    font-size: 2rem;
  }

  .flow-index__content {
    display: flex;
    min-height: 24rem;
    flex: 1 1 auto;
  }

  @media (max-width: 40rem) {
    .flow-index {
      gap: 1rem;
    }

    .flow-index__header h1 {
      font-size: 1.75rem;
    }
  }
</style>
