import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ----------------------
// Beautiful Neuron Graph (brighter)
// ----------------------

// Scene + camera
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x061023, 0.02);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 28);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// increased exposure for brighter overall appearance
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// Add a subtle radial background via CSS to complement scene
const bg = document.createElement('div');
bg.style.position = 'fixed';
bg.style.left = '0';
bg.style.top = '0';
bg.style.right = '0';
bg.style.bottom = '0';
bg.style.zIndex = '-1';
bg.style.background = 'radial-gradient(ellipse at 20% 20%, #1b3a53 0%, #082033 30%, #030617 100%)';
document.body.appendChild(bg);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 80;

// Postprocessing (bloom) — stronger bloom for more glow
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.6, 0.6, 0.9);
// lower threshold so more things bloom, increase strength and radius
bloomPass.threshold = 0.08;
bloomPass.strength = 1.6;
bloomPass.radius = 1.0;
composer.addPass(bloomPass);

// Lights: increased intensities
const hemi = new THREE.HemisphereLight(0xfff6e6, 0x081827, 1.1); // brighter ambient-ish
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.6); // stronger key
key.position.set(12, 18, 8);
key.castShadow = true;
key.shadow.camera.left = -30;
key.shadow.camera.right = 30;
key.shadow.camera.top = 30;
key.shadow.camera.bottom = -30;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

// subtle rim/backlight to make nodes pop — stronger now
const rim = new THREE.PointLight(0x7fe9ff, 1.6, 80, 2);
rim.position.set(-18, 12, -8);
scene.add(rim);

// Parameters
const NODE_COUNT = 100;
const SPREAD = 15;
const MIN_DIST_FOR_EDGE = 8;
const MAX_EDGES_PER_NODE = 2;

// Materials — make base emissive a bit stronger for easier bloom
const nodeMaterial = new THREE.MeshStandardMaterial({
  color: 0x63d1ff,
  metalness: 0.9,
  roughness: 0.6,
  emissive: 0x073842,
  emissiveIntensity: 1.0
});
const linkMaterial = new THREE.MeshStandardMaterial({
  color: 0x8a6efc,
  metalness: 0.25,
  roughness: 0.35,
  emissive: 0x001a2b,
  emissiveIntensity: 0.12
});

// Groups
const nodeGroup = new THREE.Group();
const linkGroup = new THREE.Group();
scene.add(nodeGroup, linkGroup);

// Utility
function randomPointInSphere(radius) {
  while (true) {
    const x = (Math.random() * 2 - 1) * radius;
    const y = (Math.random() * 2 - 1) * radius;
    const z = (Math.random() * 2 - 1) * radius;
    if (x * x + y * y + z * z <= radius * radius) return new THREE.Vector3(x, y, z);
  }
}

// Create nodes
const nodes = [];
for (let i = 0; i < NODE_COUNT; i++) {
  const pos = randomPointInSphere(SPREAD);
  const radius = 0.45 * (0.45 + Math.random() * 0.025);
  const geo = new THREE.SphereGeometry(radius, 20, 36);
  const mat = nodeMaterial.clone();
  // slightly brighten per-node color
  const h = 0.55 + (Math.random() - 0.5) * 0.06;
  const s = 0.85;
  const l = 0.58;
  mat.color = new THREE.Color().setHSL(h, s, l);
  mat.emissiveIntensity = 1.0 + Math.random() * 0.6;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(pos);
  mesh.userData = {
    baseScale: 1,
    pulseSpeed: 0.7 + Math.random() * 1.6,
    pulseAmount: 0.04 + Math.random() * 0.08,
    radius,
    selected: false,
    selectionLight: null,
    glowSprite: null,
    autoLit: false,
    neighbors: []
  };
  nodeGroup.add(mesh);
  nodes.push(mesh);
}

