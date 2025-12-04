<script lang="ts">
  import type { Track } from '../types';

  export let track: Track;

  function deriveEra(year?: number): string {
    if (!year) return '';
    if (year >= new Date().getFullYear() - 2) return 'Fresh wave';
    return `${Math.floor(year / 10) * 10}s`;
  }

  $: artistLine = track.artists.map((a) => a.name).join(', ') || 'Unknown';
  $: era = deriveEra(track.album.releaseYear);
  $: firstGenre = track.artists[0]?.genres?.[0];
</script>

<article class="glass p-4 flex flex-col gap-2 hover:bg-white/20 transition-colors">
  <h3 class="font-semibold text-lg truncate">{track.title}</h3>
  <p class="text-white/70 text-sm truncate">{artistLine}</p>
  <p class="text-white/50 text-sm">
    {track.album.name}
    {#if track.album.releaseYear}
      • {track.album.releaseYear}
    {/if}
  </p>
  <div class="flex flex-wrap gap-2 mt-1">
    {#if era}
      <span class="px-2 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">{era}</span>
    {/if}
    {#if firstGenre}
      <span class="px-2 py-0.5 text-xs rounded-full bg-blue-500/30 text-blue-200">
        {firstGenre.charAt(0).toUpperCase() + firstGenre.slice(1)}
      </span>
    {/if}
    {#if track.popularity != null}
      <span class="px-2 py-0.5 text-xs rounded-full bg-green-500/30 text-green-200">
        Pop {track.popularity}
      </span>
    {/if}
  </div>
</article>
