import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ----------------------
// Beautiful Neuron Graph
// ----------------------
// Features:
// - Soft physically-based materials (MeshStandardMaterial)
// - Environment lighting + point lights
// - Orbit controls for smooth interaction
// - Bloom postprocess for glow
// - Smooth selection glow & pulsing
// - Subtle fog + background radial gradient via CSS
// - Responsive + high-DPI support

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
renderer.toneMappingExposure = 1.0;
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
bg.style.background = 'radial-gradient(ellipse at 20% 20%, #10243a 0%, #061023 40%, #020417 100%)';
document.body.appendChild(bg);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 80;

// Postprocessing (bloom)
const composer = new EffectComposer(renderer);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.4, 0.15);
bloomPass.threshold = 0.15;
bloomPass.strength = 0.9;
bloomPass.radius = 0.6;
composer.addPass(bloomPass);

// Lights
const hemi = new THREE.HemisphereLight(0xfff6e6, 0x081827, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 0.8);
key.position.set(12, 18, 8);
key.castShadow = true;
key.shadow.camera.left = -30;
key.shadow.camera.right = 30;
key.shadow.camera.top = 30;
key.shadow.camera.bottom = -30;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

// subtle rim/backlight to make nodes pop
const rim = new THREE.PointLight(0x6fd3ff, 0.8, 60, 2);
rim.position.set(-18, 12, -8);
scene.add(rim);

// Parameters
const NODE_COUNT = 75;
const SPREAD = 92;
const MIN_DIST_FOR_EDGE = 3.2;
const MAX_EDGES_PER_NODE = 3;

// Materials
const nodeMaterial = new THREE.MeshStandardMaterial({
  color: 0x63d1ff,
  metalness: 0.12,
  roughness: 0.38,
  emissive: 0x05202c,
  emissiveIntensity: 0.6
});
const linkMaterial = new THREE.MeshStandardMaterial({
  color: 0x6b7ef5,
  metalness: 0.25,
  roughness: 0.45
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
  const radius = 0.75 * (0.8 + Math.random() * 0.9);
  const geo = new THREE.SphereGeometry(radius, 40, 36);
  const mat = nodeMaterial.clone();
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
    glowSprite: null
  };
  nodeGroup.add(mesh);
  nodes.push(mesh);
}

// Links: create cylinders with smooth orientation
function createCylinderBetweenPoints(start, end, radius = 0.08) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18, 1, true);
  const mesh = new THREE.Mesh(geometry, linkMaterial.clone());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
  mesh.quaternion.copy(quat);
  return mesh;
}

// Build edges with simple degree limiting
const degrees = new Array(nodes.length).fill(0);
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
      const link = createCylinderBetweenPoints(nodes[i].position, nodes[c.j].position, 0.06);
      // subtle taper effect via scaling
      link.scale.x = link.scale.y = 0.85 + Math.random() * 0.3;
      linkGroup.add(link);
      degrees[i] += 1;
      degrees[c.j] += 1;
      added++;
    }
  }
}

// Add soft particles (glow dust) using Points with additive blending via PointsMaterial
const particleCount = 180;
const pGeo = new THREE.BufferGeometry();
const pPositions = new Float32Array(particleCount * 3);
const pSizes = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
  const p = randomPointInSphere(SPREAD * 1.8);
  pPositions[i * 3 + 0] = p.x;
  pPositions[i * 3 + 1] = p.y;
  pPositions[i * 3 + 2] = p.z;
  pSizes[i] = 3.5 + Math.random() * 6.5;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

const particleMaterial = new THREE.PointsMaterial({
  size: 0.18,
  sizeAttenuation: true,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(pGeo, particleMaterial);
scene.add(particles);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Create a soft glow sprite to attach to selected nodes
function makeGlowSprite(color = 0xa6ecff, scale = 1.0) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // draw radial gradient
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.15, 'rgba(1,124,1,0.9)');
  grd.addColorStop(0.35, 'rgba(12,12,255,0.45)');
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

// Selection logic: allow multiple selections; each selected node gets a gentle point light + glow sprite that pulses
function selectNode(node) {
  const ud = node.userData;
  if (ud.selected) return; // already selected

  // Point light attached to node
  const pl = new THREE.PointLight(0xf0f1ff, 1.6, 10, 2);
  pl.position.set(0, 0, 0);
  pl.castShadow = false; // avoid shadow cost
  node.add(pl);
  ud.selectionLight = pl;

  // Glow sprite
  const sprite = makeGlowSprite(0xa6ecff, 1.0 + node.userData.radius * 0.15);
  sprite.position.set(0, 0, 0.01);
  node.add(sprite);
  ud.glowSprite = sprite;

  // visual changes
  node.material.emissive = new THREE.Color(0x16303a);
  node.material.emissiveIntensity = 0.9;
  ud.selected = true;
}

function deselectNode(node) {
  const ud = node.userData;
  if (!ud.selected) return;
  if (ud.selectionLight) node.remove(ud.selectionLight);
  if (ud.glowSprite) node.remove(ud.glowSprite);
  ud.selectionLight = null;
  ud.glowSprite = null;

  node.material.emissive.setHex(0x05202c);
  node.material.emissiveIntensity = 0.6;
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

  // pulse nodes, and gently rotate the whole network
  nodeGroup.children.forEach((node, idx) => {
    const ud = node.userData;
    const base = ud.selected ? 1.12 : 1.0;
    const scale = base + Math.sin(t * ud.pulseSpeed + idx * 0.5) * ud.pulseAmount;
    node.scale.setScalar(scale);

    // if selected, make glow pulse
    if (ud.selected && ud.glowSprite) {
      const s = 1.0 + 0.08 * Math.sin(t * 3.0 + idx);
      ud.glowSprite.scale.setScalar((1.0 + ud.radius * 0.15) * s * 3.6);
      if (ud.selectionLight) ud.selectionLight.intensity = 1.2 + 0.6 * Math.sin(t * 3.0 + idx);
    }

    // color shift for subtle life
    const h = 0.55 + 0.04 * Math.sin(t * ud.pulseSpeed + idx * 0.5);
    node.material.color.setHSL(h, 0.82, 0.54);
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
info.style.background = 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.25))';
info.style.color = '#eaf6ff';
info.style.fontFamily = 'Inter, Roboto, sans-serif';
info.style.fontSize = '13px';
info.style.borderRadius = '8px';
info.style.backdropFilter = 'blur(6px)';
info.style.boxShadow = '0 6px 18px rgba(0,0,0,0.6)';
info.innerHTML = `Click nodes to toggle glow & light • Drag to orbit • Press 'c' to clear`;
document.body.appendChild(info);
