<script lang="ts">
  interface Props {
    genres: string[];
    maxDisplay?: number;
  }

  let { genres, maxDisplay = 2 }: Props = $props();
</script>

{#if genres && genres.length > 0}
  <div class="flex flex-wrap gap-1 mt-3">
    {#each genres.slice(0, maxDisplay) as genre (genre)}
      <span
        class="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold
               bg-aurora/20 text-aurora border border-aurora/30"
      >
        {genre}
      </span>
    {/each}
  </div>
{/if}
