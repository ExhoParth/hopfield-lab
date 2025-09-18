<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let container: HTMLDivElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let animationId = 0;

  onMount(() => {
    if (!container) return;

    // Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // Renderer (attach to container)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.domElement.style.display = 'block'; // avoids inline-block baseline gap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Example content (cube + light)
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, color: 0x66ccff });
    const cube = new THREE.Mesh(geo, mat);
    scene.add(cube);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 0.7));

    // Animation loop
    function animate() {
      cube.rotation.x += 0.008;
      cube.rotation.y += 0.01;
      renderer!.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }
    animate();

    // Resize handler — use full viewport (no margins)
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer!.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // cleanup
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);
      if (renderer) {
        container!.removeChild(renderer.domElement);
        renderer.dispose();
        renderer = null;
      }
    };
  });
</script>

<!-- Use fixed positioning to guarantee full viewport and prevent layout-caused overflow -->
<div class="three-wrapper" bind:this={container} />

<style>
  /* Component-level: make wrapper cover entire viewport and sit above layout */
  .three-wrapper {
    position: fixed;
    inset: 0;               /* top:0; right:0; bottom:0; left:0 */
    width: 100vw;
    height: 100vh;
    overflow: hidden;       /* ensure no internal scrollbars */
    margin: 0;
    padding: 0;
    touch-action: none;
    background: transparent; /* or a color if you prefer */
    z-index: 0;
  }

  /* If your page has other layout elements, this ensures the canvas has no baseline-gap */
  .three-wrapper canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
