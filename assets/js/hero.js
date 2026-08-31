/* Hero visual for the landing page.
 *
 * Renders the project's own thesis as motion: four boundaries stacked in depth
 * (browser, web, API, database), with traffic converging inward and every
 * crossing passing through a boundary. Hand-written WebGL — this repository
 * deliberately carries no third-party JavaScript, so there is no bundler, no
 * build step and no vendored dependency to record provenance for.
 *
 * Progressive enhancement, in order of what the visitor gets:
 *   no JS / no WebGL  -> the CSS gradient stage behind this canvas, untouched
 *   reduced motion    -> one static frame, drawn once, no animation loop
 *   low-power device  -> fewer nodes, fewer particles, capped pixel ratio
 *   otherwise         -> the full animation, paused when scrolled out of view
 *
 * The canvas is decorative in every mode: it carries no content and no link.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  var reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Anything that suggests a phone, a tablet or a thin laptop gets the light
   * build. These are hints, not guarantees, so the frame-time watchdog below
   * stays in place regardless of what we decide here. */
  function wantsLightBuild() {
    if (window.innerWidth < 760) return true;
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
    return false;
  }

  var light = wantsLightBuild();

  var gl = null;
  try {
    var opts = { alpha: true, antialias: !light, depth: false, powerPreference: 'low-power' };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  } catch (e) { gl = null; }
  if (!gl) return;

  /* ---------------------------------------------------------------- matrices */

  function mat4() { return new Float32Array(16); }

  function perspective(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
    out[12] = 0; out[13] = 0; out[14] = 2 * far * near * nf; out[15] = 0;
    return out;
  }

  function multiply(out, a, b) {
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      out[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return out;
  }

  function viewMatrix(out, yaw, pitch, dist, offsetX) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cx = Math.cos(pitch), sx = Math.sin(pitch);
    /* translate(0,0,-dist) * rotateX(pitch) * rotateY(yaw), written out. */
    out[0] = cy;       out[1] = sx * sy;  out[2] = -cx * sy; out[3] = 0;
    out[4] = 0;        out[5] = cx;       out[6] = sx;       out[7] = 0;
    out[8] = sy;       out[9] = -sx * cy; out[10] = cx * cy; out[11] = 0;
    out[12] = offsetX; out[13] = 0;       out[14] = -dist;   out[15] = 1;
    return out;
  }

  /* ---------------------------------------------------------------- geometry */

  /* Four boundaries, front to back, narrowing as traffic converges on one
   * store. Colours run along the banner's own gradient. */
  var LAYERS = [
    { z:  1.60, r: 2.05, n: light ? 13 : 22, c: [0.25, 0.81, 0.56] },
    { z:  0.55, r: 1.60, n: light ? 10 : 16, c: [0.22, 0.74, 0.97] },
    { z: -0.50, r: 1.20, n: light ?  8 : 12, c: [0.45, 0.63, 0.99] },
    { z: -1.55, r: 0.78, n: light ?  6 :  9, c: [0.65, 0.55, 0.98] }
  ];

  var GOLDEN = 2.39996323;
  var seedState = 20250831;
  function rand() { /* deterministic, so every reload draws the same structure */
    seedState = (seedState * 1664525 + 1013904223) % 4294967296;
    return seedState / 4294967296;
  }

  var nodes = [];        /* { x, y, z, layer, color } */
  var layerRanges = [];  /* [start, end) into nodes, per layer */

  LAYERS.forEach(function (L, li) {
    var start = nodes.length;
    for (var k = 0; k < L.n; k++) {
      var a = k * GOLDEN + li * 1.7;
      var rr = L.r * Math.sqrt((k + 0.55) / L.n);
      nodes.push({
        x: rr * Math.cos(a) + (rand() - 0.5) * 0.12,
        y: rr * Math.sin(a) * 0.82 + (rand() - 0.5) * 0.12,
        z: L.z + (rand() - 0.5) * 0.16,
        layer: li,
        color: L.c
      });
    }
    layerRanges.push([start, nodes.length]);
  });

  /* Each node reaches into the next boundary through its two nearest peers. */
  var edges = [];                       /* { a, b } indices into nodes */
  var outgoing = nodes.map(function () { return []; });

  for (var li = 0; li < LAYERS.length - 1; li++) {
    var here = layerRanges[li], next = layerRanges[li + 1];
    for (var i = here[0]; i < here[1]; i++) {
      var cand = [];
      for (var j = next[0]; j < next[1]; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        cand.push({ j: j, d: dx * dx + dy * dy });
      }
      cand.sort(function (p, q) { return p.d - q.d; });
      for (var m = 0; m < Math.min(2, cand.length); m++) {
        outgoing[i].push(edges.length);
        edges.push({ a: i, b: cand[m].j });
      }
    }
  }

  /* --------------------------------------------------------------- buffers */

  var POINT_STRIDE = 9;  /* x y z  r g b  size alpha seed */
  var LINE_STRIDE  = 7;  /* x y z  r g b  alpha */

  var lineData = [];
  edges.forEach(function (e) {
    var A = nodes[e.a], B = nodes[e.b];
    lineData.push(A.x, A.y, A.z, A.color[0], A.color[1], A.color[2], 0.30);
    lineData.push(B.x, B.y, B.z, B.color[0], B.color[1], B.color[2], 0.30);
  });

  /* The boundaries themselves, drawn as rings so they read as planes you
   * cross rather than as a loose cloud of points. */
  var RING_SEGMENTS = light ? 40 : 72;
  LAYERS.forEach(function (L) {
    for (var s = 0; s < RING_SEGMENTS; s++) {
      var a0 = (s / RING_SEGMENTS) * Math.PI * 2;
      var a1 = ((s + 1) / RING_SEGMENTS) * Math.PI * 2;
      var rr = L.r * 1.16;
      lineData.push(rr * Math.cos(a0), rr * Math.sin(a0) * 0.82, L.z, L.c[0], L.c[1], L.c[2], 0.16);
      lineData.push(rr * Math.cos(a1), rr * Math.sin(a1) * 0.82, L.z, L.c[0], L.c[1], L.c[2], 0.16);
    }
  });
  var lineArray = new Float32Array(lineData);

  var nodeArray = new Float32Array(nodes.length * POINT_STRIDE);
  nodes.forEach(function (n, i) {
    var o = i * POINT_STRIDE;
    nodeArray[o] = n.x; nodeArray[o + 1] = n.y; nodeArray[o + 2] = n.z;
    nodeArray[o + 3] = n.color[0]; nodeArray[o + 4] = n.color[1]; nodeArray[o + 5] = n.color[2];
    nodeArray[o + 6] = 26.0; nodeArray[o + 7] = 0.85; nodeArray[o + 8] = rand();
  });

  var PARTICLES = light ? 42 : 130;
  var particles = [];
  for (var p = 0; p < PARTICLES; p++) {
    var e0 = Math.floor(rand() * edges.length);
    particles.push({ e: e0, t: rand(), speed: 0.16 + rand() * 0.22 });
  }
  var particleArray = new Float32Array(PARTICLES * POINT_STRIDE);

  /* --------------------------------------------------------------- shaders */

  var POINT_VS =
    'attribute vec3 aPos;' +
    'attribute vec3 aColor;' +
    'attribute float aSize;' +
    'attribute float aAlpha;' +
    'attribute float aSeed;' +
    'uniform mat4 uProj;' +
    'uniform mat4 uView;' +
    'uniform float uScale;' +
    'uniform float uTime;' +
    'varying vec3 vColor;' +
    'varying float vAlpha;' +
    'void main() {' +
    '  vec4 mv = uView * vec4(aPos, 1.0);' +
    '  gl_Position = uProj * mv;' +
    '  float depth = -mv.z;' +
    '  float tw = 0.72 + 0.28 * sin(uTime * 0.9 + aSeed * 6.2831853);' +
    '  gl_PointSize = max(1.0, aSize * uScale * tw / max(0.2, depth));' +
    '  float fog = clamp((depth - 3.0) / 4.2, 0.0, 1.0);' +
    '  vColor = aColor;' +
    '  vAlpha = aAlpha * tw * mix(1.0, 0.22, fog);' +
    '}';

  var POINT_FS =
    'precision mediump float;' +
    'varying vec3 vColor;' +
    'varying float vAlpha;' +
    'void main() {' +
    '  vec2 d = gl_PointCoord - vec2(0.5);' +
    '  float r = dot(d, d);' +
    '  if (r > 0.25) discard;' +
    '  float a = smoothstep(0.25, 0.0, r) * vAlpha;' +
    '  gl_FragColor = vec4(vColor * a, a);' +
    '}';

  var LINE_VS =
    'attribute vec3 aPos;' +
    'attribute vec3 aColor;' +
    'attribute float aAlpha;' +
    'uniform mat4 uProj;' +
    'uniform mat4 uView;' +
    'varying vec3 vColor;' +
    'varying float vAlpha;' +
    'void main() {' +
    '  vec4 mv = uView * vec4(aPos, 1.0);' +
    '  gl_Position = uProj * mv;' +
    '  float fog = clamp((-mv.z - 3.0) / 4.2, 0.0, 1.0);' +
    '  vColor = aColor;' +
    '  vAlpha = aAlpha * mix(1.0, 0.18, fog);' +
    '}';

  var LINE_FS =
    'precision mediump float;' +
    'varying vec3 vColor;' +
    'varying float vAlpha;' +
    'void main() { gl_FragColor = vec4(vColor * vAlpha, vAlpha); }';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }

  function program(vsSrc, fsSrc) {
    var vs = compile(gl.VERTEX_SHADER, vsSrc), fs = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl.deleteProgram(pr); return null; }
    return pr;
  }

  var pointProg = program(POINT_VS, POINT_FS);
  var lineProg = program(LINE_VS, LINE_FS);
  if (!pointProg || !lineProg) return;   /* leave the CSS stage as-is */

  function locs(pr, names) {
    var out = {};
    names.forEach(function (n) {
      out[n] = n.charAt(0) === 'a' ? gl.getAttribLocation(pr, n) : gl.getUniformLocation(pr, n);
    });
    return out;
  }

  var pl = locs(pointProg, ['aPos', 'aColor', 'aSize', 'aAlpha', 'aSeed', 'uProj', 'uView', 'uScale', 'uTime']);
  var ll = locs(lineProg, ['aPos', 'aColor', 'aAlpha', 'uProj', 'uView']);

  var lineBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
  gl.bufferData(gl.ARRAY_BUFFER, lineArray, gl.STATIC_DRAW);

  var nodeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, nodeArray, gl.STATIC_DRAW);

  var particleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
  gl.bufferData(gl.ARRAY_BUFFER, particleArray, gl.DYNAMIC_DRAW);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);   /* additive; shaders emit premultiplied colour */
  gl.clearColor(0, 0, 0, 0);

  /* ----------------------------------------------------------------- state */

  var proj = mat4(), view = mat4();
  var dpr = 1, width = 1, height = 1;
  var pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  var offsetX = 0;

  function maxPixelRatio() { return light ? 1.25 : 1.75; }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio());
    width = Math.round(rect.width * dpr);
    height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    perspective(proj, 0.95, rect.width / rect.height, 0.1, 40);
    /* Wide stages have an empty right half; sit the structure there rather
     * than behind the headline. Narrow ones keep it centred. */
    offsetX = rect.width > 900 ? 1.5 : 0;
    return true;
  }

  function updateParticles(dt) {
    for (var i = 0; i < particles.length; i++) {
      var q = particles[i];
      q.t += dt * q.speed;
      while (q.t >= 1) {
        q.t -= 1;
        var arrived = edges[q.e].b;
        var next = outgoing[arrived];
        if (next.length) {
          q.e = next[Math.floor(rand() * next.length)];
        } else {
          /* Reached the store. Re-enter from the outermost boundary. */
          var first = layerRanges[0];
          var from = first[0] + Math.floor(rand() * (first[1] - first[0]));
          var opts2 = outgoing[from];
          q.e = opts2.length ? opts2[Math.floor(rand() * opts2.length)] : 0;
        }
      }
      writeParticle(i, q);
    }
  }

  function writeParticle(i, q) {
    var e = edges[q.e], A = nodes[e.a], B = nodes[e.b];
    /* Ease toward each boundary so crossings read as arrivals, not a constant
     * drift, and brighten mid-flight. */
    var t = q.t * q.t * (3 - 2 * q.t);
    var o = i * POINT_STRIDE;
    particleArray[o]     = A.x + (B.x - A.x) * t;
    particleArray[o + 1] = A.y + (B.y - A.y) * t;
    particleArray[o + 2] = A.z + (B.z - A.z) * t;
    particleArray[o + 3] = A.color[0] + (B.color[0] - A.color[0]) * t;
    particleArray[o + 4] = A.color[1] + (B.color[1] - A.color[1]) * t;
    particleArray[o + 5] = A.color[2] + (B.color[2] - A.color[2]) * t;
    particleArray[o + 6] = 15.0;
    particleArray[o + 7] = 0.45 + 0.55 * Math.sin(q.t * Math.PI);
    particleArray[o + 8] = 0.0;      /* particles do not twinkle */
  }

  function bindPoints(buffer) {
    var s = POINT_STRIDE * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(pl.aPos);   gl.vertexAttribPointer(pl.aPos, 3, gl.FLOAT, false, s, 0);
    gl.enableVertexAttribArray(pl.aColor); gl.vertexAttribPointer(pl.aColor, 3, gl.FLOAT, false, s, 12);
    gl.enableVertexAttribArray(pl.aSize);  gl.vertexAttribPointer(pl.aSize, 1, gl.FLOAT, false, s, 24);
    gl.enableVertexAttribArray(pl.aAlpha); gl.vertexAttribPointer(pl.aAlpha, 1, gl.FLOAT, false, s, 28);
    gl.enableVertexAttribArray(pl.aSeed);  gl.vertexAttribPointer(pl.aSeed, 1, gl.FLOAT, false, s, 32);
  }

  function draw(time) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    var yaw = 0.42 * Math.sin(time * 0.11) + pointerX * 0.30;
    var pitch = 0.16 + 0.07 * Math.sin(time * 0.083) - pointerY * 0.20;
    viewMatrix(view, yaw, pitch, 5.4, offsetX);

    gl.useProgram(lineProg);
    gl.uniformMatrix4fv(ll.uProj, false, proj);
    gl.uniformMatrix4fv(ll.uView, false, view);
    var ls = LINE_STRIDE * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.enableVertexAttribArray(ll.aPos);   gl.vertexAttribPointer(ll.aPos, 3, gl.FLOAT, false, ls, 0);
    gl.enableVertexAttribArray(ll.aColor); gl.vertexAttribPointer(ll.aColor, 3, gl.FLOAT, false, ls, 12);
    gl.enableVertexAttribArray(ll.aAlpha); gl.vertexAttribPointer(ll.aAlpha, 1, gl.FLOAT, false, ls, 24);
    gl.drawArrays(gl.LINES, 0, lineArray.length / LINE_STRIDE);

    gl.useProgram(pointProg);
    gl.uniformMatrix4fv(pl.uProj, false, proj);
    gl.uniformMatrix4fv(pl.uView, false, view);
    gl.uniform1f(pl.uScale, 2.6 * dpr);
    gl.uniform1f(pl.uTime, time);

    bindPoints(nodeBuf);
    gl.drawArrays(gl.POINTS, 0, nodes.length);

    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, particleArray);
    bindPoints(particleBuf);
    gl.drawArrays(gl.POINTS, 0, particles.length);
  }

  /* ------------------------------------------------------------- lifecycle */

  var running = false, rafId = 0, last = 0, clock = 0;
  var visible = true, onScreen = true, contextLost = false, started = false;
  var slowFrames = 0, sampled = 0;
  var STATIC_TIME = 2.4;   /* the pose the reduced-motion frame is held at */

  function drawStatic() {
    for (var i = 0; i < particles.length; i++) writeParticle(i, particles[i]);
    draw(STATIC_TIME);
  }

  function frame(now) {
    rafId = 0;
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    clock += dt;

    updateParticles(dt);
    draw(clock);

    /* If the device cannot keep up, drop to the light build once rather than
     * grinding. Sampled over the first few seconds only. */
    if (!light && sampled < 90) {
      sampled++;
      if (dt > 0.034) slowFrames++;
      if (sampled === 90 && slowFrames > 45) downgrade();
    }

    rafId = window.requestAnimationFrame(frame);
  }

  function downgrade() {
    light = true;
    particles.length = Math.min(particles.length, 40);
    particleArray = particleArray.subarray(0, particles.length * POINT_STRIDE);
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

  /* The canvas can measure zero when this first runs — a background tab, a
   * collapsed ancestor, a print preview. That is not a reason to give up
   * permanently: stay quiet, and light up on the first real size we are given. */
  function measure() {
    if (contextLost || !resize()) return;
    if (!started) {
      started = true;
      canvas.classList.add('is-live');
    }
    if (reduceMotion) drawStatic(); else sync();
  }

  canvas.addEventListener('webglcontextlost', function (ev) {
    ev.preventDefault();
    contextLost = true;
    stop();
    canvas.classList.remove('is-live');
  }, false);

  var resizeTimer = 0;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      /* A rotation or a window drag can move us across the light-build
       * threshold. We only ever step down, never back up. */
      if (!light && wantsLightBuild()) downgrade();
      measure();
    }, 150);
  }

  window.addEventListener('resize', onResize, { passive: true });
  if (window.ResizeObserver) new window.ResizeObserver(onResize).observe(canvas);

  if (!reduceMotion) {
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      sync();
    });

    if (window.IntersectionObserver) {
      new window.IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        sync();
      }, { threshold: 0 }).observe(canvas);
    }

    /* Pointer parallax is a desktop nicety; touch devices scroll instead. */
    if (!light && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', function (ev) {
        targetX = (ev.clientX / window.innerWidth) * 2 - 1;
        targetY = (ev.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
      window.setInterval(function () {
        pointerX += (targetX - pointerX) * 0.06;
        pointerY += (targetY - pointerY) * 0.06;
      }, 33);
    }
  }

  measure();
})();
