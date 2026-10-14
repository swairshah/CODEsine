// print.js: the press. Each frame is drawn by Canvas2D in recipe colours (see ink.js); here it is
// separated back into four ink plates and printed on paper with WebGL2.
//   1. Separation: every pixel is matched to the nearest recipe, giving the coverage of each ink.
//      Where the colour changes sharply (an edge, a line of type) only solid recipes are allowed, so
//      edges are cut clean instead of turning into a fringe of dots.
//   2. Printing: each plate is sampled at its own registration offset, with a little wander so the
//      stencil's edge is rough. Solid areas print flat; screened areas print as round halftone dots at
//      the plate's screen angle. The ink is thinner where the squeegee starved it and carries the mesh.
//      Inks multiply over each other and over the paper, so where two plates overlap you see the
//      overprint, and where they miss you see the paper.
// Paper texture and the halftone screens are fixed to the sheet (the screen); the drawing moves.
'use strict';

(function (global) {
  const VS = `#version 300 es
  in vec2 a;
  void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  const NOISE = `
  float hash(vec2 p) {
    uvec2 q = uvec2(ivec2(floor(p)) + 32768);
    uint h = q.x * 1597334677u ^ q.y * 3812015801u;
    h = (h ^ (h >> 16)) * 2246822519u;
    h ^= h >> 13;
    return float(h & 0xffffffu) / 16777215.0;
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }`;

  // Pass 1: separation.
  const FS_SEP = `#version 300 es
  precision highp float;
  uniform sampler2D uSrc;
  uniform vec3 uRgb[24];
  uniform vec4 uCov[24];
  uniform float uSolid[24];
  uniform int uN;
  out vec4 o;
  vec3 at(ivec2 p) { return texelFetch(uSrc, clamp(p, ivec2(0), textureSize(uSrc, 0) - 1), 0).rgb; }
  int nearest(vec3 c, bool solidOnly) {
    float best = 1e9; int idx = 0;
    for (int i = 0; i < 24; i++) {
      if (i >= uN) break;
      if (solidOnly && uSolid[i] < 0.5) continue;
      vec3 q = c - uRgb[i];
      float d = dot(q * q, vec3(0.32, 0.46, 0.22));
      if (d < best) { best = d; idx = i; }
    }
    return idx;
  }
  void main() {
    ivec2 ip = ivec2(gl_FragCoord.xy);
    vec3 c = at(ip);
    vec3 m1 = abs(c - at(ip + ivec2(1, 0))), m2 = abs(c - at(ip - ivec2(1, 0))), m3 = abs(c - at(ip + ivec2(0, 1))), m4 = abs(c - at(ip - ivec2(0, 1)));
    vec3 mx = max(max(m1, m2), max(m3, m4));
    float e = max(mx.r, max(mx.g, mx.b));
    int idx = nearest(c, false);
    if (e > 0.07) {
      // On an edge the colour is a blend of what lies either side of it: the darkest and the lightest
      // colours close by. Cut it to whichever of those two it is nearer, so an edge never prints in
      // a third ink. Ink spreads a little as it is pulled, so the darker side wins a close call, and
      // fine type and rules hold up instead of breaking.
      vec3 lo = c, hi = c;
      const vec3 Y = vec3(0.3, 0.59, 0.11);
      for (int j = 0; j < 8; j++) {
        ivec2 off = ivec2(j == 0 || j == 4 || j == 5 ? 2 : j == 1 || j == 6 || j == 7 ? -2 : 0, j == 2 || j == 4 || j == 6 ? 2 : j == 3 || j == 5 || j == 7 ? -2 : 0);
        vec3 n = at(ip + off);
        if (dot(n, Y) < dot(lo, Y)) lo = n;
        if (dot(n, Y) > dot(hi, Y)) hi = n;
      }
      // In fine type even the darkest pixel near by is only partly inked; if it matches no recipe,
      // look past it, away from the light side, for the solid ink it was drawn in.
      int a = nearest(lo, false), b = nearest(hi, false);
      vec3 qa0 = lo - uRgb[a], qb0 = hi - uRgb[b];
      if (dot(qa0, qa0) > 0.004 && dot(qb0, qb0) < 0.002) a = nearest(clamp(hi + (lo - hi) * 1.9, 0.0, 1.0), true);
      vec3 qa = c - uRgb[a], qb = c - uRgb[b];
      float da = dot(qa * qa, vec3(0.32, 0.46, 0.22)) * 0.72, db = dot(qb * qb, vec3(0.32, 0.46, 0.22));
      idx = da <= db ? a : b;
    }
    o = uCov[idx];
  }`;

  // Pass 2: printing.
  const FS_PRINT = `#version 300 es
  precision highp float;
  uniform sampler2D uCov;
  uniform vec2 uRes;
  uniform float uDpr;
  uniform vec2 uOff[4];
  uniform vec3 uInk[4];
  uniform vec3 uPaper;
  uniform vec3 uMarks[4];
  uniform int uNMarks;
  uniform float uPitch;
  out vec4 o;
  ${NOISE}
  float cov(vec2 q, int k) {
    vec4 c = texelFetch(uCov, clamp(ivec2(q), ivec2(0), ivec2(uRes) - 1), 0);
    return k == 0 ? c.r : k == 1 ? c.g : k == 2 ? c.b : c.a;
  }
  // a round dot screen: the dot grows with coverage until the dots join
  float screenDot(vec2 p, float ang, float f) {
    float ca = cos(ang), sa = sin(ang);
    vec2 r = mat2(ca, sa, -sa, ca) * p / uPitch;
    vec2 g = fract(r) - 0.5;
    float d = length(g) * uPitch;
    float rad = sqrt(f / 3.14159) * uPitch * 1.04;
    return 1.0 - smoothstep(rad - 0.7 * uDpr, rad + 0.7 * uDpr, d);
  }
  // registration target: a ring with a cross through it
  float mark(vec2 p) {
    float m = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= uNMarks) break;
      vec2 d = p - uMarks[i].xy;
      float s = uMarks[i].z, w = 0.55 * uDpr;
      float ring = 1.0 - smoothstep(w, w + uDpr * 0.7, abs(length(d) - s * 0.55));
      float cross = (abs(d.x) < w && abs(d.y) < s) || (abs(d.y) < w && abs(d.x) < s) ? 1.0 : 0.0;
      float dotc = 1.0 - smoothstep(s * 0.16, s * 0.16 + uDpr, length(d));
      m = max(m, max(ring, max(cross, dotc)));
    }
    return m;
  }
  void main() {
    vec2 p = gl_FragCoord.xy;
    vec2 pc = p / uDpr;
    // paper: a warm stock with mottling, a few long fibres and fine tooth
    float mott = fbm(pc * 0.011);
    vec2 fr = mat2(0.94, 0.34, -0.34, 0.94) * pc;
    float fib = smoothstep(0.78, 0.98, vnoise(fr * vec2(0.55, 0.035))) * 0.5 + smoothstep(0.82, 1.0, vnoise(fr.yx * vec2(0.7, 0.05) + 9.0)) * 0.4;
    float tooth = vnoise(pc * 1.3);
    vec3 col = uPaper * (1.0 - 0.045 * mott - 0.035 * fib - 0.018 * tooth);
    const float ANG[4] = float[4](0.785, 0.262, 1.309, 0.0);
    for (int k = 0; k < 4; k++) {
      float fk = float(k) * 13.7;
      // the stencil's edge wanders a little, and the ink spreads a little past it
      vec2 wob = (vec2(vnoise(pc * 0.21 + fk), vnoise(pc * 0.21 + fk + 31.0)) - 0.5) * 1.3 * uDpr
               + (vec2(vnoise(pc * 1.7 + fk), vnoise(pc * 1.7 + fk + 7.0)) - 0.5) * 0.3 * uDpr;
      vec2 q = p - uOff[k] + wob;
      float f = cov(q, k);
      float m = 0.0;
      if (f > 0.9) m = 1.0;
      else if (f > 0.04) m = screenDot(p - uOff[k], ANG[k], f);
      m = max(m, mark(p - uOff[k]));
      if (m <= 0.0) continue;
      // squeegee streaks where the ink ran thin, the woven mesh, and the odd pinhole
      float streak = fbm(vec2(pc.x * 0.0045 + fk, pc.y * 0.022 + fk));
      float starve = smoothstep(0.6, 0.88, streak) * 0.2;
      float mott = fbm(pc * 0.05 + fk) - 0.5;
      vec2 mp = pc * 1.4;
      float mesh = 0.5 + 0.25 * (sin(mp.x * 3.1416) + sin(mp.y * 3.1416));
      float pin = step(0.9992, hash(floor(pc * 0.55) + fk)) * 0.7;
      float dens = clamp(0.96 - starve - 0.03 * mesh - pin + 0.05 * mott + 0.03 * tooth, 0.0, 1.0);
      col *= 1.0 - m * dens * (1.0 - uInk[k]);
    }
    o = vec4(col, 1.0);
  }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      const name = info.name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  }

  function create(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    let sep, pr;
    try {
      sep = program(gl, FS_SEP);
      pr = program(gl, FS_PRINT);
    } catch (e) {
      console.warn('print.js: falling back to a plain canvas', e);
      return null;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = (filter) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const srcTex = tex(gl.NEAREST), covTex = tex(gl.NEAREST);
    const fbo = gl.createFramebuffer();
    let w = 0, h = 0;

    function frame(src, o) {
      if (src.width !== w || src.height !== h) {
        w = src.width; h = src.height;
        gl.bindTexture(gl.TEXTURE_2D, covTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, covTex, 0);
      }
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      // separation
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, w, h);
      gl.useProgram(sep.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(sep.u.uSrc, 0);
      const R = o.recipes;
      const rgb = new Float32Array(72), cv = new Float32Array(96), sol = new Float32Array(24);
      R.forEach((r, i) => {
        rgb.set(r.rgb.map((v) => v / 255), i * 3);
        cv.set(r.cov, i * 4);
        sol[i] = r.solid ? 1 : 0;
      });
      gl.uniform3fv(sep.u.uRgb, rgb);
      gl.uniform4fv(sep.u.uCov, cv);
      gl.uniform1fv(sep.u.uSolid, sol);
      gl.uniform1i(sep.u.uN, R.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // printing
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.useProgram(pr.p);
      gl.bindTexture(gl.TEXTURE_2D, covTex);
      gl.uniform1i(pr.u.uCov, 0);
      gl.uniform2f(pr.u.uRes, w, h);
      gl.uniform1f(pr.u.uDpr, o.dpr);
      gl.uniform1f(pr.u.uPitch, o.pitch * o.dpr);
      // offsets are given in css px, y down; the print pass works in device px, y up
      gl.uniform2fv(pr.u.uOff, new Float32Array(o.offsets.flatMap(([x, y]) => [x * o.dpr, -y * o.dpr])));
      gl.uniform3fv(pr.u.uInk, new Float32Array(['K', 'R', 'S', 'A'].flatMap((k) => o.inks[k].map((v) => v / 255))));
      gl.uniform3fv(pr.u.uPaper, new Float32Array(o.inks.paper.map((v) => v / 255)));
      const mk = new Float32Array(12);
      o.marks.slice(0, 4).forEach(([x, y, s], i) => mk.set([x * o.dpr, h - y * o.dpr, s * o.dpr], i * 3));
      gl.uniform3fv(pr.u.uMarks, mk);
      gl.uniform1i(pr.u.uNMarks, Math.min(4, o.marks.length));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return { frame, gl };
  }

  global.Print = { create };
})(window);
