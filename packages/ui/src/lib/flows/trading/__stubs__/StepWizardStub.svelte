<script lang="ts">
  // Test-only stub for StepWizard. Replaces the real component (which pulls in
  // CandleChart -> lightweight-charts, requiring a real canvas) so the TradingFlow
  // wizard branch can render under jsdom. Accepts and ignores the same props.
  // Accept (and ignore) the real component's props so render doesn't warn.

  const _props: Record<string, unknown> = $props();
</script>

<div data-testid="step-wizard-stub">StepWizard stub</div>
