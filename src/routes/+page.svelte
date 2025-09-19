<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  let canvas: HTMLCanvasElement | null = null;

  // we'll initialize these in onMount
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let cube: THREE.Mesh | null = null;
  let rafId = 0;

  // declare resize so we can remove listener in onDestroy
  let resize: () => void = () => {};

  onMount(() => {
    if (!canvas) return;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setPixelRatio(window.devicePixelRatio ?? 1);

    // Scene + Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 3;

    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial();
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Resize handler
    resize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    // run once and listen
    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const animate = (t: number) => {
      if (!renderer || !scene || !camera || !cube) return;
      const time = t * 0.001;
      cube.rotation.x = time * 0.6;
      cube.rotation.y = time * 0.9;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
  });

  onDestroy(() => {
    // stop loop
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);

    // dispose resources safely
    if (cube) {
      if (cube.geometry) (cube.geometry as THREE.BufferGeometry).dispose();
      if (Array.isArray(cube.material)) {
        cube.material.forEach((m) => (m as THREE.Material).dispose());
      } else {
        (cube.material as THREE.Material).dispose();
      }
      scene?.remove(cube);
      cube = null;
    }

    if (renderer) {
      // try to lose context for cleaner cleanup
      const gl = renderer.getContext();
      renderer.dispose();
      if (gl && (gl as any).getExtension) {
        const loseExt = (gl as any).getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
      }
      renderer = null;
    }

    scene = null;
    camera = null;
  });
</script>

<style>
  :global(body) { margin: 0; }
  canvas { display: block; width: 100vw; height: 100vh; }
</style>

<canvas bind:this={canvas} id="c" />
