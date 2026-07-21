<script lang="ts">
  import { Landing } from '$lib/pages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<Landing {data} />