// Links: create cylinders with smooth orientation (thick middle)
function createThickMiddleConnector(start, end, baseRadius = 0.06, radialSegments = 18, heightSegments = 12) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();

  const geometry = new THREE.CylinderGeometry(1, 1, length, radialSegments, heightSegments, true);
  const posAttr = geometry.attributes.position;

  const radiusFunc = (t) => {
    const mid = Math.sin(Math.PI * t);
    return baseRadius * (0.35 + 0.95 * mid);
  };

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const t = (y + length / 2) / length;
    const desiredR = radiusFunc(t);
    const curR = Math.sqrt(x * x + z * z) + 1e-9;
    const scale = desiredR / curR;
    posAttr.setXYZ(i, x * scale, y, z * scale);
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, linkMaterial.clone());
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // store baseline emissive info for simulation
  mesh.userData = {
    baseEmissive: mesh.material.emissive ? mesh.material.emissive.clone() : new THREE.Color(0x000000),
    baseEmissiveIntensity: mesh.material.emissiveIntensity || 0,
    autoLit: false
  };

  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
  mesh.quaternion.copy(quat);

  return mesh;
}

// Build edges with simple degree limiting
const degrees = new Array(nodes.length).fill(0);
const links = [];
for (let i = 0; i < nodes.length; i++) {
  const candidates = [];
  for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue;
    const d = nodes[i].position.distanceTo(nodes[j].position);
    if (d >= MIN_DIST_FOR_EDGE) candidates.push({ j, d });
  }
  candidates.sort((a, b) => a.d - b.d);
  let added = 0;
  for (const c of candidates) {
    if (added >= MAX_EDGES_PER_NODE) break;
    if (degrees[c.j] >= MAX_EDGES_PER_NODE) continue;
    if (i < c.j) {
      const link = createThickMiddleConnector(nodes[i].position, nodes[c.j].position, 0.06);
      link.scale.x = link.scale.y = 0.85 + Math.random() * 0.3;
      linkGroup.add(link);
      links.push(link);
      degrees[i] += 1;
      degrees[c.j] += 1;
      added++;

      // record neighbors for cluster flashing
      nodes[i].userData.neighbors.push(nodes[c.j]);
      nodes[c.j].userData.neighbors.push(nodes[i]);
    }
  }
}

// Add soft particles (glow dust) — brighter and slightly larger
const particleCount = 220;
const pGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pSizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  const p = randomPointInSphere(SPREAD * 1.8);
  pPositions[i * 3 + 0] = p.x;
  pPositions[i * 3 + 1] = p.y;
  pPositions[i * 3 + 2] = p.z;
  pSizes[i] = 4.5 + Math.random() * 8.5;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

const particleMaterial = new THREE.PointsMaterial({
  size: 0.22,
  sizeAttenuation: true,
  transparent: true,
  opacity: 1.0,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(pGeo, particleMaterial);
scene.add(particles);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Create a soft glow sprite to attach to selected nodes (brighter gradient)
function makeGlowSprite(color = 0xa6ecff, scale = 1.0) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // stronger radial gradient for brighter glow
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1.0)');
  grd.addColorStop(0.12, 'rgba(166,236,255,0.98)');
  grd.addColorStop(0.3, 'rgba(100,220,255,0.7)');
  grd.addColorStop(1, 'rgba(2,4,7,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(scale * 3.6);
  return sprite;
}

// Selection logic: selection light is brighter now
function selectNode(node) {
  const ud = node.userData;
  if (ud.selected) return;

  // stronger point light attached to node
  const pl = new THREE.PointLight(0xf8fbff, 2.6, 14, 2);
  pl.position.set(0, 0, 0);
  pl.castShadow = false;
  node.add(pl);
  ud.selectionLight = pl;

  const sprite = makeGlowSprite(0xa6ecff, 1.0 + node.userData.radius * 0.15);
  sprite.position.set(0, 0, 0.01);
  node.add(sprite);
  ud.glowSprite = sprite;

  node.material.emissive = new THREE.Color(0x1b4048);
  node.material.emissiveIntensity = 1.4;
  ud.selected = true;
}

function deselectNode(node) {
  const ud = node.userData;
  if (!ud.selected) return;
  if (ud.selectionLight) node.remove(ud.selectionLight);
  if (ud.glowSprite) node.remove(ud.glowSprite);
  ud.selectionLight = null;
  ud.glowSprite = null;

  node.material.emissive.setHex(0x073842);
  node.material.emissiveIntensity = 1.0;
  ud.selected = false;
}

function toggleSelection(node) {
  if (node.userData.selected) deselectNode(node);
  else selectNode(node);
}

function onPointerDown(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(nodeGroup.children, false);
  if (intersects.length > 0) {
    const hit = intersects[0].object;
    toggleSelection(hit);
  }
}
window.addEventListener('pointerdown', onPointerDown);

// Clear all selections
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'c') {
    nodes.forEach(n => deselectNode(n));
  }
});

