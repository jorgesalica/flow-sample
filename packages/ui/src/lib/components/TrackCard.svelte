<script lang="ts">
  import type { Track } from '../types';
  import AlbumArt from './AlbumArt.svelte';
  import GenreBadges from './GenreBadges.svelte';

  interface Props {
    track: Track;
  }

  let { track }: Props = $props();

  // Get the first artist for the avatar
  let mainArtist = $derived(track.artists[0]);
</script>

<article
  class="glass rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/10 hover:scale-[1.02] flex flex-col group h-full hover:shadow-lg hover:shadow-aurora/10"
>
  <!-- Album Art -->
  {#if track.album.imageUrl}
    <AlbumArt
      imageUrl={track.album.imageUrl}
      albumName={track.album.name}
      durationMs={track.durationMs}
      spotifyUrl={track.spotifyUrl}
    />
  {/if}

  <div class="p-4 flex flex-col flex-grow">
    <!-- Artist with Avatar -->
    <div class="flex items-center gap-2 mb-2">
      {#if mainArtist?.imageUrl}
        <img
          src={mainArtist.imageUrl}
          alt={mainArtist.name}
          class="w-6 h-6 rounded-full object-cover ring-1 ring-aurora/30"
          loading="lazy"
        />
      {:else}
        <div
          class="w-6 h-6 rounded-full bg-gradient-to-br from-aurora to-nebula flex items-center justify-center text-[10px] font-bold text-void"
        >
          {mainArtist?.name?.[0] || '?'}
        </div>
      {/if}
      <p class="text-pulsar text-sm line-clamp-1 flex-grow">
        {track.artists.map((a) => a.name).join(', ')}
      </p>
    </div>

    <!-- Title -->
    <h3
      class="font-bold text-base text-cosmic group-hover:text-aurora transition-colors line-clamp-1"
      title={track.title}
    >
      {track.title}
    </h3>

    <!-- Album + Year -->
    <p class="text-nebula/60 text-xs mt-1 line-clamp-1">
      {track.album.name}
      {#if track.album.releaseYear}
        <span class="opacity-60">• {track.album.releaseYear}</span>
      {/if}
    </p>

    <!-- Genres Badges -->
    <GenreBadges genres={mainArtist?.genres || []} />

    <!-- Footer Stats -->
    <div class="flex justify-between items-center mt-auto pt-3">
      <!-- Popularity Bar -->
      {#if track.popularity !== undefined}
        <div class="flex items-center gap-2 flex-grow" title="Popularity: {track.popularity}%">
          <div class="w-full max-w-[60px] h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-aurora to-cyan-400"
              style="width: {track.popularity}%"
            ></div>
          </div>
          <span class="text-[10px] text-pulsar font-medium">{track.popularity}</span>
        </div>
      {/if}
      <!-- Added date -->
      <span class="text-[10px] text-nebula/50 ml-auto">
        {track.addedAt ? new Date(track.addedAt).toLocaleDateString() : ''}
      </span>
    </div>
  </div>
</article>
