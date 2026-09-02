/* Hero visual for the landing page.
 *
 * Renders the project's own thesis as something you travel through: four
 * boundaries stacked in depth (browser, web, API, database), traffic
 * converging inward as it goes, and a camera that flies through every one of
 * them as you scroll. Built on the vendored three.js in /vendor/three — see
 * that directory's PROVENANCE.md for version and hashes. There is no build
 * step; the import map in index.html resolves `three` to a file in this
 * repository.
 *
 * Progressive enhancement, in order of what the visitor gets:
 *   no JS / no module support -> the CSS gradient stage, hero stays one screen
 *   no WebGL2 / no float RTs  -> same; nothing is added and nothing breaks
 *   reduced motion            -> one static frame, one screen, no scroll link
 *   low-power device          -> quarter the particles, no bloom, capped DPR
 *   otherwise                 -> the full flight
 *
 * The taller scrolling stage is opt-in: it is only applied once the visual is
 * confirmed running, so every fallback keeps the compact one-screen hero and
 * reaches the content immediately.
 */

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* Everything below runs inside boot(). Anything unsupported throws, which
 * lands in the catch at the bottom and simply leaves the CSS stage in place —
 * no half-built scene, and no uncaught error in a visitor's console. */
function boot() {

const canvas = document.getElementById('hero-canvas');
const hero = document.querySelector('.hero');
const layers = document.querySelectorAll('#hero-boundaries li');
if (!canvas || !hero) throw new Error('hero markup missing');

const reduceMotion = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Hints, not guarantees — the frame-time watchdog below stays in place. */
function wantsLightBuild() {
  if (window.innerWidth < 760) return true;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
  return false;
}

let light = wantsLightBuild();

/* ------------------------------------------------------------------ scene */

/* The four boundaries, front to back, narrowing as traffic converges on one
 * store. Colours run along this project's own banner gradient. The names the
 * visitor reads are in index.html, not here; keep the two lists in the same
 * order. */
const BOUNDARIES = [
  { z:   0.0, r: 5.6, color: 0x3fcf8e, name: 'Browser' },
  { z:  -7.0, r: 4.3, color: 0x38bdf8, name: 'Next.js' },
  { z: -14.0, r: 3.1, color: 0x74a0fb, name: 'Rust API' },
  { z: -21.0, r: 1.9, color: 0xa78bfa, name: 'PostgreSQL' }
];

const CAMERA_START = 7.5;
const CAMERA_END = -18.0;

/* Probe before handing the canvas to three.js: its renderer logs its own
 * console error on failure, and a browser without WebGL2 has done nothing
 * wrong. Release the probe context straight away — they are a limited
 * resource and the real one is about to be created. */
const probe = document.createElement('canvas').getContext('webgl2');
if (!probe) throw new Error('WebGL2 unavailable');
const loseProbe = probe.getExtension('WEBGL_lose_context');
if (loseProbe) loseProbe.loseContext();

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: !light,
  powerPreference: 'low-power'
});
if (!renderer.capabilities.isWebGL2) {
  renderer.dispose();
  throw new Error('WebGL2 required');
}
renderer.setClearColor(0x000000, 0);

/* GPUComputationRenderer needs to render into float textures. Without this
 * extension it does not fail cleanly — it builds an incomplete framebuffer and
 * then loops, drawing nothing and logging a GL error every frame. Check up
 * front so such a device gets the CSS stage instead of a dead animation. */
if (!renderer.extensions.has('EXT_color_buffer_float')) {
  renderer.dispose();
  throw new Error('float render targets unavailable');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
camera.position.set(0, 0, CAMERA_START);

/* --------------------------------------------------------- the boundaries */

/* Rings make each boundary read as a plane you cross rather than as a loose
 * cloud, which is the whole point of the picture. */
/* Everything lives in one group so it can be pushed into the empty half of
 * the stage on wide screens, leaving the headline on cleaner ground. */
const world = new THREE.Group();
scene.add(world);

const ringGroup = new THREE.Group();
const ringMats = [];
BOUNDARIES.forEach((b) => {
  const pts = [];
  const SEG = light ? 72 : 144;
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * b.r, Math.sin(a) * b.r * 0.86, b.z));
  }
  const ringMat = new THREE.LineBasicMaterial({
    color: b.color, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  ringGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));

  /* Spokes, so the ring has some structure when you pass through it. */
  const spokes = [];
  const N = light ? 16 : 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const inner = 0.82 + (i % 3) * 0.05;
    spokes.push(
      new THREE.Vector3(Math.cos(a) * b.r * inner, Math.sin(a) * b.r * 0.86 * inner, b.z),
      new THREE.Vector3(Math.cos(a) * b.r, Math.sin(a) * b.r * 0.86, b.z)
    );
  }
  const spokeMat = new THREE.LineBasicMaterial({
    color: b.color, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  ringGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(spokes), spokeMat));

  ringMats.push({ z: b.z, ring: ringMat, spokes: spokeMat });
});
world.add(ringGroup);

