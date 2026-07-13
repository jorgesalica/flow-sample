<script lang="ts">
  interface Props {
    imageUrl: string;
    albumName: string;
    durationMs: number;
    spotifyUrl?: string;
  }

  let { imageUrl, albumName, durationMs, spotifyUrl }: Props = $props();
  let formattedDuration = $derived(
    `${Math.floor(durationMs / 60000)}:${((durationMs % 60000) / 1000).toFixed(0).padStart(2, '0')}`
  );
</script>

<div class="album-art">
  <img src={imageUrl} alt="{albumName} cover" loading="lazy" />
  <span class="album-art__duration">{formattedDuration}</span>

  {#if spotifyUrl}
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="album-art__link"
      aria-label="Open in Spotify"
      title="Open in Spotify"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
        />
      </svg>
    </a>
  {/if}
</div>

<style>
  .album-art {
    position: relative;
    width: 100%;
    overflow: hidden;
    aspect-ratio: 1;
    background: var(--ui-surface-raised);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .album-art__duration {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--ui-overlay);
    color: var(--ui-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
  }

  .album-art__link {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border-radius: 50%;
    background: var(--ui-accent-strong);
    color: var(--ui-accent-contrast);
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .album-art:hover .album-art__link,
  .album-art__link:focus-visible {
    opacity: 1;
  }

  .album-art__link:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 2px;
  }

  svg {
    width: 1rem;
    height: 1rem;
  }

  @media (hover: none) {
    .album-art__link {
      opacity: 1;
    }
  }
</style>
