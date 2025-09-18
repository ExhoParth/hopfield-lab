<script lang="ts">
  import { writable } from 'svelte/store';

  // Panel position
  const x = writable<number>(window.innerWidth - 420);
  const y = writable<number>(80);

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let panelEl: HTMLDivElement | null = null;

  // Example config state
  let speed = 1.0;
  let intensity = 0.8;
  let showHelpers = true;

  function pointerDown(e: PointerEvent) {
    if (!panelEl) return;
    dragging = true;
    panelEl.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
  }

  function pointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    x.update(v => Math.min(Math.max(10, v + dx), window.innerWidth - 160));
    y.update(v => Math.min(Math.max(10, v + dy), window.innerHeight - 60));
  }

  function pointerUp(e: PointerEvent) {
    if (!panelEl) return;
    dragging = false;
    try { panelEl.releasePointerCapture(e.pointerId); } catch {}
  }

  // Escape key resets panel position
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      x.set(window.innerWidth - 420);
      y.set(80);
    }
  }

  // Keep panel inside viewport
  function onResize() {
    x.update(v => Math.min(v, Math.max(10, window.innerWidth - 160)));
    y.update(v => Math.min(v, Math.max(10, window.innerHeight - 60)));
  }

  // update CSS vars
  x.subscribe(val => panelEl?.style.setProperty('--px', `${val}px`));
  y.subscribe(val => panelEl?.style.setProperty('--py', `${val}px`));

  // lifecycle
  import { onMount, onDestroy } from 'svelte';
  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
  });
</script>

<div
  class="config-panel"
  bind:this={panelEl}
  on:pointerdown={pointerDown}
  on:pointermove={pointerMove}
  on:pointerup={pointerUp}
  on:pointercancel={pointerUp}
  style="transform: translate(var(--px, 0px), var(--py, 0px));"
>
  <div class="drag-handle" title="Drag me (Esc resets)">
    <div class="title">Config</div>
    <div class="dots"><span></span><span></span><span></span></div>
  </div>

  <div class="content">
    <label class="row">
      <span>Simulation speed</span>
      <input type="range" min="0.1" max="3" step="0.1" bind:value={speed} />
      <code>{speed}</code>
    </label>

    <label class="row">
      <span>Light intensity</span>
      <input type="range" min="0" max="2" step="0.05" bind:value={intensity} />
      <code>{intensity}</code>
    </label>

    <label class="row inline">
      <input id="helpers" type="checkbox" bind:checked={showHelpers} />
      <label for="helpers">Show helpers</label>
    </label>

    <div class="divider" />

    <div class="section">
      <div class="section-title">Presets</div>
      <div class="preset-list">
        <button on:click={() => { speed = 0.6; intensity = 0.5; }}>Calm</button>
        <button on:click={() => { speed = 1.6; intensity = 1.2; }}>Active</button>
        <button on:click={() => { speed = 2.4; intensity = 1.6; }}>Hyper</button>
      </div>
    </div>

    <div class="divider" />

    <button class="primary"
      on:click={() => alert(`Apply (dummy): speed ${speed}, intensity ${intensity}`)}>
      Apply
    </button>
  </div>
</div>

<style>
  .config-panel {
    position: fixed;
    z-index: 30;
    width: 360px;
    max-width: calc(100vw - 40px);
    min-height: 120px;
    border-radius: 14px;
    backdrop-filter: blur(10px) saturate(120%);
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
    box-shadow: 0 10px 30px rgba(8,12,20,0.6), inset 0 1px 0 rgba(255,255,255,0.02);
    color: #eaeef6;
    font-family: Inter, system-ui, sans-serif;
    overflow: hidden;
    user-select: none;
  }

  .drag-handle {
    display: flex;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: grab;
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .drag-handle:active { cursor: grabbing; }

  .drag-handle .title { font-weight: 600; font-size: 14px; }
  .drag-handle .dots span {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    margin-left: 6px;
  }

  .content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 60vh;
    overflow: auto;
  }

  .row { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
  .row.inline { justify-content: flex-start; }
  .row input[type="range"] { width: 160px; }

  .divider {
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 4px 0;
  }

  .section-title { font-size: 12px; font-weight: 600; margin-bottom: 8px; }
  .preset-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .preset-list button {
    border: none; padding: 6px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,0.08);
    color: inherit; cursor: pointer;
  }

  .primary {
    padding: 8px 12px;
    border-radius: 10px;
    border: none;
    font-weight: 700;
    background: rgba(120,150,255,0.18);
    cursor: pointer;
  }
</style>
