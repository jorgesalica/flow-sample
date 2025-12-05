<script lang="ts">
  import type { Track } from '../types';

  interface Props {
    track: Track;
  }

  let { track }: Props = $props();

  // Get the first artist for the avatar
  let mainArtist = $derived(track.artists[0]);
</script>

<article
  class="glass rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/10 hover:scale-[1.02] flex flex-col group h-full"
>
  <!-- Album Art -->
  {#if track.album.imageUrl}
    <div class="relative w-full aspect-square bg-black/20">
      <img
        src={track.album.imageUrl}
        alt="{track.album.name} cover"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <!-- Duration overlay -->
      <span
        class="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white/70 font-mono"
      >
        {Math.floor(track.durationMs / 60000)}:{((track.durationMs % 60000) / 1000)
          .toFixed(0)
          .padStart(2, '0')}
      </span>
      <!-- Spotify Link overlay -->
      {#if track.spotifyUrl}
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="absolute top-2 right-2 p-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-green-400"
          title="Open in Spotify"
        >
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
            />
          </svg>
        </a>
      {/if}
    </div>
  {/if}

  <div class="p-4 flex flex-col flex-grow">
    <!-- Artist with Avatar -->
    <div class="flex items-center gap-2 mb-2">
      {#if mainArtist?.imageUrl}
        <img
          src={mainArtist.imageUrl}
          alt={mainArtist.name}
          class="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
          loading="lazy"
        />
      {:else}
        <div
          class="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white"
        >
          {mainArtist?.name?.[0] || '?'}
        </div>
      {/if}
      <p class="text-white/60 text-sm line-clamp-1 flex-grow">
        {track.artists.map((a) => a.name).join(', ')}
      </p>
    </div>

    <!-- Title -->
    <h3
      class="font-bold text-base text-white group-hover:text-purple-300 transition-colors line-clamp-1"
      title={track.title}
    >
      {track.title}
    </h3>

    <!-- Album + Year -->
    <p class="text-white/40 text-xs mt-1 line-clamp-1">
      {track.album.name}
      {#if track.album.releaseYear}
        <span class="opacity-60">• {track.album.releaseYear}</span>
      {/if}
    </p>

    <!-- Genres Badges -->
    {#if mainArtist?.genres && mainArtist.genres.length > 0}
      <div class="flex flex-wrap gap-1 mt-3">
        {#each mainArtist.genres.slice(0, 2) as genre}
          <span
            class="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold
                   bg-purple-500/20 text-purple-300/80 border border-purple-500/20"
          >
            {genre}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Footer Stats -->
    <div class="flex justify-between items-center mt-auto pt-3">
      <!-- Popularity Bar -->
      {#if track.popularity !== undefined}
        <div class="flex items-center gap-2 flex-grow" title="Popularity: {track.popularity}%">
          <div class="w-full max-w-[60px] h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-green-500 to-emerald-400"
              style="width: {track.popularity}%"
            ></div>
          </div>
          <span class="text-[10px] text-white/40">{track.popularity}</span>
        </div>
      {/if}
      <!-- Added date -->
      <span class="text-[10px] text-white/30 ml-auto">
        {track.addedAt ? new Date(track.addedAt).toLocaleDateString() : ''}
      </span>
    </div>
  </div>
</article>
