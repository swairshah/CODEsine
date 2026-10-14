// paper.js: lays the two sheets (washes and pen) onto a sheet of cold-pressed watercolour paper.
// The washes arrive as flat colour; here they become paint. Each wash is turned into optical density
// (how much light the pigment stops), pigment pools into a darker rim wherever a wash meets something
// else, settles into the hollows of the paper's tooth (granulation) and clumps a little (flocculation).
// The pen sits on top, catching on the paper's ridges. The paper itself is lit from the upper left.
'use strict';

(function (global) {
  const VS = `#version 300 es
in vec2 p;
out vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FS = `#version 300 es
precision highp float;
uniform sampler2D uWash;
uniform sampler2D uInk;
uniform vec2 uRes;
uniform float uDpr;
uniform vec3 uPaper;
uniform float uPool;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { return vec2(hash(p), hash(p + 17.17)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}
// cold-pressed paper: rounded bumps a few pixels across, with finer fibre and a slow cockle
float cells(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash2(i + g) * 0.9 - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}
float paperH(vec2 px) {
  // the felt marks of the mould, irregular rounded bumps, and the fibre over them
  vec2 w = vec2(fbm(px / 23.0), fbm(px / 23.0 + 5.2)) * 9.0;
  float b = 1.0 - smoothstep(0.05, 0.95, cells((px + w) / 7.5));
  float f = fbm((px + w) / 3.2);
  return 0.3 * b + 0.42 * f + 0.18 * vnoise(px / 1.2) + 0.1 * fbm(px / 70.0);
}

void main() {
  vec2 px = gl_FragCoord.xy / uDpr;
  float lb = log2(max(uDpr, 1.0));
  vec3 W = texture(uWash, vUv).rgb;
  // the neighbourhood, from the mip chain: near (the rim) and wider (the wash's body)
  vec3 B1 = textureLod(uWash, vUv, 0.9 + lb).rgb;
  vec3 B2 = textureLod(uWash, vUv, 2.4 + lb).rgb;
  vec3 T = clamp(W / uPaper, 0.004, 1.0);
  vec3 D = -log(T);
  float Dm = (D.r + D.g + D.b) / 3.0;

  // pigment carried to the edge of the wet area and left there as it dried
  float e1 = clamp((abs(B1.r - W.r) + abs(B1.g - W.g) + abs(B1.b - W.b)) * 3.2, 0.0, 1.0);
  float e2 = clamp((abs(B2.r - W.r) + abs(B2.g - W.g) + abs(B2.b - W.b)) * 1.4, 0.0, 1.0);
  float edge = max(e1, 0.45 * e2);
  float pale = 1.0 - smoothstep(0.15, 1.6, Dm);
  D *= 1.0 + uPool * edge * (0.55 + 0.9 * pale);

  // the paper's tooth: pigment settles in the hollows as fine grains, and clumps into soft flecks;
  // it shows most in middling washes and is lost in the darkest
  float h = paperH(px);
  float grain = vnoise(px * 0.85 + 13.0) - 0.5;
  float gran = (0.5 - h) + 0.55 * grain * (0.6 - h);
  float floc = fbm(px / 11.0 + 3.1) - 0.5;
  float turb = fbm(px / 95.0 - 7.0) - 0.5;
  float body = smoothstep(0.015, 0.3, Dm) * (0.3 + 0.7 * pale);
  D *= max(0.0, 1.0 + body * (0.75 * gran + 0.3 * floc) + smoothstep(0.02, 0.3, Dm) * 0.3 * turb);

  vec3 col = uPaper * exp(-D);

  // the light raking across the tooth
  float hx = paperH(px + vec2(0.8, 0.0)) - h;
  float hy = paperH(px + vec2(0.0, 0.8)) - h;
  col *= 1.0 + 0.11 * (-hx + hy);
  col *= 0.985 + 0.03 * h;

  // the pen: dense ink that catches the ridges and skips a little in the hollows
  vec4 K = texture(uInk, vUv);
  float ka = K.a * (1.0 - 0.32 * smoothstep(0.38, 0.05, h) * (1.0 - smoothstep(0.6, 1.0, K.a)));
  col *= mix(vec3(1.0), K.rgb, clamp(ka, 0.0, 1.0));

  // the sheet: a slightly warmer, uneven margin, as if the paper had been stretched and taped
  vec2 q = vUv * 2.0 - 1.0;
  float vig = pow(max(abs(q.x), abs(q.y)), 6.0) * 0.05 + dot(q, q) * 0.02;
  col *= 1.0 - vig * (0.7 + 0.6 * fbm(px / 140.0));

  outColor = vec4(col, 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  // canvas: the visible <canvas>. Returns null when WebGL2 is not available.
  function create(canvas) {
    let gl = null;
    try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn('paper: falling back to plain canvas', e);
      return null;
    }
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = (mip) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const tWash = tex(true), tInk = tex(false);
    const U = {};
    for (const n of ['uWash', 'uInk', 'uRes', 'uDpr', 'uPaper', 'uPool']) U[n] = gl.getUniformLocation(prog, n);
    return {
      draw(washCv, inkCv, o) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(prog);
        gl.bindVertexArray(vao);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tWash);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, washCv);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tInk);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inkCv);
        gl.uniform1i(U.uWash, 0);
        gl.uniform1i(U.uInk, 1);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uDpr, o.dpr);
        gl.uniform3f(U.uPaper, o.paper[0] / 255, o.paper[1] / 255, o.paper[2] / 255);
        gl.uniform1f(U.uPool, o.pool ?? 1.2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  global.Paper = { create };
})(window);
