// main.js — Cube scene + full-height modern scrollable right dashboard
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ---------- Renderer, Scene, Camera ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x061019);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2.8, 2.0, 2.8);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

/* ---------- Lights ---------- */
const hemi = new THREE.HemisphereLight(0xdfefff, 0x10121a, 0.6);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 6, 3);
scene.add(dir);
const spot = new THREE.SpotLight(0xffffff, 0.6, 20, Math.PI / 8, 0.3, 1);
spot.position.set(-4, 6, 4);
scene.add(spot);

/* ---------- Cube ---------- */
const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
const cubeMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(0x5aa7ff),
  metalness: 0.25,
  roughness: 0.35
});
const cube = new THREE.Mesh(cubeGeo, cubeMat);
scene.add(cube);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x03050a, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.0;
scene.add(ground);

const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.06 });
const wireMesh = new THREE.Mesh(cubeGeo, wireMat);
wireMesh.scale.set(1.01, 1.01, 1.01);
scene.add(wireMesh);

/* ---------- Dashboard Injection ---------- */
function createDashboard() {
  const style = document.createElement('style');
  style.textContent = `
.dashboard {
  position: fixed;
  right: 0; top: 0;
  height: 100%;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  box-sizing: border-box;
  background: linear-gradient(180deg, rgba(6,9,12,0.92), rgba(8,11,14,0.86));
  border-left: 1px solid rgba(255,255,255,0.03);
  backdrop-filter: blur(8px) saturate(120%);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto;
  color: #dbeeff;
  z-index: 9999;

  overflow-y: auto;           /* scrollable */
  scrollbar-width: none;      /* Firefox */
}
.dashboard::-webkit-scrollbar { display: none; } /* Chrome, Safari, Edge */

/* same styles for cards, rows, etc. as before */
.card {
  border-radius:12px;
  padding:12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.035);
  box-shadow: 0 6px 18px rgba(0,0,0,0.45);
  margin-bottom: 12px;
}
.row { display:flex; align-items:center; justify-content:space-between; margin:8px 0; gap:10px; }
.row label { font-size:13px; color:#cfe6ff; flex:1; }
.row .control { flex:1; display:flex; justify-content:flex-end; }
input[type=range] { -webkit-appearance:none; height:6px; border-radius:6px; background:rgba(255,255,255,0.08);}
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,0.6);}
input[type=color]{width:40px;height:28px;border-radius:8px;border:none;padding:0;}
.switch{position:relative;width:46px;height:24px;background:rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;}
.knob{position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:all .2s;}
.switch.on{background:linear-gradient(90deg,#65b2ff,#8a55ff);}
.switch.on .knob{transform:translateX(22px);}
  `;
  document.head.appendChild(style);

  const dash = document.createElement('div');
  dash.className = 'dashboard';
  dash.innerHTML = `
    <div class="card"><h3>Status</h3>
      <div class="row"><label>FPS</label><div id="stat-fps">0</div></div>
      <div class="row"><label>Battery</label><div id="stat-battery">100%</div></div>
      <div class="row"><label>Time</label><div id="stat-time">00:00</div></div>
    </div>

    <div class="card"><h3>Appearance</h3>
      <div class="row"><label>Color</label><div class="control"><input id="ui-color" type="color" value="#5aa7ff"></div></div>
      <div class="row"><label>Background</label><div class="control"><input id="ui-bg" type="color" value="#061019"></div></div>
      <div class="row"><label>Wireframe</label><div class="control"><div id="ui-wire" class="switch"><div class="knob"></div></div></div></div>
    </div>

    <div class="card"><h3>Material</h3>
      <div class="row"><label>Metalness</label><div class="control"><input id="ui-metal" type="range" min="0" max="1" step="0.01" value="0.25"></div></div>
      <div class="row"><label>Roughness</label><div class="control"><input id="ui-rough" type="range" min="0" max="1" step="0.01" value="0.35"></div></div>
    </div>

    <div class="card"><h3>Transform</h3>
      <div class="row"><label>Scale</label><div class="control"><input id="ui-scale" type="range" min="0.25" max="2.5" step="0.01" value="1"></div></div>
      <div class="row"><label>Rotate speed</label><div class="control"><input id="ui-speed" type="range" min="0" max="4" step="0.01" value="0.8"></div></div>
    </div>

    <div class="card"><h3>Controls</h3>
      <div class="row"><label>Auto-spin</label><div class="control"><div id="ui-autospin" class="switch"><div class="knob"></div></div></div></div>
      <div class="row"><label>Pause</label><div class="control"><div id="ui-pause" class="switch"><div class="knob"></div></div></div></div>
    </div>
  `;
  document.body.appendChild(dash);

  return {
    fps: document.getElementById('stat-fps'),
    battery: document.getElementById('stat-battery'),
    time: document.getElementById('stat-time'),
    color: document.getElementById('ui-color'),
    bg: document.getElementById('ui-bg'),
    wire: document.getElementById('ui-wire'),
    metal: document.getElementById('ui-metal'),
    rough: document.getElementById('ui-rough'),
    scale: document.getElementById('ui-scale'),
    speed: document.getElementById('ui-speed'),
    autospin: document.getElementById('ui-autospin'),
    pause: document.getElementById('ui-pause'),
  };
}

const ui = createDashboard();

/* ---------- Simple Toggle Helper ---------- */
function makeSwitch(el) {
  let state = false;
  const knob = el.querySelector('.knob');
  function set(v) {
    state = v;
    if (v) { el.classList.add('on'); } else { el.classList.remove('on'); }
  }
  el.addEventListener('click', () => set(!state));
  return { get:()=>state, set };
}
const wireSwitch = makeSwitch(ui.wire);
const autoSwitch = makeSwitch(ui.autospin); autoSwitch.set(true);
const pauseSwitch = makeSwitch(ui.pause);

/* ---------- Wire UI ---------- */
ui.color.addEventListener('input', e => cubeMat.color.set(e.target.value));
ui.bg.addEventListener('input', e => scene.background = new THREE.Color(e.target.value));
ui.metal.addEventListener('input', e => cubeMat.metalness = parseFloat(e.target.value));
ui.rough.addEventListener('input', e => cubeMat.roughness = parseFloat(e.target.value));
ui.scale.addEventListener('input', e => cube.scale.setScalar(parseFloat(e.target.value)));

/* ---------- Stats & Animate ---------- */
let last = performance.now(); let frames=0, fps=0;
function animate(now){
  requestAnimationFrame(animate);
  frames++;
  if(now-last>1000){ fps=frames; frames=0; last=now; ui.fps.textContent=fps; }
  ui.time.textContent = new Date().toLocaleTimeString().slice(0,5);
  ui.battery.textContent = Math.max(15,100-Math.floor(now*0.0002))+"%";
  if(!pauseSwitch.get() && autoSwitch.get()){
    cube.rotation.y += parseFloat(ui.speed.value)*0.01;
  }
  cubeMat.wireframe = wireSwitch.get();
  wireMesh.visible = wireSwitch.get();
  controls.update();
  renderer.render(scene,camera);
}
animate();
