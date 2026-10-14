// core.js: the renderer, the photo studio and the post-processing pipeline. Everything is in
// millimetres, y up, and a machine stands on the floor at y = 0 facing +z.
// Shared by every machine. Machine files must not edit this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = (global.Real = global.Real || {});

  // ---------- small maths ----------
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mod = (a, n) => ((a % n) + n) % n;
  const ease = (x) => x * x * (3 - 2 * x);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const deg = (d) => (d * Math.PI) / 180;
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  Real.U = { clamp, smooth, lerp, mod, ease, easeOut, easeInOut, deg, rng };

  // Parts one machine builds and another reuses (the M1 package, built by the Apple M1 and seated
  // in the iMac 24″). The machine that owns a part publishes its builder here when its file loads;
  // a machine that borrows it looks it up inside its make(), never at load time, so the order of the
  // files does not matter.
  Real.parts = {};

  const Q = new URLSearchParams(location.search);
  Real.query = Q;

  // ---------- a camera with a shift lens ----------
  // Product photographers shift the lens rather than tilt the camera, so the machine can sit in the
  // middle of the free area of the page while verticals stay true. shift is in NDC units.
  class ShiftCamera extends T.PerspectiveCamera {
    constructor(fov, aspect, near, far) {
      super(fov, aspect, near, far);
      this.shift = new T.Vector2();
    }
    updateProjectionMatrix() {
      super.updateProjectionMatrix();
      if (this.shift) {
        const e = this.projectionMatrix.elements;
        e[8] -= this.shift.x;
        e[9] -= this.shift.y;
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
      }
    }
  }
  Real.ShiftCamera = ShiftCamera;

  // ---------- the renderer ----------
  Real.initRenderer = function (canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.NeutralToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.VSMShadowMap;
    r.shadowMap.autoUpdate = true;
    // clipping planes on materials (the iMac G3's Bondi and ice line is cut by one)
    r.localClippingEnabled = true;
    Real.renderer = r;
    Real.maxTex = r.capabilities.maxTextureSize;
    Real.envMap = studioEnvironment(r);
    return r;
  };

  // ---------- the studio ----------
  // A dark studio with big softboxes: a key above and to the left, a broad overhead, a dim fill on
  // the right and two strip lights behind for edges, a scrim behind and above, a low card in front
  // and white bounce cards low on either side. Reflections in glass and polished metal show these
  // shapes, as they do in a product photograph. With paper given, the floor is that paper, lit: the
  // seamless sweep the machine stands on, which is most of what a vertical face of polished or
  // blasted metal mirrors (without it the front of a laptop or the sides of a Mac mini go black),
  // with the shaded band where it curves up behind, which draws the dark line along a top edge.
  function studioScene(paper) {
    const scene = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(30, 16, 30), new T.MeshBasicMaterial({ color: new T.Color(0.11, 0.11, 0.115), side: T.BackSide }));
    room.position.y = 5;
    scene.add(room);
    const floor = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshBasicMaterial({ color: paper ? new T.Color(paper).multiplyScalar(1.45) : new T.Color(0.22, 0.215, 0.205) }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = paper ? -1.6 : -2.9;
    scene.add(floor);
    if (paper) {
      const band = new T.Mesh(new T.PlaneGeometry(30, 1.8), new T.MeshBasicMaterial({ color: new T.Color(paper).multiplyScalar(0.45), side: T.DoubleSide }));
      band.position.set(0, -0.7, -12);
      scene.add(band);
    }
    const box = (w, h, x, y, z, k, tint = [1, 1, 1]) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(tint[0] * k, tint[1] * k, tint[2] * k), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      scene.add(m);
      return m;
    };
    box(7, 5, -8, 7, 7, 14, [1, 0.985, 0.96]); // key
    box(10, 10, 0, 10.5, 0, 5.5); // overhead
    box(6, 6, 10, 2.5, 4, 2.6, [0.97, 0.98, 1]); // fill
    box(1.4, 9, -9, 3.5, -8, 16); // rim, back left
    box(1.4, 9, 9.5, 3.5, -7, 13); // rim, back right
    box(16, 2.2, 0, 1.2, 13, 1.6); // a low card in front, for a soft line along front edges
    box(26, 9, 0, 6.5, -13, 2.4); // the scrim: top surfaces catch a soft gradient from it
    box(9, 3.5, -12, 0.2, 2, 2.2); // white bounce cards low down on either side
    box(9, 3.5, 12, 0.2, 1, 2.2);
    return scene;
  }
  function prefilter(renderer, scene) {
    const pmrem = new T.PMREMGenerator(renderer);
    const env = pmrem.fromScene(scene, 0.035).texture;
    pmrem.dispose();
    return env;
  }
  function studioEnvironment(renderer) { return prefilter(renderer, studioScene(null)); }
  // The studio with the paper sweep in it, for a sweep of this colour: prefiltered once per colour.
  // Every set lights its machine with it; use it too as the envMap of a material of your own, with
  // envMapIntensity 0.36 (the studio's own scale).
  const sweepEnvs = new Map();
  Real.sweepEnv = function (paper = '#dcdbd7') {
    const pk = new T.Color(paper).getHexString();
    if (!sweepEnvs.has(pk)) sweepEnvs.set(pk, prefilter(Real.renderer, studioScene(paper)));
    return sweepEnvs.get(pk);
  };

  // A seamless paper sweep sized to the machine: floor, a curve, and a wall.
  function sweepGeometry(width, front, back, radius, height, seg = 28) {
    const prof = [];
    prof.push([front, 0]);
    prof.push([-back, 0]);
    for (let i = 1; i <= seg; i++) {
      const a = (i / seg) * (Math.PI / 2);
      prof.push([-back - Math.sin(a) * radius, radius - Math.cos(a) * radius]);
    }
    prof.push([-back - radius, height]);
    const pos = [], uv = [], idx = [];
    let acc = 0;
    prof.forEach((p, i) => {
      if (i) acc += Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1]);
      for (const x of [-width / 2, width / 2]) {
        pos.push(x, p[1], p[0]);
        uv.push(x / 1000, acc / 1000);
      }
    });
    for (let i = 0; i < prof.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  // Build the set around a machine: the sweep, the key light that casts the shadow, and the scene.
  // o.paper: the sweep's colour; o.size: the machine's bounding box; o.key: the key light's
  // direction (from the machine toward the light) and strength.
  Real.makeSet = function (box, o = {}) {
    const scene = new T.Scene();
    // the studio's light, with this sweep in it (Real.envMap, the studio alone, is kept for ?nosweep)
    scene.environment = Q.has('nosweep') ? Real.envMap : Real.sweepEnv(o.paper || '#d9d7d2');
    scene.environmentIntensity = (o.env ?? 1) * 0.36;
    const paper = new T.Color(o.paper || '#d9d7d2');
    scene.background = paper.clone().multiplyScalar(0.62);
    const size = new T.Vector3();
    box.getSize(size);
    const S = Math.max(size.x, size.y, size.z);
    const sweep = new T.Mesh(
      sweepGeometry(S * 14, S * 6, S * (o.back ?? 0.9) + Math.max(0, -box.min.z), S * 0.9, S * 6),
      new T.MeshStandardMaterial({ color: paper, roughness: 0.92, metalness: 0 }),
    );
    sweep.receiveShadow = true;
    sweep.name = 'sweep';
    scene.add(sweep);
    // the key light: soft-edged shadow down and back to the right
    const key = new T.DirectionalLight(o.keyColor || '#fff8ee', o.keyI ?? 1.5);
    const dir = new T.Vector3(...(o.keyDir || [-0.55, 0.85, 0.45])).normalize();
    const c = new T.Vector3();
    box.getCenter(c);
    key.position.copy(c).addScaledVector(dir, S * 4);
    key.target.position.copy(c);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = o.shadowSoft ?? 14;
    key.shadow.blurSamples = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = S * 0.0006;
    const sc = key.shadow.camera;
    const r = S * 1.25;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r;
    sc.near = S * 1.5; sc.far = S * 7;
    key.shadow.autoUpdate = false;
    key.shadow.needsUpdate = true;
    scene.add(key, key.target);
    return { scene, sweep, key, size: S };
  };

  // ---------- post-processing ----------
  // Render → ambient occlusion → depth of field → bloom on what glows → tone map. The result is a
  // display-referred image in a texture, which the app then presents (and blends, for transitions).
  const DOFShader = {
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      uNear: { value: 1 },
      uFar: { value: 1000 },
      uFocus: { value: 500 },
      uAperture: { value: 0 },
      uMaxBlur: { value: 10 },
      uRes: { value: new T.Vector2(1, 1) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse, tDepth;
      uniform float uNear, uFar, uFocus, uAperture, uMaxBlur;
      uniform vec2 uRes;
      varying vec2 vUv;
      float viewZ(vec2 uv) {
        float d = texture2D(tDepth, uv).x;
        float z = d * 2.0 - 1.0;
        return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
      }
      // circle of confusion in pixels, signed: negative in front of the focus
      float coc(float z) { return clamp(uAperture * (z - uFocus) / z, -uMaxBlur, uMaxBlur); }
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        if (uAperture <= 0.0) { gl_FragColor = base; return; }
        float zc = viewZ(vUv);
        float cc = abs(coc(zc));
        vec3 acc = base.rgb; float wsum = 1.0;
        const int N = 40;
        float R = uMaxBlur;
        for (int i = 0; i < N; i++) {
          float fi = float(i) + 0.5;
          float r = R * sqrt(fi / float(N));
          float a = fi * 2.39996323;
          vec2 o = vec2(cos(a), sin(a)) * r;
          vec2 uv = vUv + o / uRes;
          float zs = viewZ(uv);
          float cs = abs(coc(zs));
          // a sample behind the pixel cannot blur over it by more than the pixel itself is blurred
          if (zs > zc) cs = min(cs, cc);
          float w = smoothstep(r - 1.0, r + 0.5, cs);
          acc += texture2D(tDiffuse, uv).rgb * w;
          wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, base.a);
      }`,
  };

  class Pipeline {
    constructor(renderer, w, h, o = {}) {
      this.r = renderer;
      this.w = w;
      this.h = h;
      const rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: o.samples ?? 4 });
      this.composer = new T.EffectComposer(renderer, rt);
      this.composer.setPixelRatio(1);
      this.composer.renderToScreen = false;
      this.renderPass = new T.RenderPass(new T.Scene(), new T.PerspectiveCamera());
      this.composer.addPass(this.renderPass);
      this.gtao = new T.GTAOPass(this.renderPass.scene, this.renderPass.camera, w, h);
      this.gtao.blendIntensity = 1;
      this.gtao.updateGtaoMaterial({ radius: 12, distanceExponent: 1.4, thickness: 6, scale: 1, samples: 16, distanceFallOff: 1 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      this.composer.addPass(this.gtao);
      this.dof = new T.ShaderPass(DOFShader);
      this.composer.addPass(this.dof);
      this.bloom = new T.UnrealBloomPass(new T.Vector2(w / 2, h / 2), 0.28, 0.5, 1.35);
      this.composer.addPass(this.bloom);
      this.output = new T.OutputPass();
      this.composer.addPass(this.output);
      this.composer.setSize(w, h);
    }
    setSize(w, h) {
      if (w === this.w && h === this.h) return;
      this.w = w;
      this.h = h;
      this.composer.setSize(w, h);
    }
    // o.focus: distance to the plane of focus (mm); o.aperture: blur scale in pixels (0 = none)
    render(scene, camera, o = {}) {
      this.renderPass.scene = scene;
      this.renderPass.camera = camera;
      this.gtao.scene = scene;
      this.gtao.camera = camera;
      const dist = o.focus ?? camera.position.length();
      const aoR = clamp(dist * (Q.has('aor') ? +Q.get('aor') : 0.03), 0.3, 120);
      this.gtao.updateGtaoMaterial({ radius: aoR, thickness: aoR * (Q.has('aot') ? +Q.get('aot') : 2), scale: Q.has('aos') ? +Q.get('aos') : 1 });
      this.gtao.blendIntensity = o.ao ?? 1;
      const u = this.dof.uniforms;
      u.tDepth.value = this.gtao.depthTexture;
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uFocus.value = dist;
      const k = this.h / 900;
      u.uAperture.value = (o.aperture ?? 0) * k;
      u.uMaxBlur.value = Math.max(1, (o.maxBlur ?? 12) * k);
      u.uRes.value.set(this.w, this.h);
      // depth of field reads the depth the AO pass renders, so it needs that pass
      this.dof.enabled = (o.aperture ?? 0) > 0.01 && !Q.has('nodof') && !Q.has('noao');
      this.bloom.strength = o.bloom ?? 0.28;
      this.bloom.enabled = !Q.has('nobloom');
      this.gtao.enabled = !Q.has('noao');
      if (Q.has('aoview')) this.gtao.output = T.GTAOPass.OUTPUT.Denoise;
      this.composer.render();
      return this.composer.readBuffer.texture;
    }
  }
  Real.Pipeline = Pipeline;
})(window);
