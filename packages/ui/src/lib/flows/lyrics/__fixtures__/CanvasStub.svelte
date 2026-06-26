<script lang="ts">
  // Test stub standing in for LyricsCanvas. Renders its trackId so tests can
  // assert the flow handed the right id to the canvas branch, without driving
  // the real component's data edges.
  export let trackId: string;
</script>

<div data-testid="canvas-stub">{trackId}</div>