// ---------------------------
// Random auto-lighting system (EXTREME activity + cluster bursts)
// ---------------------------
// Config: very high activity (unchanged from prior extreme)
const AUTO_INTERVAL_MS = 60;     // try launching bursts every 40ms
const NODE_PROBABILITY = 0.48;   // slightly favor nodes
const MIN_FLASH_MS = 20;        // each flash lasts at least 400ms
const MAX_FLASH_MS = 30;       // flashes can last up to 4000ms
const MAX_SIMULTANEOUS = 20;     // allow up to 80 simultaneous auto-lit items (bumped higher)

// cluster behavior
const CLUSTER_CHANCE = 0.36;
const CLUSTER_FACTOR = 0.35;

const autoActive = new Set();

function flashNodeRandomly(node, duration, isClustered = false) {
  if (!node || node.userData.autoLit) return;
  node.userData.autoLit = true;
  autoActive.add(node);

  const wasSelected = node.userData.selected;
  // temporarily apply selection visuals (brighter now)
  selectNode(node);

  // cluster neighbors sometimes
  if (!isClustered && Math.random() < CLUSTER_CHANCE && node.userData.neighbors && node.userData.neighbors.length > 0) {
    const neigh = node.userData.neighbors.slice();
    const pickCount = Math.max(1, Math.floor(neigh.length * CLUSTER_FACTOR));
    for (let i = 0; i < pickCount; i++) {
      const idx = Math.floor(Math.random() * neigh.length);
      const neighbor = neigh.splice(idx, 1)[0];
      const ndur = Math.max(220, duration * (0.35 + Math.random() * 0.6));
      setTimeout(() => flashNodeRandomly(neighbor, ndur, true), 20 + Math.random() * 90);
    }
  }

  setTimeout(() => {
    node.userData.autoLit = false;
    autoActive.delete(node);
    if (!wasSelected) {
      deselectNode(node);
    }
  }, duration);
}

function flashLinkRandomly(link, duration) {
  if (!link || link.userData.autoLit) return;
  link.userData.autoLit = true;
  autoActive.add(link);

  const mat = link.material;
  const baseEmissive = link.userData.baseEmissive ? link.userData.baseEmissive.clone() : new THREE.Color(0x000000);
  const baseIntensity = link.userData.baseEmissiveIntensity || 0;

  // brighter link flash
  mat.emissive = new THREE.Color(0x9ff7ff);
  const targetIntensity = 2.6;
  const targetScale = link.scale.clone().multiplyScalar(1.24);
  const start = performance.now();

  function animatePulse(now) {
    const elapsed = now - start;
    if (elapsed < duration) {
      let t = elapsed / duration;
      const amp = Math.sin(Math.PI * t);
      mat.emissiveIntensity = baseIntensity + (targetIntensity - baseIntensity) * amp;
      link.scale.lerp(targetScale, 0.08 * amp + 0.02);
      requestAnimationFrame(animatePulse);
    } else {
      mat.emissive = baseEmissive.clone();
      mat.emissiveIntensity = baseIntensity;
      link.scale.lerp(link.scale.clone().multiplyScalar(0.9999), 0.5);
      link.userData.autoLit = false;
      autoActive.delete(link);
    }
  }
  requestAnimationFrame(animatePulse);
}

