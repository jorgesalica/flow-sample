<script lang="ts">
  import type { Track } from '@flows/shared';
  import { Button, Panel } from '@lib/components';
  import LyricsModal from '@lib/flows/lyrics/components/LyricsModal.svelte';
  import AlbumArt from './AlbumArt.svelte';
  import GenreBadges from './GenreBadges.svelte';

  let { track }: { track: Track } = $props();
  let mainArtist = $derived(track.artists[0]);
  let showLyrics = $state(false);
</script>

<div class="track-card">
  <Panel element="article" padding="none" class="spotify-track-card">
    {#if track.album.imageUrl}
      <AlbumArt
        imageUrl={track.album.imageUrl}
        albumName={track.album.name}
        durationMs={track.durationMs}
        spotifyUrl={track.spotifyUrl}
      />
    {/if}

    <div class="track-card__body">
      <div class="track-card__artist">
        {#if mainArtist?.imageUrl}
          <img src={mainArtist.imageUrl} alt={mainArtist.name} loading="lazy" />
        {:else}
          <span class="track-card__avatar" aria-hidden="true">{mainArtist?.name?.[0] || '?'}</span>
        {/if}
        <p>{track.artists.map((artist) => artist.name).join(', ')}</p>
      </div>

      <h3 title={track.title}>{track.title}</h3>
      <p class="track-card__album">
        {track.album.name}
        {#if track.album.releaseYear}<span> / {track.album.releaseYear}</span>{/if}
      </p>

      <GenreBadges genres={mainArtist?.genres || []} />

      <div class="track-card__footer">
        <Button
          variant="ghost"
          size="sm"
          onclick={(event) => {
            event.stopPropagation();
            showLyrics = true;
          }}
        >
          Lyrics
        </Button>
        {#if track.addedAt}<time datetime={track.addedAt}
            >{new Date(track.addedAt).toLocaleDateString()}</time
          >{/if}
      </div>
    </div>
  </Panel>
</div>

{#if showLyrics}
  <LyricsModal {track} onclose={() => (showLyrics = false)} />
{/if}

<style>
  .track-card {
    height: 100%;
    min-width: 0;
  }

  .track-card :global(.spotify-track-card) {
    display: flex;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    transition:
      border-color 150ms ease,
      background-color 150ms ease;
  }

  .track-card :global(.spotify-track-card:hover) {
    border-color: var(--ui-accent);
    background: var(--ui-surface-subtle);
  }

  .track-card__body {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    padding: 1rem;
  }

  .track-card__artist {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .track-card__artist img,
  .track-card__avatar {
    width: 1.5rem;
    height: 1.5rem;
    flex: 0 0 auto;
    border: 1px solid var(--ui-border);
    border-radius: 50%;
  }

  .track-card__artist img {
    object-fit: cover;
  }

  .track-card__avatar {
    display: grid;
    place-items: center;
    background: var(--ui-accent-strong);
    color: var(--ui-accent-contrast);
    font-size: 0.625rem;
    font-weight: 700;
  }

  .track-card__artist p,
  .track-card__album {
    margin: 0;
    overflow: hidden;
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    color: var(--ui-text);
    font-size: 1rem;
    letter-spacing: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-card__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: auto;
    padding-top: 0.75rem;
  }

  time {
    color: var(--ui-text-muted);
    font-size: 0.625rem;
  }
</style>
