<script lang="ts">
  import { onMount } from 'svelte';
  import type { SvelteComponent } from 'svelte';
  import ConfigPanel from '$lib/config.svelte';

  let ThreeComponent: typeof SvelteComponent | null = null;
  let loadError: string | null = null;

  onMount(async () => {
    try {
      // dynamic import only in browser
      const mod = await import('$lib/three.svelte');
      ThreeComponent = mod.default;
    } catch (e) {
      console.error('Failed to load Three component', e);
      loadError = String(e);
    }
  });
</script>

{#if loadError}
  <div class="error">Error loading 3D: {loadError}</div>
{:else}
  {#if ThreeComponent}
    <svelte:component this={ThreeComponent} />
  {:else}
    <div class="loading">Loading 3D...</div>
  {/if}
{/if}

<!-- config panel sits on top of the 3D canvas -->
<ConfigPanel />

<style>
  /* small helper styles */
  .loading, .error {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 50;
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
  }
</style>
