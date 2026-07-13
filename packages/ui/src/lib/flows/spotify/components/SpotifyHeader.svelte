<script lang="ts">
  import type { TopStats } from '@lib/types';

  let { stats }: { stats: TopStats } = $props();
</script>

<header class="spotify-header">
  <div class="spotify-header__title">
    <a href="/">Back to flows</a>
    <h1>Spotify Flow</h1>
    <p>Your music library, visualized</p>
  </div>

  <dl class="spotify-header__stats" aria-label="Spotify library summary">
    <div>
      <dt>Tracks</dt>
      <dd class="spotify-header__accent">{stats.total}</dd>
    </div>
    <div>
      <dt>Top genre</dt>
      <dd title={stats.topGenre}>{stats.topGenre}</dd>
    </div>
  </dl>
</header>

<style>
  .spotify-header {
    display: flex;
    min-width: 0;
    align-items: end;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .spotify-header__title a {
    color: var(--ui-text-muted);
    font-size: 0.75rem;
    text-decoration: none;
  }

  .spotify-header__title a:hover {
    color: var(--ui-text);
  }

  .spotify-header__title a:focus-visible {
    outline: 2px solid var(--ui-focus);
    outline-offset: 3px;
  }

  h1 {
    margin: 0.5rem 0 0;
    color: var(--ui-text);
    font-size: 2.25rem;
    line-height: 1.1;
    letter-spacing: 0;
  }

  p {
    margin: 0.375rem 0 0;
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }

  .spotify-header__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(7rem, 1fr));
    gap: 1.5rem;
    margin: 0;
  }

  .spotify-header__stats div {
    display: grid;
    min-width: 0;
    gap: 0.25rem;
    text-align: right;
  }

  dt {
    color: var(--ui-text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    overflow: hidden;
    font-size: 1.125rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spotify-header__accent {
    color: var(--ui-accent);
    font-size: 1.75rem;
  }

  @media (max-width: 40rem) {
    .spotify-header {
      align-items: stretch;
      flex-direction: column;
    }

    h1 {
      font-size: 1.75rem;
    }

    .spotify-header__stats div {
      text-align: left;
    }
  }
</style>
