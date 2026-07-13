<script lang="ts">
  import { Badge } from '@lib/components';

  let { genres, maxDisplay = 2 }: { genres: string[]; maxDisplay?: number } = $props();
</script>

{#if genres.length > 0}
  <div class="genre-list" aria-label="Genres">
    {#each genres.slice(0, maxDisplay) as genre (genre)}
      <Badge tone="info">{genre}</Badge>
    {/each}
  </div>
{/if}

<style>
  .genre-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.75rem;
  }
</style>
