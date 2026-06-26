<script lang="ts">
  // Test-only stub for CandleChart. The real component renders via
  // lightweight-charts (createChart needs a real canvas/WebGL), which does not
  // work under jsdom. This stub accepts (and ignores) the same props so the
  // parent (StepWizard) can render and be asserted in isolation.

  const _props: Record<string, unknown> = $props();
</script>

<div data-testid="candle-chart-stub">CandleChart stub</div>