/* ------------------------------------------------- the particle simulation */

const SIM = light ? 128 : 256;            /* SIM * SIM particles */
const COUNT = SIM * SIM;

/* A cheap value-noise field. Written here rather than pulled in so the only
 * vendored dependency stays three.js itself. */
const NOISE_GLSL = `
  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash13(i + vec3(0,0,0)), hash13(i + vec3(1,0,0)), f.x),
          mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
          mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  /* Gradient of the field, turned across the travel axis. Not a true curl,
   * but it swirls around the path without the clumping a raw gradient gives,
   * at a third of the noise samples. */
  vec3 swirl(vec3 p) {
    const float e = 0.28;
    vec3 g = vec3(
      vnoise(p + vec3(e,0,0)) - vnoise(p - vec3(e,0,0)),
      vnoise(p + vec3(0,e,0)) - vnoise(p - vec3(0,e,0)),
      vnoise(p + vec3(0,0,e)) - vnoise(p - vec3(0,0,e))) / (2.0 * e);
    return cross(g, vec3(0.0, 0.0, 1.0));
  }
`;

const FRONT_Z = BOUNDARIES[0].z;
const BACK_Z = BOUNDARIES[BOUNDARIES.length - 1].z;

const POSITION_FRAG = `
  uniform float uDelta;
  uniform float uTime;
  ${NOISE_GLSL}
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D(texturePosition, uv);
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    pos.xyz += vel * uDelta;
    pos.w -= uDelta * 0.055;

    /* Past the store, or spent: re-enter at the outermost boundary. */
    if (pos.w <= 0.0 || pos.z < ${BACK_Z.toFixed(1)} - 3.0) {
      float a = hash13(vec3(uv * 91.7, uTime)) * 6.2831853;
      float r = 1.2 + hash13(vec3(uv * 37.1, uTime + 5.0)) * ${BOUNDARIES[0].r.toFixed(1)};
      pos.x = cos(a) * r;
      pos.y = sin(a) * r * 0.86;
      pos.z = ${FRONT_Z.toFixed(1)} + 3.5 + hash13(vec3(uv * 13.3, uTime + 9.0)) * 5.0;
      pos.w = 0.55 + hash13(vec3(uv * 61.9, uTime + 2.0)) * 0.45;
    }
    gl_FragColor = pos;
  }
`;

/* The funnel: the further in a particle gets, the tighter the radius it is
 * pulled toward. Many clients at the front, one store at the back. */
const VELOCITY_FRAG = `
  uniform float uDelta;
  uniform float uTime;
  ${NOISE_GLSL}
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pos = texture2D(texturePosition, uv).xyz;
    vec3 vel = texture2D(textureVelocity, uv).xyz;

    vel += swirl(pos * 0.16 + vec3(0.0, 0.0, uTime * 0.06)) * uDelta * 5.5;
    vel.z -= uDelta * 1.15;

    float t = clamp((${FRONT_Z.toFixed(1)} - pos.z) / ${(FRONT_Z - BACK_Z).toFixed(1)}, 0.0, 1.0);
    float targetR = mix(${BOUNDARIES[0].r.toFixed(1)}, ${BOUNDARIES[3].r.toFixed(1)}, t);
    vec2 radial = pos.xy;
    float len = max(length(radial), 0.0001);
    vel.xy -= (radial / len) * (len - targetR) * uDelta * 1.6;

    vel *= 0.965;
    gl_FragColor = vec4(vel, 1.0);
  }
`;

const gpu = new GPUComputationRenderer(SIM, SIM, renderer);
const posTex = gpu.createTexture();
const velTex = gpu.createTexture();

(function seed() {
  const p = posTex.image.data, v = velTex.image.data;
  for (let i = 0; i < COUNT; i++) {
    const o = i * 4;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * BOUNDARIES[0].r;
    p[o] = Math.cos(a) * r;
    p[o + 1] = Math.sin(a) * r * 0.86;
    p[o + 2] = FRONT_Z + 4 - Math.random() * (FRONT_Z - BACK_Z + 6);
    p[o + 3] = 0.3 + Math.random() * 0.7;
    v[o] = v[o + 1] = 0;
    v[o + 2] = -0.4 - Math.random() * 0.5;
    v[o + 3] = 1;
  }
})();

