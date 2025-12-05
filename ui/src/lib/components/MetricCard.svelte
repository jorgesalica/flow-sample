<script lang="ts">
  export let value: number | string;
  export let label: string;
</script>

<article class="glass p-4 flex flex-col items-center justify-center text-center">
  <p class="text-3xl font-bold text-white">{value}</p>
  <h2 class="text-sm text-white/50 mt-1">{label}</h2>
</article>
