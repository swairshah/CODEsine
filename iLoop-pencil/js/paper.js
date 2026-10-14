// paper.js: the sheet the machines are drawn on.
// Every frame is drawn twice, in lockstep, into two hidden canvases:
//   C, the colour of the crayon at each pixel;
//   P, how the marks were made there: red is the crayon's pressure, green is graphite.
// A WebGL pass then lays it on paper. The paper's tooth is a height field fixed to the screen (the
// sheet does not move; the drawing does). Wax catches only where the pressure is higher than the
// paper there, so light strokes leave the valleys bare and hard ones fill them; graphite catches more
// evenly, darkens, and shines a little where it is heavy, and dense graphite leaves a soft smudge.
'use strict';

(function (global) {
  const { parseColour, prStyle, grStyle } = Ink;

  // A 2D context that draws into both canvases. Colours go to C as they are; P gets the pressure the
  // engine set (pen.pressure), or none for colours that are the paper itself. Dark strokes and dark
  // lettering are taken to be pencil and go to P's graphite channel.
  function dual(c, p) {
    const pen = { pressure: 0.86, paper: [239, 231, 214] };
    let fillDark = false, strokeDark = false;
    const near = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 24;
    const isDark = (rgb) => rgb[0] + rgb[1] + rgb[2] < 200 && Math.max(rgb[0], rgb[1], rgb[2]) - Math.min(rgb[0], rgb[1], rgb[2]) < 40;
    function pStyle(v) {
      if (typeof v !== 'string') return prStyle(pen.pressure);
      const rgb = parseColour(v);
      const pr = near(rgb, pen.paper) ? 0 : pen.pressure;
      const a = rgb[3] ?? 1;
      return a < 1 ? `rgba(${Math.round(pr * 255)},0,0,${a})` : prStyle(pr);
    }
    function asGraphite(fn, args, style) {
      p.save();
      p.globalCompositeOperation = 'lighter';
      p[style] = grStyle(0.72);
      p[fn](...args);
      p.restore();
    }
    const wrap = {};
    const special = {
      stroke: (...a) => { if (strokeDark) asGraphite('stroke', a, 'strokeStyle'); else p.stroke(...a); return c.stroke(...a); },
      fillText: (...a) => { if (fillDark) asGraphite('fillText', a, 'fillStyle'); else p.fillText(...a); return c.fillText(...a); },
      strokeText: (...a) => { if (strokeDark) asGraphite('strokeText', a, 'strokeStyle'); else p.strokeText(...a); return c.strokeText(...a); },
    };
    return new Proxy({}, {
      get(_, k) {
        if (k === 'C') return c;
        if (k === 'P') return p;
        if (k === 'pen') return pen;
        if (special[k]) return special[k];
        const v = c[k];
        if (typeof v === 'function') return wrap[k] || (wrap[k] = (...a) => { p[k](...a); return v.apply(c, a); });
        return v;
      },
      set(_, k, v) {
        c[k] = v;
        if (k === 'fillStyle' || k === 'strokeStyle') {
          p[k] = pStyle(v);
          const dark = typeof v === 'string' && isDark(parseColour(v));
          if (k === 'fillStyle') fillDark = dark;
          else strokeDark = dark;
        } else p[k] = v;
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
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

  // The sheet itself, made once for each size of window: rgb is the paper, a is its tooth. High tooth
  // values are valleys that a light stroke skips. A fine grain, a coarser one and fibres lying mostly
  // one way, the laid and chain lines of the mould, foxing, and the edges darkened with age.
  const SHEET = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform vec3 uPaper;
in vec2 uv;
out vec4 o;
${NOISE}
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  float h = 0.48 * vnoise(q * 0.72) + 0.3 * vnoise(q * vec2(0.34, 0.5) + 7.3) + 0.22 * vnoise(q * 1.7 + 3.1);
  h += 0.07 * (0.5 + 0.5 * sin(q.y * 0.97 + 0.35 * vnoise(q * 0.05)));
  h += 0.06 * exp(-pow(mod(q.x + 13.0 * vnoise(vec2(q.y * 0.01, 4.0)), 118.0) - 59.0, 2.0) / 6.0);
  h = smoothstep(0.24, 0.8, h);
  float stain = fbm(q * 0.0035 + 2.0);
  vec2 e = abs(uv - 0.5) * 2.0;
  float edge = smoothstep(0.55, 1.25, max(e.x, e.y) + 0.25 * stain);
  vec3 paper = uPaper * (1.0 - 0.055 * h);
  paper = mix(paper, paper * vec3(0.96, 0.93, 0.86), 0.3 * smoothstep(0.62, 0.85, stain) + 0.45 * edge);
  paper *= 1.0 - 0.025 * smoothstep(0.3, 0.9, fbm(q * 0.02 + 9.0));
  // ghosts of earlier drawings, rubbed out: faint grey haze caught in the valleys
  float ghost = smoothstep(0.66, 0.86, fbm(q * vec2(0.006, 0.009) + 31.0)) * smoothstep(0.35, 0.8, vnoise(q * vec2(0.08, 0.5)));
  paper *= 1.0 - 0.05 * ghost * (0.4 + h);
  o = vec4(paper, h);
}`;

  // Each frame: the drawing laid on the sheet.
  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uC, uP, uS;
uniform vec2 uRes;
uniform float uDpr;
in vec2 uv;
out vec4 o;
${NOISE}
void main() {
  vec2 q = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec4 S = texture(uS, uv);
  vec3 paper = S.rgb;
  float h = S.a;
  vec4 P = texture(uP, uv);
  vec3 C = texture(uC, uv).rgb;
  float pr = P.r, g = P.g;

  // the grain a pencil drags along its stroke: long thin streaks in the stroke's direction
  float ang = P.b * 3.14159265 * (256.0 / 255.0);
  vec2 dir = vec2(cos(ang), sin(ang));
  vec2 sq = vec2(dot(q, dir), dot(q, vec2(-dir.y, dir.x)));
  float streak = 0.6 * vnoise(vec2(sq.x * 0.11, sq.y * 1.05)) + 0.4 * vnoise(vec2(sq.x * 0.035, sq.y * 0.5) + 5.0);
  float hw = clamp(mix(h, smoothstep(0.2, 0.8, streak), 0.5) + 0.1 * (h - 0.5), 0.0, 1.0);

  // wax: catches where the pressure beats the tooth, with a little pigment dust in the valleys
  float cc = smoothstep(hw - 0.16, hw + 0.16, pr * 1.22 - 0.06);
  cc = max(cc, pr * 0.2 * (1.0 - hw));
  vec3 wax = pow(C, vec3(1.06)) * (0.95 + 0.1 * (1.0 - hw)) + 0.03 * (hash(floor(q * 1.1)) - 0.5);
  vec3 col = mix(paper, wax, cc);

  // graphite: catches more evenly than wax and slides a little over it; heavy graphite shines
  float gc = smoothstep(h - 0.2, h + 0.2, g * 1.22 - 0.04) * smoothstep(0.0, 0.08, g);
  gc *= 1.0 - 0.3 * cc * (1.0 - g);
  vec3 lead = mix(vec3(0.5, 0.5, 0.53), vec3(0.17, 0.175, 0.19), smoothstep(0.1, 0.85, g));
  lead = mix(lead, vec3(0.34, 0.35, 0.39), 0.55 * smoothstep(0.75, 1.0, g) * (1.0 - h));
  col = mix(col, col * lead * 1.12, gc);

  // the smudge that dense graphite leaves on the paper round it
  float gb = textureLod(uP, uv, 4.0).g + 0.6 * textureLod(uP, uv, 6.0).g;
  col *= 1.0 - 0.16 * smoothstep(0.04, 0.45, gb) * (1.0 - gc);

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
      for (const n of ['uC', 'uP', 'uS', 'uRes', 'uDpr', 'uPaper']) u[n] = gl.getUniformLocation(prog, n);
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
    const tC = tex(0, false), tP = tex(1, true), tS = tex(2, false);
    const fb = gl.createFramebuffer();
    let sheetKey = '';
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return {
      draw(dpr, paper) {
        const w = stage.width, h = stage.height;
        gl.viewport(0, 0, w, h);
        // the sheet, again only when the window or the paper changes
        const key = `${w}x${h}@${dpr}:${paper.join()}`;
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
          gl.uniform3f(sheetP.u.uPaper, paper[0] / 255, paper[1] / 255, paper[2] / 255);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.useProgram(main.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tC);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, C);
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
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  }

  global.Paper = { dual, compositor };
})(window);