const varPos = gpu.addVariable('texturePosition', POSITION_FRAG, posTex);
const varVel = gpu.addVariable('textureVelocity', VELOCITY_FRAG, velTex);
gpu.setVariableDependencies(varPos, [varPos, varVel]);
gpu.setVariableDependencies(varVel, [varPos, varVel]);
varPos.material.uniforms.uDelta = { value: 0 };
varPos.material.uniforms.uTime = { value: 0 };
varVel.material.uniforms.uDelta = { value: 0 };
varVel.material.uniforms.uTime = { value: 0 };

const gpuError = gpu.init();
if (gpuError !== null) {
  /* Almost always missing float render target support. */
  renderer.dispose();
  throw new Error('GPGPU unavailable: ' + gpuError);
}

/* ---------------------------------------------------- drawing the particles */

const refs = new Float32Array(COUNT * 2);
for (let y = 0; y < SIM; y++) {
  for (let x = 0; x < SIM; x++) {
    const i = y * SIM + x;
    refs[i * 2] = (x + 0.5) / SIM;
    refs[i * 2 + 1] = (y + 0.5) / SIM;
  }
}

const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
pointGeo.setAttribute('aRef', new THREE.BufferAttribute(refs, 2));

const pointMat = new THREE.ShaderMaterial({
  uniforms: {
    uPositions: { value: null },
    uScale: { value: 1 },
    uFront: { value: FRONT_Z },
    uSpan: { value: FRONT_Z - BACK_Z },
    uNear: { value: new THREE.Color(0x3fcf8e) },
    uMid: { value: new THREE.Color(0x38bdf8) },
    uFar: { value: new THREE.Color(0xa78bfa) }
  },
  vertexShader: `
    attribute vec2 aRef;
    uniform sampler2D uPositions;
    uniform float uScale;
    uniform float uFront;
    uniform float uSpan;
    uniform vec3 uNear;
    uniform vec3 uMid;
    uniform vec3 uFar;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec4 p = texture2D(uPositions, aRef);
      vec4 mv = modelViewMatrix * vec4(p.xyz, 1.0);
      gl_Position = projectionMatrix * mv;
      float depth = max(-mv.z, 0.2);
      gl_PointSize = clamp(uScale / depth, 1.0, 9.0);
      /* Colour by how deep into the stack the particle has travelled. */
      float t = clamp((uFront - p.z) / uSpan, 0.0, 1.0);
      vColor = t < 0.5 ? mix(uNear, uMid, t * 2.0) : mix(uMid, uFar, (t - 0.5) * 2.0);
      /* Fade in on spawn and out on death so nothing pops. */
      vAlpha = smoothstep(0.0, 0.18, p.w) * smoothstep(1.0, 0.72, p.w) * 0.42;
      vAlpha *= 1.0 - smoothstep(14.0, 34.0, depth);
    }
  `,
  fragmentShader: `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec2 d = gl_PointCoord - vec2(0.5);
      float r = dot(d, d);
      if (r > 0.25) discard;
      float a = smoothstep(0.25, 0.0, r) * vAlpha;
      gl_FragColor = vec4(vColor * a, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending
});

const points = new THREE.Points(pointGeo, pointMat);
points.frustumCulled = false;
world.add(points);

/* ------------------------------------------------------------ composition */

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
renderPass.clearAlpha = 0;
composer.addPass(renderPass);

let bloomPass = null;
if (!light) {
  bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.6, 0.25);
  composer.addPass(bloomPass);
}
composer.addPass(new OutputPass());

/* ------------------------------------------------------------- dimensions */

let dpr = 1;
function maxPixelRatio() { return light ? 1.25 : 1.75; }

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio());
  renderer.setPixelRatio(dpr);
  renderer.setSize(rect.width, rect.height, false);
  composer.setPixelRatio(dpr);
  composer.setSize(rect.width, rect.height);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  pointMat.uniforms.uScale.value = rect.height * 0.014 * dpr;
  /* Wide stages have an empty right half; sit the structure there rather than
   * behind the headline. Narrow ones keep it centred. */
  world.position.x = rect.width > 900 ? 2.1 : 0;
  return true;
}

/* ------------------------------------------------------------ the flight */

let progress = 0;
let shownBoundary = -1;
let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;

function scrollProgress() {
  const span = hero.offsetHeight - window.innerHeight;
  if (span <= 0) return 0;
  return Math.min(Math.max(-hero.getBoundingClientRect().top / span, 0), 1);
}

function updateLabel(p) {
  if (!layers.length) return;
  const i = Math.min(layers.length - 1, Math.floor(p * BOUNDARIES.length));
  if (i === shownBoundary) return;
  shownBoundary = i;
  for (let k = 0; k < layers.length; k++) layers[k].classList.toggle('is-here', k === i);
}

function place(p, time) {
  /* Ease so each boundary reads as an arrival rather than a constant drift. */
  const eased = p * p * (3 - 2 * p);
  camera.position.z = CAMERA_START + (CAMERA_END - CAMERA_START) * eased;
  camera.position.x = Math.sin(time * 0.13) * 0.5 + pointerX * 0.9;
  camera.position.y = Math.cos(time * 0.11) * 0.34 - pointerY * 0.6;
  camera.lookAt(0, 0, camera.position.z - 6);
  camera.rotation.z = Math.sin(time * 0.07) * 0.035;
  ringGroup.rotation.z = time * 0.02;

  for (let i = 0; i < ringMats.length; i++) {
    const m = ringMats[i];
    const near = Math.max(0, 1 - Math.abs(camera.position.z - m.z) / 3.5);
    m.ring.opacity = 0.85 + near * near * 1.1;
    m.spokes.opacity = 0.55 + near * near * 0.9;
  }
}

function draw(time) {
  pointMat.uniforms.uPositions.value = gpu.getCurrentRenderTarget(varPos).texture;
  place(progress, time);
  composer.render();
}

/* ------------------------------------------------------------- lifecycle */

let running = false, rafId = 0, last = 0, clock = 0;
let visible = true, onScreen = true, contextLost = false, started = false;
let slowFrames = 0, sampled = 0;

function step(dt, time) {
  varPos.material.uniforms.uDelta.value = dt;
  varVel.material.uniforms.uDelta.value = dt;
  varPos.material.uniforms.uTime.value = time;
  varVel.material.uniforms.uTime.value = time;
  gpu.compute();
}

function frame(now) {
  rafId = 0;
  if (!running) return;
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
  last = now;
  clock += dt;

  progress = scrollProgress();
  updateLabel(progress);
  step(dt, clock);
  draw(clock);

  if (!light && sampled < 90) {
    sampled++;
    if (dt > 0.034) slowFrames++;
    if (sampled === 90 && slowFrames > 45) downgrade();
  }

  rafId = window.requestAnimationFrame(frame);
}

/* Only ever step down, and only once: bloom goes first, then pixel ratio. */
function downgrade() {
  if (light) return;
  light = true;
  if (bloomPass) {
    composer.removePass(bloomPass);
    bloomPass.dispose();
    bloomPass = null;
  }
  resize();
}

function start() {
  if (running || reduceMotion || contextLost || !started) return;
  running = true;
  last = 0;
  if (!rafId) rafId = window.requestAnimationFrame(frame);
}

function stop() {
  running = false;
  if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
}

function sync() {
  if (visible && onScreen) start(); else stop();
}

function drawStatic() {
  /* Let the field spread out of its seeded disc, then hold that pose. */
  for (let i = 0; i < 90; i++) step(0.02, i * 0.02);
  progress = 0.18;
  updateLabel(progress);
  draw(2.4);
}

/* The canvas can measure zero when this first runs — a background tab, a
 * collapsed ancestor, a print preview. That is not a reason to give up
 * permanently: stay quiet, and light up on the first real size we are given. */
function measure() {
  if (contextLost || !resize()) return;
  if (!started) {
    started = true;
    canvas.classList.add('is-live');
    /* The taller scrolling stage exists only when there is a flight to see. */
    if (!reduceMotion) hero.classList.add('hero--flight');
  }
  if (reduceMotion) drawStatic(); else sync();
}

canvas.addEventListener('webglcontextlost', (ev) => {
  ev.preventDefault();
  contextLost = true;
  stop();
  canvas.classList.remove('is-live');
  hero.classList.remove('hero--flight');
}, false);

let resizeTimer = 0;
function onResize() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    if (!light && wantsLightBuild()) downgrade();
    measure();
  }, 150);
}

window.addEventListener('resize', onResize, { passive: true });
if (window.ResizeObserver) new window.ResizeObserver(onResize).observe(canvas);

if (!reduceMotion) {
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    sync();
  });

  if (window.IntersectionObserver) {
    new window.IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      sync();
    }, { threshold: 0 }).observe(hero);
  }

  /* Pointer parallax is a desktop nicety; touch devices scroll instead. */
  if (!light && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (ev) => {
      targetX = (ev.clientX / window.innerWidth) * 2 - 1;
      targetY = (ev.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    window.setInterval(() => {
      pointerX += (targetX - pointerX) * 0.05;
      pointerY += (targetY - pointerY) * 0.05;
    }, 33);
  }
}

measure();

}

try {
  boot();
} catch (err) {
  /* The hero is decorative. The CSS stage behind the canvas already carries
   * it, the content and every link are plain HTML, and the compact
   * one-screen hero is the default, so there is nothing to undo here. */
}
