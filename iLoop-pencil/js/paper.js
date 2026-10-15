// paper.js: the sheet of grey marker paper the machines are drawn on.
// Every frame is drawn twice, in lockstep, into two hidden canvases:
//   C, the colour at each pixel, as the marker, pencil and paint left it;
//   P, how the marks were made there: red is marker density, green is pencil (black or white), and
//      blue is the direction of the marker strokes.
// A WebGL pass then lays it on the paper. The paper's tooth is fixed to the screen (the sheet does not
// move; the drawing does). Marker streaks along its strokes and pools at its wet edges; pencil catches
// on the tooth and skips the valleys, where the colour around it shows through.
'use strict';

(function (global) {
  // A 2D context that draws into both canvases. Whatever app.js draws itself (the easter eggs, the
  // screens' animations) is plain paint: it goes to C as it is and clears P under it.
  function dual(c, p) {
    const pen = {};
    const wrap = {};
    return new Proxy({}, {
      get(_, k) {
        if (k === 'C') return c;
        if (k === 'P') return p;
        if (k === 'pen') return pen;
        const v = c[k];
        if (typeof v === 'function') return wrap[k] || (wrap[k] = (...a) => { p[k](...a); return v.apply(c, a); });
        return v;
      },
      set(_, k, v) {
        c[k] = v;
        if (k === 'fillStyle' || k === 'strokeStyle') p[k] = '#000';
        else p[k] = v;
        return true;
      },
      has(_, k) { return k in c; },
    });
  }

  const VERT = `#version 300 es
in vec2 a;
out vec2 uv;
void main() { uv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

  const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

  // The sheet, made once for each size of window: r is how light the paper is here (0.5 is the
  // paper's own colour), a is its tooth. Marker paper is smooth, with a fine, even grain, a faint
  // cloud in the sizing, and a little light falling off toward the edges.
  const SHEET = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
in vec2 uv;
out vec4 o;
${NOISE}
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float h = 0.55 * vnoise(q * 0.9) + 0.3 * vnoise(q * 2.1 + 3.1) + 0.15 * hash(floor(q * 1.3));
  h = smoothstep(0.15, 0.85, h);
  float cloud = fbm(q * 0.004 + 2.0);
  vec2 e = abs(uv - 0.5) * 2.0;
  float edge = smoothstep(0.5, 1.4, length(e));
  float lit = 1.0 + 0.035 * (h - 0.5) + 0.03 * (cloud - 0.5) - 0.05 * edge;
  o = vec4(lit * 0.5, 0.0, 0.0, h);
}`;

  // Each frame: the drawing laid on the sheet.
  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uC, uP, uS;
uniform vec2 uRes;
uniform float uDpr, uLod;
uniform vec3 uPaper;
in vec2 uv;
out vec4 o;
${NOISE}
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec4 S = texture(uS, uv);
  float lit = S.r * 2.0, h = S.a;
  vec4 P = texture(uP, uv);
  vec3 col = texture(uC, uv).rgb;
  float m = P.r, g = P.g;

  // marker: alcohol ink soaks in along the stroke, so its density varies in long, soft streaks that
  // follow the direction of the strokes, and a little in the paper's grain
  float ang = P.b * 3.14159265 * (256.0 / 255.0);
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 sq = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
  float streak = 0.55 * vnoise(vec2(sq.x * 0.012, sq.y * 0.55)) + 0.3 * vnoise(vec2(sq.x * 0.04, sq.y * 1.6) + 5.0) + 0.15 * vnoise(vec2(sq.x * 0.2, sq.y * 3.0) + 9.0);
  float mk = smoothstep(0.02, 0.25, m);
  vec3 dark = uPaper - col;
  col = uPaper - dark * (1.0 + mk * (0.34 * (streak - 0.5) + 0.06 * (h - 0.5)));
  // and the ink pools where a stroke stopped and dried: a darker rim inside the edge of each patch
  float mb = textureLod(uP, uv, uLod + 1.6).r;
  float wet = clamp((m - mb) * 2.2, 0.0, 1.0) * mk;
  col *= 1.0 - 0.2 * wet;

  // pencil: catches on the tooth and skips the valleys, where the colour round the line shows through
  float catchT = smoothstep(h - 0.3, h + 0.3, g * 1.15 + 0.05);
  vec3 nb = textureLod(uC, uv, uLod).rgb;
  col = mix(col, nb, smoothstep(0.0, 0.12, g) * (1.0 - catchT) * 0.85);

  // the paper's grain and light, over everything, a little less where marker has filled the tooth
  col *= mix(lit, 1.0, 0.5 * mk);
  o = vec4(col, 1.0);
}`;

  // The compositor: draws C and P onto the visible canvas through the paper shader. Without WebGL2
  // the colour canvas is shown as it is.
  function compositor(stage, C, P) {
    const gl = stage.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = (frag) => {
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
      gl.bindAttribLocation(prog, 0, 'a');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      const u = {};
      for (const n of ['uC', 'uP', 'uS', 'uRes', 'uDpr', 'uPaper', 'uLod']) u[n] = gl.getUniformLocation(prog, n);
      return { prog, u };
    };
    const main = program(FRAG), sheetP = program(SHEET);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = (unit, mip) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const tC = tex(0, true), tP = tex(1, true), tS = tex(2, false);
    const fb = gl.createFramebuffer();
    let sheetKey = '';
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return {
      draw(dpr, paper) {
        const w = stage.width, h = stage.height;
        gl.viewport(0, 0, w, h);
        // the sheet, again only when the window changes
        const key = `${w}x${h}@${dpr}`;
        if (key !== sheetKey) {
          sheetKey = key;
          gl.activeTexture(gl.TEXTURE2);
          gl.bindTexture(gl.TEXTURE_2D, tS);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tS, 0);
          gl.useProgram(sheetP.prog);
          gl.uniform2f(sheetP.u.uRes, w, h);
          gl.uniform1f(sheetP.u.uDpr, dpr);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.useProgram(main.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tC);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, C);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tP);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, P);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, tS);
        gl.uniform1i(main.u.uC, 0);
        gl.uniform1i(main.u.uP, 1);
        gl.uniform1i(main.u.uS, 2);
        gl.uniform2f(main.u.uRes, w, h);
        gl.uniform1f(main.u.uDpr, dpr);
        // the mip level that spans a pencil line's width and its surroundings, at this pixel density
        gl.uniform1f(main.u.uLod, 1.3 + Math.log2(dpr));
        gl.uniform3f(main.u.uPaper, paper[0] / 255, paper[1] / 255, paper[2] / 255);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  }

  global.Paper = { dual, compositor };
})(window);
