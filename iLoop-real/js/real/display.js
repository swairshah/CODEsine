// display.js: screens. A Display is a pane of glass on a machine with a picture on it.
//
// The picture is drawn by the machine into a 2D canvas at the screen's own resolution (512 × 342
// for the Macintosh, 320 × 480 for the iPhone...). Where the canvas is left transparent, the next
// machine shows through: that is the portal. Each frame the engine composites the canvas and the
// portal into an HDR texture, through a shader that knows the display's technology: a CRT's
// scan lines and phosphor, a passive-matrix LCD's pixel gaps and low contrast, an LCD's RGB stripes.
// Only the part of the screen in view is composited, at the resolution it is seen at, so the pixel
// structure holds up however close the camera comes. The result lights the glass as emission, and
// the glass reflects the studio like real glass.
//
// Shared by every machine. Machine files must not edit this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = global.Real;
  const { G } = Real;
  const { clamp } = Real.U;

  const TECH = {
    // tech: [id, default brightness, glass roughness, glass colour (off)]
    'crt-white': [0, 1.15, 0.07, '#2b2f2e'],
    'crt-green': [1, 1.3, 0.07, '#252b27'],
    'crt-amber': [2, 1.3, 0.07, '#2c2924'],
    'crt-color': [3, 1.1, 0.07, '#24282a'],
    'lcd-stn': [4, 1.15, 0.42, '#7d8378'],
    'lcd-gray': [5, 1.2, 0.3, '#8a8f84'],
    lcd: [6, 1.05, 0.035, '#060607'],
    retina: [7, 0.95, 0.03, '#050506'],
    oled: [8, 1.1, 0.03, '#030303'],
    silicon: [9, 1.0, 0.18, '#2a2622'],
  };
  const LOOK = { none: 0, mono: 1, gray: 2, silhouette: 3, etch: 4 };

  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform vec4 uWin, uImg;
    uniform sampler2D uUI;
    uniform vec2 uPanel, uImgMM;
    uniform float uPixelArt, uCellPx, uCellSeen, uOpen, uCorner, uBright, uPower, uStruct, uTime;
    uniform int uTech;
    uniform sampler2D uPortal;
    uniform float uHasPortal, uLookAmt, uLookLevels;
    uniform int uLook;
    uniform vec4 uFrame;
    uniform vec3 uLookFg, uLookBg;
    uniform vec2 uLookRange;
    uniform vec2 uPortalPx;

    vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
    float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
    float bayer8(vec2 p) {
      ivec2 q = ivec2(mod(p, 8.0));
      int m[64] = int[64](0,32,8,40,2,34,10,42, 48,16,56,24,50,18,58,26, 12,44,4,36,14,46,6,38, 60,28,52,20,62,30,54,22,
                          3,35,11,43,1,33,9,41, 51,19,59,27,49,17,57,25, 15,47,7,39,13,45,5,37, 63,31,55,23,61,29,53,21);
      return (float(m[q.y * 8 + q.x]) + 0.5) / 64.0;
    }
    // the next machine as this screen would draw it
    vec3 portalAt(vec2 tu, vec2 cellUV, vec2 cell, vec2 dTu) {
      // beyond the frame (a portal wider or taller than the page) the studio backdrop carries on:
      // the frame's edge is sweep, so its edge pixels are stretched outward
      vec2 fuv = clamp((tu - uFrame.xy) / (uFrame.zw - uFrame.xy), 0.0, 1.0);
      vec2 fcu = clamp((cellUV - uFrame.xy) / (uFrame.zw - uFrame.xy), 0.0, 1.0);
      vec3 full = toLin(texture(uPortal, vec2(fuv.x, 1.0 - fuv.y)).rgb);
      if (uLookAmt <= 0.001) return full;
      // sampled once per panel pixel, filtered to the pixel's footprint
      float texPerCell = uPortalPx.x / max(1.0, uPanel.x * (uFrame.z - uFrame.x));
      vec3 nat = toLin(textureLod(uPortal, vec2(fcu.x, 1.0 - fcu.y), max(0.0, log2(max(1.0, texPerCell)))).rgb);
      vec3 l = nat;
      // levels: the studio backdrop goes to paper white, the machine's darks to ink
      float y = clamp((pow(luma(nat), 1.0 / 2.2) - uLookRange.x) / (uLookRange.y - uLookRange.x), 0.0, 1.0);
      // where the panel's pixels are smaller than ours, a dither is seen as its average tone (as a lens
      // would); point-sampling it there would alias into stripes
      float dk = smoothstep(0.55, 0.95, uCellSeen);
      if (uLook == 1) {
        l = mix(mix(uLookBg, uLookFg, y), y > bayer8(cell) ? uLookFg : uLookBg, dk);
      } else if (uLook == 2) {
        float n = uLookLevels - 1.0;
        float q = floor(y * n + bayer8(cell)) / n;
        l = mix(mix(uLookBg, uLookFg, y), mix(uLookBg, uLookFg, clamp(q, 0.0, 1.0)), dk);
      } else if (uLook == 3) {
        l = y < 0.55 ? uLookFg : uLookBg;
      } else if (uLook == 4) {
        // etched: the edges of the picture, bright, on dark silicon
        vec2 e = vec2(1.5) / uPortalPx;
        float a = luma(texture(uPortal, vec2(fuv.x + e.x, 1.0 - fuv.y)).rgb) - luma(texture(uPortal, vec2(fuv.x - e.x, 1.0 - fuv.y)).rgb);
        float b = luma(texture(uPortal, vec2(fuv.x, 1.0 - fuv.y + e.y)).rgb) - luma(texture(uPortal, vec2(fuv.x, 1.0 - fuv.y - e.y)).rgb);
        float edge = clamp(length(vec2(a, b)) * 5.0, 0.0, 1.0);
        float body = smoothstep(0.62, 0.2, y) * 0.35;
        l = mix(uLookBg, uLookFg, clamp(edge + body, 0.0, 1.0));
      }
      return mix(full, l, uLookAmt);
    }
    void main() {
      vec2 gu = mix(uWin.xy, uWin.zw, vUv);
      vec2 iu = (gu - uImg.xy) / (uImg.zw - uImg.xy);
      vec2 tu = vec2(iu.x, 1.0 - iu.y);
      // outside the picture: nothing; corners rounded as the tube's mask rounds them
      vec2 mm = tu * uImgMM;
      vec2 q = abs(mm - uImgMM * 0.5) - (uImgMM * 0.5 - uCorner);
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCorner;
      float aaw = max(fwidth(sd), 1e-4);
      float inside = 1.0 - smoothstep(-aaw, aaw, sd);
      if (inside <= 0.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

      vec2 pp = tu * uPanel;
      vec2 cell = floor(pp), f = fract(pp);

      vec2 cellUV = (cell + 0.5) / uPanel;
      vec2 dx = dFdx(tu), dy = dFdy(tu);
      // the canvas texture is stored bottom row first
      vec4 ui = uPixelArt > 0.5 ? textureGrad(uUI, vec2(cellUV.x, 1.0 - cellUV.y), dx, dy) : texture(uUI, vec2(tu.x, 1.0 - tu.y));
      vec3 c = ui.rgb;
      float hole = 1.0 - ui.a;
      // as the camera arrives, the portal opens out over the whole frame and a little past it
      // (feathered outward; past the frame the backdrop carries on), so the screen's own furniture
      // round the picture is gone before the hand-off
      if (uOpen > 0.0 && uHasPortal > 0.5) {
        vec2 fr = (tu - uFrame.xy) / (uFrame.zw - uFrame.xy);
        vec2 fe = smoothstep(vec2(-0.12), vec2(-0.02), fr) * smoothstep(vec2(-0.12), vec2(-0.02), 1.0 - fr);
        hole = max(hole, uOpen * fe.x * fe.y);
      }
      if (hole > 0.001) {
        vec3 p = uHasPortal > 0.5 ? portalAt(tu, cellUV, cell, dx) : uLookBg;
        c = mix(c, p, hole);
      }

      // the display's own structure, faded out where its pixels are smaller than ours
      float aa = smoothstep(1.6, 3.5, uCellPx) * uStruct;
      float aaSub = smoothstep(4.0, 8.0, uCellPx) * uStruct;
      vec3 o = c;
      if (uTech <= 3) {
        // CRT: phosphor colour, a beam that spreads with brightness, a little horizontal blur
        vec3 ph = uTech == 0 ? vec3(0.86, 0.93, 1.0) : uTech == 1 ? vec3(0.28, 1.0, 0.42) : uTech == 2 ? vec3(1.0, 0.62, 0.16) : vec3(1.0);
        if (uTech < 3) c = ph * luma(c);
        float L = clamp(luma(c), 0.0, 1.0);
        float sg = mix(0.2, 0.34, sqrt(L));
        float prof = exp(-pow(f.y - 0.5, 2.0) / (2.0 * sg * sg)) / (sg * 2.5066);
        vec3 lin = c * mix(1.0, prof, aa);
        if (uTech == 3) {
          // aperture grille: vertical phosphor stripes at about one triad per pixel
          float ph3 = fract(pp.x * 1.08);
          vec3 m = ph3 < 0.333 ? vec3(1.0, 0.18, 0.18) : ph3 < 0.666 ? vec3(0.18, 1.0, 0.18) : vec3(0.18, 0.18, 1.0);
          lin *= mix(vec3(1.0), m * 2.2, aaSub);
        }
        o = lin;
      } else if (uTech == 4 || uTech == 5) {
        // passive matrix: dark pixels on a pale, slightly green panel; the gaps stay pale
        vec3 off = uTech == 4 ? vec3(0.50, 0.55, 0.47) : vec3(0.55, 0.6, 0.53);
        vec3 on = uTech == 4 ? vec3(0.035, 0.045, 0.085) : vec3(0.05, 0.06, 0.055);
        float y = luma(c);
        vec3 px = mix(on, off, clamp(y * 1.05, 0.0, 1.0));
        vec2 g = smoothstep(vec2(0.0), vec2(0.09), f) * smoothstep(vec2(0.0), vec2(0.09), 1.0 - f);
        o = mix(px, mix(off, px, g.x * g.y), aa);
      } else if (uTech >= 6 && uTech <= 8) {
        // an LCD's RGB stripe (or an OLED's emitters) with the black matrix between them
        float sub = f.x * 3.0;
        float si = floor(sub), sf = fract(sub);
        vec3 ch = si < 1.0 ? vec3(1.0, 0.0, 0.0) : si < 2.0 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
        float gx = uTech == 8 ? 0.22 : 0.12, gy = uTech == 8 ? 0.2 : 0.07;
        float open = smoothstep(0.0, gx, sf) * smoothstep(0.0, gx, 1.0 - sf) * smoothstep(0.0, gy, f.y) * smoothstep(0.0, gy, 1.0 - f.y);
        float fill = (1.0 - gx) * (1.0 - 2.0 * gy);
        vec3 sp = c * ch * 3.0 * open / max(fill, 0.3);
        o = mix(c, sp, aaSub);
      } else if (uTech == 9) {
        o = c;
      }
      gl_FragColor = vec4(o * uBright * uPower * inside, 1.0);
    }`;

  let quad = null;
  class Display {
    // o: see the README's machine contract. Sizes are millimetres; ui is the canvas's own units.
    constructor(o) {
      this.o = o;
      const [id, bright, rough, glassCol] = TECH[o.tech || 'lcd'];
      this.tech = o.tech || 'lcd';
      this.techId = id;
      this.w = o.w;
      this.h = o.h;
      this.gw = (o.glass && o.glass[0]) || o.w;
      this.gh = (o.glass && o.glass[1]) || o.h;
      this.off = o.offset || [0, 0];
      this.ui = o.ui;
      this.scale = o.scale || 1;
      this.panel = o.panel || [o.ui[0] * this.scale, o.ui[1] * this.scale];
      this.pixelArt = o.pixelArt ?? (this.panel[0] <= o.ui[0] * this.scale + 0.5);
      this.bright = o.bright ?? bright;
      this.portal = o.portal || null;
      this.state = { power: 1, struct: 1, glass: 1, look: o.look || null, lookAmt: 0, portalTex: null, frame: null, egg: null };
      // the canvas the machine draws on
      this.canvas = document.createElement('canvas');
      this.canvas.width = Math.round(o.ui[0] * this.scale);
      this.canvas.height = Math.round(o.ui[1] * this.scale);
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: !!o.pixelOps });
      this.tex = new T.CanvasTexture(this.canvas);
      this.tex.colorSpace = T.SRGBColorSpace;
      this.tex.magFilter = this.pixelArt ? T.NearestFilter : T.LinearFilter;
      this.tex.minFilter = T.LinearMipmapLinearFilter;
      this.tex.generateMipmaps = true;
      this.tex.anisotropy = 4;
      this.dirty = true;
      this.lastDraw = -1;
      // the composite, in HDR
      this.rt = new T.WebGLRenderTarget(64, 64, { type: T.HalfFloatType, depthBuffer: false });
      this.rt.texture.generateMipmaps = false;
      this.rt.texture.minFilter = T.LinearFilter;
      this.rt.texture.magFilter = T.LinearFilter;
      this.rt.texture.wrapS = this.rt.texture.wrapT = T.ClampToEdgeWrapping;
      this.uniforms = {
        uWin: { value: new T.Vector4(0, 0, 1, 1) },
        uImg: { value: new T.Vector4() },
        uUI: { value: this.tex },
        uPanel: { value: new T.Vector2(...this.panel) },
        uImgMM: { value: new T.Vector2(o.w, o.h) },
        uPixelArt: { value: this.pixelArt ? 1 : 0 },
        uCellPx: { value: 1 },
        // device pixels per panel pixel as seen, the smaller of across and down
        uCellSeen: { value: 1 },
        uOpen: { value: 0 },
        uCorner: { value: o.corner ?? 0 },
        uBright: { value: this.bright },
        uPower: { value: 1 },
        uStruct: { value: 1 },
        uTime: { value: 0 },
        uTech: { value: id },
        uPortal: { value: null },
        uHasPortal: { value: 0 },
        uLookAmt: { value: 0 },
        uLookLevels: { value: 4 },
        uLook: { value: 0 },
        uFrame: { value: new T.Vector4(0, 0, 1, 1) },
        uLookFg: { value: new T.Vector3(1, 1, 1) },
        uLookBg: { value: new T.Vector3(0, 0, 0) },
        uPortalPx: { value: new T.Vector2(1, 1) },
        uLookRange: { value: new T.Vector2(0, 1) },
      };
      this.compMat = new T.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
      // the image rectangle inside the glass, in the glass's uv (0…1, bottom to top)
      const x0 = (this.gw / 2 + this.off[0] - o.w / 2) / this.gw, y0 = (this.gh / 2 + this.off[1] - o.h / 2) / this.gh;
      this.img = [x0, y0, x0 + o.w / this.gw, y0 + o.h / this.gh];
      this.uniforms.uImg.value.set(...this.img);
      // the glass
      this.material = new T.MeshPhysicalMaterial({
        color: new T.Color(o.glassColor || glassCol),
        roughness: o.rough ?? rough,
        metalness: 0,
        ior: 1.52,
        clearcoat: id === 4 || id === 5 ? 0 : id >= 6 ? 1 : 0.6,
        clearcoatRoughness: id >= 6 ? 0.02 : o.rough ?? rough,
        emissive: new T.Color(1, 1, 1),
        emissiveMap: this.rt.texture,
        emissiveIntensity: 1,
      });
      this.baseRough = this.material.roughness;
      this.geometry = G.bulgePlane(this.gw, this.gh, o.bulge || 0, o.bulge ? 48 : 1, o.bulge ? 36 : 1);
      this.mesh = new T.Mesh(this.geometry, this.material);
      this.mesh.receiveShadow = true;
      this.mesh.castShadow = false;
      this.mesh.userData.display = this;
      this.bulge = o.bulge || 0;
      this._v = new T.Vector3();
      this._ray = new T.Raycaster();
    }

    // ---- for machines ----
    redraw() { this.dirty = true; }
    // ui units → the glass's local millimetres (x right, y up, on the flat plane)
    uiToLocal(x, y) {
      return new T.Vector3(this.off[0] - this.w / 2 + (x / this.ui[0]) * this.w, this.off[1] + this.h / 2 - (y / this.ui[1]) * this.h, 0);
    }
    uiToWorld(x, y) { return this.uiToLocal(x, y).applyMatrix4(this.mesh.matrixWorld); }

    // ---- for the engine ----
    paint(time, extra) {
      const o = this.o;
      const fps = o.animate || 0;
      const due = fps > 0 && time - this.lastDraw >= 1 / fps;
      if (!this.dirty && !due && !extra) return false;
      this.lastDraw = time;
      this.dirty = false;
      const g = this.ctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      g.imageSmoothingEnabled = !this.pixelArt;
      const s = { W: this.ui[0], H: this.ui[1], time, display: this, ...(this.state.drawState || {}) };
      if (o.draw) o.draw(g, s);
      if (extra) extra(g, s);
      this.tex.needsUpdate = true;
      return true;
    }
    setBulge(k) {
      if (!this.bulge) return;
      G.setBulge(this.geometry, this.bulge * k);
    }
    // The part of the picture the camera can see, as a window in the glass's uv, and how many
    // device pixels it covers. Returns null when the screen is out of view.
    view(camera, vw, vh) {
      const m = this.mesh.matrixWorld;
      const uvs = [];
      const v = this._v;
      const [ix0, iy0, ix1, iy1] = this.img;
      const N = 10;
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const gu = ix0 + ((ix1 - ix0) * i) / N, gv = iy0 + ((iy1 - iy0) * j) / N;
        v.set((gu - 0.5) * this.gw, (gv - 0.5) * this.gh, 0).applyMatrix4(m).project(camera);
        if (v.z < 1 && v.z > -1 && Math.abs(v.x) <= 1.15 && Math.abs(v.y) <= 1.15) uvs.push([gu, gv]);
      }
      // the corners of the view, cast onto the glass
      const n = new T.Vector3(0, 0, 1).transformDirection(m);
      const p0 = new T.Vector3().setFromMatrixPosition(m);
      const plane = new T.Plane().setFromNormalAndCoplanarPoint(n, p0);
      const inv = new T.Matrix4().copy(m).invert();
      const hit = new T.Vector3();
      const corners = [];
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
        this._ray.setFromCamera({ x, y }, camera);
        if (this._ray.ray.intersectPlane(plane, hit) && hit.clone().sub(camera.position).dot(this._ray.ray.direction) > 0) {
          const l = hit.clone().applyMatrix4(inv);
          const gu = l.x / this.gw + 0.5, gv = l.y / this.gh + 0.5;
          if (gu > ix0 - 0.02 && gu < ix1 + 0.02 && gv > iy0 - 0.02 && gv < iy1 + 0.02) uvs.push([clamp(gu, ix0, ix1), clamp(gv, iy0, iy1)]);
          if (corners.length < 4 && Math.abs(x) === 1 && Math.abs(y) === 1 && gu >= ix0 && gu <= ix1 && gv >= iy0 && gv <= iy1) corners.push([gu, gv]);
        }
      }
      if (!uvs.length) return null;
      // the whole view lies on the picture: the four corner rays bound exactly what is seen, so the
      // window is that, with a hair of margin (padding by a fraction of the whole picture instead
      // would make the window, and its buffer, grow without end as the camera closes in)
      let pad = 1 / N;
      if (corners.length === 4) {
        uvs.length = 0;
        uvs.push(...corners);
        pad = 0.02 * Math.max(Math.max(...corners.map((c) => c[0])) - Math.min(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1])) - Math.min(...corners.map((c) => c[1]))) / Math.max(ix1 - ix0, iy1 - iy0);
      }
      let x0 = Math.min(...uvs.map((u) => u[0])) - pad * (ix1 - ix0), x1 = Math.max(...uvs.map((u) => u[0])) + pad * (ix1 - ix0);
      let y0 = Math.min(...uvs.map((u) => u[1])) - pad * (iy1 - iy0), y1 = Math.max(...uvs.map((u) => u[1])) + pad * (iy1 - iy0);
      // a little past the picture's edge, so the clamped border is black
      const mx = 0.004, my = 0.004;
      x0 = clamp(x0, ix0 - mx, ix1 + mx); x1 = clamp(x1, ix0 - mx, ix1 + mx);
      y0 = clamp(y0, iy0 - my, iy1 + my); y1 = clamp(y1, iy0 - my, iy1 + my);
      // how many device pixels the window covers on screen
      const pr = (gu, gv) => v.set((gu - 0.5) * this.gw, (gv - 0.5) * this.gh, 0).applyMatrix4(m).project(camera).clone();
      const a = pr(x0, (y0 + y1) / 2), b = pr(x1, (y0 + y1) / 2), c = pr((x0 + x1) / 2, y0), d = pr((x0 + x1) / 2, y1);
      let pw, ph;
      if ([a, b, c, d].some((p) => p.z >= 1 || p.z <= -1)) { pw = vw; ph = vh; }
      else {
        pw = Math.hypot((b.x - a.x) * vw / 2, (b.y - a.y) * vh / 2);
        ph = Math.hypot((d.x - c.x) * vw / 2, (d.y - c.y) * vh / 2);
        // a window seen edge-on still needs texels across its length
        const diag = Math.max(pw, ph);
        pw = Math.max(pw, diag * 0.25);
        ph = Math.max(ph, diag * 0.25);
      }
      return { win: [x0, y0, x1, y1], pw, ph };
    }
    // Composite this frame's picture for a camera. vw, vh: the view in device pixels.
    composite(renderer, camera, vw, vh, time) {
      const st = this.state;
      const vis = this.view(camera, vw, vh);
      if (!vis) return false;
      const maxT = Math.min(4096, Real.maxTex || 4096);
      const q = (n) => Math.max(32, Math.min(maxT, Math.ceil(n / 32) * 32));
      let W = q(vis.pw * 1.15), H = q(vis.ph * 1.15);
      const rw = this.rt.width, rh = this.rt.height;
      // grow with headroom and shrink late, so a camera closing in does not reallocate every frame
      const needW = W;
      if (W > rw || H > rh) this.rt.setSize(Math.max(W, Math.min(q(rw * 1.5), q(vw * 1.2))), Math.max(H, Math.min(q(rh * 1.5), q(vh * 1.2))));
      else if (W < rw * 0.45 && H < rh * 0.45) this.rt.setSize(q(W * 1.25), q(H * 1.25));
      W = this.rt.width; H = this.rt.height;
      const [x0, y0, x1, y1] = vis.win;
      const u = this.uniforms;
      u.uWin.value.set(x0, y0, x1, y1);
      const cellsAcross = this.panel[0] * ((x1 - x0) / (this.img[2] - this.img[0]));
      u.uCellPx.value = needW / 1.15 / Math.max(1, cellsAcross);
      const cellsDown = this.panel[1] * ((y1 - y0) / (this.img[3] - this.img[1]));
      u.uCellSeen.value = Math.min(vis.pw / Math.max(1, cellsAcross), vis.ph / Math.max(1, cellsDown));
      u.uBright.value = this.bright * (st.brightMul ?? 1);
      u.uPower.value = st.power;
      u.uOpen.value = st.open || 0;
      u.uStruct.value = st.struct;
      u.uTime.value = time;
      const has = !!(st.portalTex && st.frame);
      u.uHasPortal.value = has ? 1 : 0;
      if (has) {
        u.uPortal.value = st.portalTex;
        u.uPortalPx.value.set(st.portalTex.image.width || 512, st.portalTex.image.height || 512);
        u.uFrame.value.set(st.frame[0] / this.ui[0], st.frame[1] / this.ui[1], (st.frame[0] + st.frame[2]) / this.ui[0], (st.frame[1] + st.frame[3]) / this.ui[1]);
      } else u.uPortal.value = Real.blankTex || (Real.blankTex = new T.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
      const look = st.look || {};
      u.uLook.value = LOOK[look.kind || 'none'] || 0;
      u.uLookAmt.value = look.kind ? st.lookAmt : 0;
      u.uLookLevels.value = look.levels || 4;
      const rg = look.range || (look.kind === 'mono' || look.kind === 'gray' ? [0.05, 0.8] : [0, 1]);
      u.uLookRange.value.set(rg[0], rg[1]);
      const lin = (c, d) => { const cc = new T.Color(c || d); return new T.Vector3(cc.r, cc.g, cc.b); };
      u.uLookFg.value.copy(lin(look.fg, '#ffffff'));
      u.uLookBg.value.copy(lin(look.bg, '#000000'));
      // the emissive map shows this window of the glass
      const t = this.rt.texture;
      t.repeat.set(1 / (x1 - x0), 1 / (y1 - y0));
      t.offset.set(-x0 / (x1 - x0), -y0 / (y1 - y0));
      t.updateMatrix();
      if (!quad) quad = new T.FullScreenQuad(null);
      quad.material = this.compMat;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(this.rt);
      quad.render(renderer);
      renderer.setRenderTarget(prev);
      // the glass: reflections fade as you go through it
      this.material.envMapIntensity = st.glass;
      this.material.specularIntensity = st.glass;
      this.material.clearcoat = (this.techId === 4 || this.techId === 5 ? 0 : this.techId >= 6 ? 1 : 0.6) * st.glass;
      this.material.color.set(this.o.glassColor || TECH[this.tech][3]).multiplyScalar(0.25 + 0.75 * st.glass);
      return true;
    }
  }
  Real.Display = Display;
})(window);