// Burst scheduler: very large bursts (6..20) — more aggressive now
const autoTimer = setInterval(() => {
  const burstSize = 8 + Math.floor(Math.random() * 24); // 8..31

  for (let b = 0; b < burstSize; b++) {
    if (autoActive.size >= MAX_SIMULTANEOUS) return;

    if (Math.random() < NODE_PROBABILITY && nodes.length > 0) {
      const candidates = nodes.filter(n => !n.userData.autoLit);
      if (candidates.length === 0) continue;
      const node = candidates[Math.floor(Math.random() * candidates.length)];
      const dur = MIN_FLASH_MS + Math.random() * (MAX_FLASH_MS - MIN_FLASH_MS);
      flashNodeRandomly(node, dur);
    } else if (links.length > 0) {
      const candidates = links.filter(l => !l.userData.autoLit);
      if (candidates.length === 0) continue;
      const link = candidates[Math.floor(Math.random() * candidates.length)];
      const dur = MIN_FLASH_MS + Math.random() * (MAX_FLASH_MS - MIN_FLASH_MS);
      flashLinkRandomly(link, dur);
    }
  }
}, AUTO_INTERVAL_MS);

window.__autoLighting = {
  stop: () => clearInterval(autoTimer),
  setInterval: (ms) => { /* reload required to re-create timer */ },
  config: { AUTO_INTERVAL_MS, NODE_PROBABILITY, MIN_FLASH_MS, MAX_FLASH_MS, MAX_SIMULTANEOUS, CLUSTER_CHANCE, CLUSTER_FACTOR }
};

// ---------------------------
// End auto-lighting block
// ---------------------------

// On resize
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

// Animation
let t = 0;
function animate() {
  t += 0.016;

  nodeGroup.children.forEach((node, idx) => {
    const ud = node.userData;
    const base = ud.selected ? 1.12 : 1.0;
    const scale = base + Math.sin(t * ud.pulseSpeed + idx * 0.5) * ud.pulseAmount;
    node.scale.setScalar(scale);

    if (ud.selected && ud.glowSprite) {
      const s = 1.0 + 0.08 * Math.sin(t * 3.0 + idx);
      ud.glowSprite.scale.setScalar((1.0 + ud.radius * 0.15) * s * 3.6);
      if (ud.selectionLight) ud.selectionLight.intensity = 2.0 + 1.0 * Math.sin(t * 3.0 + idx);
    }

    const h = 0.55 + 0.04 * Math.sin(t * ud.pulseSpeed + idx * 0.5);
    node.material.color.setHSL(h, 0.82, 0.57);
  });

  nodeGroup.rotation.y += 0.0025;
  nodeGroup.rotation.x += 0.0009;
  linkGroup.rotation.copy(nodeGroup.rotation);
  particles.rotation.y += 0.0007;

  controls.update();

  composer.render();
  requestAnimationFrame(animate);
}

animate();

// Small UI hint
const info = document.createElement('div');
info.style.position = 'fixed';
info.style.left = '16px';
info.style.bottom = '16px';
info.style.padding = '10px 14px';
info.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.16))';
info.style.color = '#eaf6ff';
info.style.fontFamily = 'Inter, Roboto, sans-serif';
info.style.fontSize = '13px';
info.style.borderRadius = '8px';
info.style.backdropFilter = 'blur(6px)';
info.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
info.innerHTML = `Click nodes to toggle glow & light • Drag to orbit • Press 'c' to clear`;
document.body.appendChild(info);
