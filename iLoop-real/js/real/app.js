// app.js: the endless zoom, photographed. Level L is continuous: floor(L) is the machine in front of
// you and frac(L) = t is how far you have travelled toward the next one. Each machine says how it
// leads on (next.type):
//   screen    the next machine is on its screen; the camera dollies in until the screen is the frame
//   inside    parts lift away, the camera goes down onto a chip, and the next machine is there
//   die       as inside, and the next machine is etched into the silicon you land on
//   assemble  the camera goes down onto a chip, and the next machine's parts fly in round it
// Everything is a function of L, so scrolling scrubs every transition both ways.
'use strict';

(function () {
  const T = THREE;
  const { clamp, smooth, lerp, mod, easeInOut, deg } = Real.U;
  const DEV = Real.list;
  const N = DEV.length;
  const Q = Real.query;
  const AT = Q.has('at') ? parseFloat(Q.get('at')) : null;
  const PERF = Q.has('perf');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const cv = document.getElementById('stage');
  const renderer = Real.initRenderer(cv);
  let W = 0, H = 0, DPR = 1, VW = 1, VH = 1, sizeKey = '';
  let main = null, aux = null;
  const cam = new Real.ShiftCamera(30, 1, 1, 1e6);
  const camB = new Real.ShiftCamera(30, 1, 1, 1e6);

  // ---------- render targets and blits ----------
  const COPY = new T.ShaderMaterial({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }',
    depthTest: false, depthWrite: false,
  });
  const PRESENT = new T.ShaderMaterial({
    uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uSwipe: { value: 0 }, uRes: { value: new T.Vector2() }, uBg: { value: new T.Vector3(0.8, 0.8, 0.8) }, uWarp: { value: 0 }, uH: { value: new T.Matrix3() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D tA, tB; uniform float uMix, uSwipe, uWarp; uniform vec2 uRes; uniform vec3 uBg; uniform mat3 uH;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 c;
        if (uSwipe > 0.0) {
          // the view is swiped away to the left like a card; the next one slides in behind it
          float off = uSwipe * 1.04;
          vec2 ua = vUv + vec2(off, 0.0);
          c = ua.x <= 1.0 ? texture2D(tA, ua).rgb : uBg;
          float xb = 1.04 - off;
          if (vUv.x >= xb) c = texture2D(tB, vec2(vUv.x - xb, vUv.y)).rgb;
          else c *= 1.0 - 0.24 * smoothstep(xb - 0.014, xb, vUv.x);
        } else {
          c = texture2D(tA, vUv).rgb;
          if (uMix > 0.0 && uWarp > 0.5) {
            // the next machine's view lies where its frame is on the screen right now (a plane seen
            // in perspective: a homography), so it lines up with the picture on the glass; around
            // the portal, what the screen draws dissolves into it, feathered toward the frame's edge
            vec3 h = uH * vec3(vUv * 2.0 - 1.0, 1.0);
            vec2 b = h.xy / h.z;
            vec2 e = smoothstep(vec2(0.0), vec2(0.07), b) * smoothstep(vec2(0.0), vec2(0.07), 1.0 - b);
            bool inside = h.z > 0.0 && b.x >= 0.0 && b.x <= 1.0 && b.y >= 0.0 && b.y <= 1.0;
            float w = inside ? uMix * mix(e.x * e.y, 1.0, uMix * uMix) : 0.0;
            if (w > 0.0) c = mix(c, texture2D(tB, clamp(b, 0.0, 1.0)).rgb, w);
          } else if (uMix > 0.0) c = mix(c, texture2D(tB, vUv).rgb, uMix);
        }
        // a whisper of grain, below one step of 8-bit colour, so gradients do not band
        c += (hash(vUv * uRes) - 0.5) / 255.0;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new T.FullScreenQuad(null);
  function mipTarget(w, h) {
    const rt = new T.WebGLRenderTarget(w, h, { depthBuffer: false, generateMipmaps: true, minFilter: T.LinearMipmapLinearFilter, magFilter: T.LinearFilter });
    rt.texture.generateMipmaps = true;
    return rt;
  }
  function blit(tex, target) {
    COPY.uniforms.tDiffuse.value = tex;
    quad.material = COPY;
    renderer.setRenderTarget(target);
    quad.render(renderer);
    renderer.setRenderTarget(null);
  }

  // ---------- the page's layout: where a machine sits ----------
  function stageRect() {
    const top = W < 640 ? 150 : 128, bottom = W < 640 ? 100 : 96, side = W < 640 ? 16 : 28;
    const sh = Math.max(120, H - top - bottom);
    const sw = Math.min(W - 2 * side, sh * 1.75);
    const cx = W / 2, cy = top + sh / 2;
    return { x0: cx - sw / 2, y0: cy - sh / 2, x1: cx + sw / 2, y1: cy + sh / 2, w: sw, h: sh, cx, cy };
  }

  // ---------- poses: where the camera is ----------
  const pose = (pos, quat, shift, focus, fov) => ({ pos, quat, shift, focus, fov });
  function applyPose(c, p, aspect) {
    c.position.copy(p.pos);
    c.quaternion.copy(p.quat);
    c.shift.copy(p.shift);
    c.fov = p.fov;
    c.aspect = aspect;
    c.near = clamp(p.focus * 0.04, 0.2, 400);
    c.far = Math.max(p.focus * 60, 60000);
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
  }
  const fovOf = (dev) => (2 * Math.atan(12 / ((dev.view && dev.view.lens) || 85)) * 180) / Math.PI;
  // The machine at rest: seen from yaw and pitch with a long lens, fitted into the free area of the
  // page, the lens shifted so it sits in the middle of that area.
  function restPose(dev) {
    if (dev._rest && dev._restKey === sizeKey) return dev._rest;
    const v = dev.view || {};
    const yaw = deg(v.yaw ?? 25), pitch = deg(v.pitch ?? 14);
    const fov = fovOf(dev);
    const box = dev.M.box;
    const target = v.target ? new T.Vector3(...v.target) : box.getCenter(new T.Vector3());
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) pts.push(new T.Vector3(x, y, z));
    const dir = new T.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const st = stageRect();
    const fill = v.fill ?? 0.9;
    const c = new Real.ShiftCamera(fov, W / H, 1, 1e7);
    let d = box.getSize(new T.Vector3()).length() * 2;
    let bb = null;
    const measure = () => {
      c.position.copy(target).addScaledVector(dir, d);
      c.lookAt(target);
      c.near = d * 0.01;
      c.far = d * 100;
      c.updateProjectionMatrix();
      c.updateMatrixWorld(true);
      bb = [1e9, 1e9, -1e9, -1e9];
      for (const p of pts) {
        const q = p.clone().project(c);
        bb[0] = Math.min(bb[0], q.x); bb[1] = Math.min(bb[1], q.y); bb[2] = Math.max(bb[2], q.x); bb[3] = Math.max(bb[3], q.y);
      }
    };
    for (let i = 0; i < 7; i++) {
      measure();
      const pw = ((bb[2] - bb[0]) / 2) * W, ph = ((bb[3] - bb[1]) / 2) * H;
      d *= Math.max(pw / (st.w * fill), ph / (st.h * fill));
    }
    measure();
    const want = new T.Vector2((st.cx / W) * 2 - 1, 1 - (st.cy / H) * 2);
    const shift = new T.Vector2(want.x - (bb[0] + bb[2]) / 2, want.y - (bb[1] + bb[3]) / 2);
    dev._rest = pose(c.position.clone(), c.quaternion.clone(), shift, d, fov);
    dev._restKey = sizeKey;
    return dev._rest;
  }
  // A rectangle on a machine (a mark), in world space
  function markWorld(mk) {
    mk.object.updateWorldMatrix(true, false);
    const m = mk.object.matrixWorld;
    const c = mk.center.clone().applyMatrix4(m);
    const ex = mk.x.clone().transformDirection(m), ey = mk.y.clone().transformDirection(m);
    const n = ex.clone().cross(ey).normalize();
    return { c, ex, ey, n, w: mk.w, h: mk.h };
  }
  // The pose that puts a rectangle (centre c, axes ex/ey, normal n) at the place on the page where
  // the next machine's stage is, so what is drawn there lines up with that machine at rest. hmm is
  // the height of the whole view, in mm, at that rectangle.
  function framePose(c, ex, ey, n, frameW, frameH, fov) {
    const d = frameH / 2 / Math.tan(deg(fov) / 2);
    const pos = c.clone().addScaledVector(n, d);
    const m = new T.Matrix4().lookAt(pos, c, ey);
    return pose(pos, new T.Quaternion().setFromRotationMatrix(m), new T.Vector2(), d, fov);
  }
  // Where the next machine's whole view lands on a screen, in the screen's ui units: its stage fits
  // the screen's portal.rect.
  function portalFrame(disp) {
    const st = stageRect();
    const [rx, ry, rw, rh] = disp.portal.rect;
    const sx = disp.w / disp.ui[0], sy = disp.h / disp.ui[1];
    const k = Math.min((rw * sx) / st.w, (rh * sy) / st.h);
    const cx = (rx + rw / 2) * sx, cy = (ry + rh / 2) * sy;
    const x0 = cx - st.cx * k, y0 = cy - st.cy * k;
    return [x0 / sx, y0 / sy, (W * k) / sx, (H * k) / sy];
  }
  function portalPose(dev, disp, frame) {
    disp.mesh.updateWorldMatrix(true, false);
    const m = disp.mesh.matrixWorld;
    const c = disp.uiToWorld(frame[0] + frame[2] / 2, frame[1] + frame[3] / 2);
    const ex = new T.Vector3(1, 0, 0).transformDirection(m), ey = new T.Vector3(0, 1, 0).transformDirection(m), n = new T.Vector3(0, 0, 1).transformDirection(m);
    const fh = (frame[3] / disp.ui[1]) * disp.h;
    return framePose(c, ex, ey, n, (frame[2] / disp.ui[0]) * disp.w, fh, restPose(dev).fov);
  }
  // A chip as the frame: the next machine's stage lands on the chip's top.
  function chipPose(dev, mk) {
    const w = markWorld(mk);
    const st = stageRect();
    const k = Math.min(w.w / st.w, w.h / st.h);
    const fc = w.c.clone().addScaledVector(w.ex, (W / 2 - st.cx) * k).addScaledVector(w.ey, -(H / 2 - st.cy) * k);
    return framePose(fc, w.ex, w.ey, w.n, W * k, H * k, restPose(dev).fov);
  }
  // A macro shot of a chip: from in front and above, the chip about half the frame wide.
  function heroPose(dev, mk) {
    const w = markWorld(mk);
    const fov = restPose(dev).fov;
    const th = deg(34);
    const dir = w.n.clone().multiplyScalar(Math.cos(th)).addScaledVector(w.ey, -Math.sin(th)).normalize();
    const tanv = Math.tan(deg(fov) / 2);
    const d = Math.max(w.w / 0.5 / (2 * tanv * (W / H)), w.h / 0.55 / (2 * tanv));
    const pos = w.c.clone().addScaledVector(dir, d);
    const m = new T.Matrix4().lookAt(pos, w.c, w.ey);
    return pose(pos, new T.Quaternion().setFromRotationMatrix(m), new T.Vector2(), d, fov);
  }
  // Travel from P0 to P1 round a point both look at: the distance shrinks exponentially (every
  // stretch of scroll magnifies by the same factor) while the camera swings round the point and turns
  // square to it, so the point stays in view however long the lens.
  function travel(P0, P1, s, target) {
    const v0 = P0.pos.clone().sub(target), v1 = P1.pos.clone().sub(target);
    const d0 = Math.max(1e-6, v0.length()), d1 = Math.max(1e-6, v1.length());
    const d = d0 * Math.pow(d1 / d0, s);
    const swing = new T.Quaternion().setFromUnitVectors(v0.clone().normalize(), v1.clone().normalize());
    const dir = v0.normalize().applyQuaternion(new T.Quaternion().slerp(swing, s));
    const pos = target.clone().addScaledVector(dir, d);
    const quat = P0.quat.clone().slerp(P1.quat, s);
    const shift = P0.shift.clone().lerp(P1.shift, s);
    return pose(pos, quat, shift, d, lerp(P0.fov, P1.fov, s));
  }

  // ---------- parts ----------
  const _e = new T.Euler(), _q = new T.Quaternion();
  function placePart(p, off, rot, vis = true) {
    p.group.position.copy(p.home.pos);
    if (off) p.group.position.add(off);
    p.group.quaternion.copy(p.home.quat);
    if (rot) p.group.quaternion.multiply(_q.setFromEuler(_e.set(deg(rot[0]), deg(rot[1]), deg(rot[2]))));
    p.group.visible = vis;
  }
  function homeParts(dev) {
    for (const p of dev.M.parts) placePart(p);
  }
  function peelParts(dev, t) {
    let moved = false;
    for (const p of dev.M.parts) {
      if (!p.peel) { placePart(p); continue; }
      const k = easeInOut(smooth(p.peel.at[0], p.peel.at[1], t));
      const mv = p.peel.move || [0, 0, 0], rt = p.peel.rot || [0, 0, 0];
      placePart(p, new T.Vector3(mv[0] * k, mv[1] * k, mv[2] * k), rt.map((v) => v * k), !(p.peel.hide && k >= 0.999));
      if (k > 0 && k < 1) moved = true;
    }
    return moved;
  }
  function flyParts(dev, u) {
    let moved = false;
    for (const p of dev.M.parts) {
      if (!p.fly) { placePart(p); continue; }
      const f = p.fly;
      const q = easeInOut(clamp((u - f.at[0]) / (f.at[1] - f.at[0]), 0, 1));
      const k = 1 - q;
      const fr = f.from || [0, 0, 0], rt = f.rot || [0, 0, 0];
      placePart(p, new T.Vector3(fr[0] * k, fr[1] * k, fr[2] * k), rt.map((v) => v * k), q > 0 || f.show);
      if (k > 0 && k < 1) moved = true;
    }
    return moved;
  }

  // ---------- rendering a machine ----------
  // Every screen on a machine: its canvas painted (if due) and its picture composited for camera c.
  function screensFor(dev, c, vw, vh) {
    for (const d of dev.M.screens) d.composite(renderer, c, vw, vh, S.time);
  }
  function paintScreens(dev) {
    let any = false;
    for (const d of dev.M.screens) any = d.paint(S.time) || any;
    return any;
  }
  // a machine's screen at rest shows the next machine (from its snapshot), as that screen would
  function restScreen(dev) {
    const disp = dev.M.main;
    if (!disp || !disp.portal || dev.next.type !== 'screen') return;
    const nx = DEV[mod(dev.index + 1, N)];
    const st = disp.state;
    st.look = dev.next.look || null;
    st.lookAmt = 1;
    st.struct = 1;
    st.glass = 1;
    st.brightMul = 1;
    st.frame = portalFrame(disp);
    st.open = 0;
    st.portalTex = nx._snap ? nx._snap.texture : null;
    disp.setBulge(1);
  }
  function restDie(dev) {
    const mk = dev.M.marks.chip;
    if (!mk || !mk.display) return;
    const disp = mk.display;
    const nx = DEV[mod(dev.index + 1, N)];
    const st = disp.state;
    st.look = dev.next.look || { kind: 'etch', fg: dev.next.fg || '#d8ceb6', bg: dev.next.bg || '#2b2723' };
    st.lookAmt = 1;
    st.struct = 1;
    st.glass = 1;
    st.brightMul = 1;
    st.frame = portalFrame(disp);
    st.open = 0;
    st.portalTex = nx._snap ? nx._snap.texture : null;
  }
  const BG = new T.Vector3();
  function renderDev(pipe, dev, P, o = {}) {
    applyPose(o.camera || cam, P, W / H);
    screensFor(dev, o.camera || cam, pipe.w, pipe.h);
    return pipe.render(dev.M.scene, o.camera || cam, { focus: P.focus, aperture: o.aperture ?? (dev.view && dev.view.aperture) ?? 5, maxBlur: o.maxBlur ?? 10, bloom: o.bloom ?? 0.26, ao: o.ao ?? 1, quality: o.quality ?? quality });
  }
  // A machine at rest, as it is shown on the previous machine's screen: rendered once (per window
  // size) at reduced size, with its own screen showing its next machine's snapshot if there is one.
  function snapshot(dev, force) {
    if (dev._snap && dev._snapKey === sizeKey && !force) return dev._snap;
    dev.build();
    const w = aux.w, h = aux.h;
    homeParts(dev);
    if (dev.pose) dev.pose(dev.M, {});
    restScreen(dev);
    restDie(dev);
    paintScreens(dev);
    const tex = renderDev(aux, dev, restPose(dev), { camera: camB, quality: 1 });
    if (!dev._snap || dev._snap.width !== w || dev._snap.height !== h) {
      if (dev._snap) dev._snap.dispose();
      dev._snap = mipTarget(w, h);
    }
    blit(tex, dev._snap);
    dev._snapKey = sizeKey;
    return dev._snap;
  }
  // The next machine rendered live, for the screen it is on or to cross over to: scale is the
  // fraction of the full view size (quantised, so the buffers are not reallocated every frame).
  // Two fixed sizes, half and full, so no buffers are reallocated in the middle of a transition.
  // One target per size, kept, so crossing from half to full size reallocates nothing.
  let live = null;
  const liveRT = { half: null, full: null };
  // The next machine only changes when an egg poses it, so its render is kept until the pose (or
  // the window, or the snapshot on its own screen) changes; its own animated screens hold still for
  // the second or two the transition takes.
  function renderLive(dev, scale, state) {
    const full = scale > 0.5;
    const pipe = full ? auxFull() : aux;
    const w = pipe.w, h = pipe.h;
    const nx = DEV[mod(dev.index + 1, N)];
    const key = `${dev.index}|${sizeKey}|${JSON.stringify(state || {})}|${nx._snap && nx._snapKey === sizeKey ? 1 : 0}|${quality > 0.5 ? 1 : 0}`;
    const kept = liveRT[full ? 'full' : 'half'];
    if (kept && kept.key === key && kept.width === w && kept.height === h) { live = kept; return live; }
    homeParts(dev);
    if (dev.pose) dev.pose(dev.M, state || {});
    restScreen(dev);
    restDie(dev);
    paintScreens(dev);
    const tex = renderDev(pipe, dev, restPose(dev), { camera: camB });
    const k = full ? 'full' : 'half';
    let rt = liveRT[k];
    if (!rt || rt.width !== w || rt.height !== h) {
      if (rt) rt.dispose();
      rt = liveRT[k] = mipTarget(w, h);
    }
    live = rt;
    blit(tex, live);
    rt.key = key;
    return live;
  }

  // ---------- one frame ----------
  const S = { L: 0, Lt: 0, anim: null, lastInput: -1e9, playing: false, playNext: 0, playArrived: 0, vel: 0, time: 0, idx: -1, touched: false, dir: 0 };
  const pointers = new Map();
  const SPLIT = 0.38;

  // how long (in log-zoom) the scroll from machine k to k+1 is
  function levelLn(k) {
    const dev = DEV[mod(k, N)];
    if (!dev.M) return 1.6;
    if (dev._ln && dev._lnKey === sizeKey) return dev._ln;
    let ln = 1.6;
    try {
      const nx = DEV[mod(k + 1, N)];
      if (dev.next.type === 'assemble') ln = nx.colors || dev.next.long ? 6.5 : 4.2;
      else {
        const P0 = restPose(dev);
        let P1 = null, target = null;
        const disp = dev.next.type === 'screen' ? dev.M.main : dev.M.marks.chip && dev.M.marks.chip.display;
        if (disp && disp.portal) { const f = portalFrame(disp); P1 = portalPose(dev, disp, f); target = disp.uiToWorld(f[0] + f[2] / 2, f[1] + f[3] / 2); }
        else if (dev.M.marks.chip) { P1 = chipPose(dev, dev.M.marks.chip); target = markWorld(dev.M.marks.chip).c; }
        if (P1) ln = clamp(Math.log(P0.pos.distanceTo(target) / P1.pos.distanceTo(target)), 0.8, 5) * (dev.next.swipe ? 1.4 : 1);
      }
    } catch (e) { console.warn(e); }
    dev._ln = ln;
    dev._lnKey = sizeKey;
    return ln;
  }

  // what to draw this frame: { A: texture, B: texture|null, mix, swipe }
  let lastEggDev = null;
  function frameFor(L) {
    const K = Math.floor(L), t = L - K;
    const A = DEV[mod(K, N)].build(), B = DEV[mod(K + 1, N)].build();
    if (lastEggDev && lastEggDev !== A) {
      const e = Real.eggs[lastEggDev.next.egg];
      if (e) e(eggApi(lastEggDev, DEV[mod(lastEggDev.index + 1, N)], 0, 1));
      lastEggDev = null;
    }
    if (A.pose) A.pose(A.M, {});
    if (A.assemble) A.assemble(A.M, 1, {});
    const type = A.next.type;
    if (type === 'assemble') return frameAssemble(A, B, t);
    return framePortal(A, B, t);
  }

  function eggApi(A, B, t, zoom, extra = {}) {
    return { t, zoom, A, B, display: A.M.main, scene: A.M.scene, camera: cam, poseNext: (st) => { extra.nextState = st; }, ...extra, extra };
  }

  function framePortal(A, B, t) {
    const type = A.next.type;
    const P0 = restPose(A);
    let disp = null, P1 = null, target = null, frame = null;
    if (type === 'screen') disp = A.M.main;
    else if (A.M.marks.chip && A.M.marks.chip.display) disp = A.M.marks.chip.display;
    if (type === 'screen') homeParts(A);
    else peelParts(A, t);
    // the shadow only changes when something moves: parts lifting away, or an egg's props
    if (A._shadowT !== t && (type !== 'screen' || A.next.egg)) { A.M.set.key.shadow.needsUpdate = true; A._shadowT = t; }
    if (disp && disp.portal) {
      frame = portalFrame(disp);
      P1 = portalPose(A, disp, frame);
      target = disp.uiToWorld(frame[0] + frame[2] / 2, frame[1] + frame[3] / 2);
    } else if (A.M.marks.chip) {
      P1 = chipPose(A, A.M.marks.chip);
      target = markWorld(A.M.marks.chip).c;
    } else {
      P1 = P0;
      target = A.M.box.getCenter(new T.Vector3());
    }
    const swipe = !!A.next.swipe;
    const s = swipe ? easeInOut(smooth(0, 0.62, t)) : t;
    const P = travel(P0, P1, s, target);
    const zoom = P0.pos.distanceTo(target) / Math.max(1e-6, P.pos.distanceTo(target));

    // the next machine, live, once the camera is moving
    let liveTex = null, nextState = null;
    if (disp && disp.portal) {
      const st = disp.state;
      st.look = A.next.look || (type === 'die' ? { kind: 'etch', fg: A.next.fg || '#d8ceb6', bg: A.next.bg || '#2b2723' } : null);
      st.lookAmt = 1 - smooth(0.8, 0.985, t);
      st.struct = 1 - smooth(0.8, 0.96, t);
      st.glass = 1 - smooth(0.6, 0.95, t);
      st.brightMul = lerp(1, 1 / disp.bright, smooth(0.7, 0.98, t));
      st.power = 1;
      st.open = smooth(0.78, 0.95, t);
      st.frame = frame;
      disp.setBulge(1 - smooth(0.25, 0.85, t));
      const egg = A.next.egg && Real.eggs[A.next.egg];
      if (egg) {
        const extra = {};
        egg(eggApi(A, B, t, zoom, extra));
        nextState = extra.nextState || null;
        lastEggDev = A;
      }
      // how much of the page the next machine's view covers right now (all of it at t = 1)
      const scale = clamp(Math.max(P1.focus / Math.max(1e-6, P.focus), t > 0.85 ? 1 : 0), 0.3, 1);
      if (t > 0 || nextState) liveTex = renderLive(B, scale, nextState).texture;
      else liveTex = B._snap ? B._snap.texture : null;
      st.portalTex = liveTex;
      if (t > 0 && !B._snap) snapshot(B);
    }
    // the machine you are in front of
    paintScreens(A);
    const macro = type === 'screen' ? 0 : smooth(0.2, 0.7, t);
    const ap = lerp((A.view && A.view.aperture) ?? 5, 16, macro);
    // a camera this close to a screen sees its pixels, not a glow: bloom fades as you approach
    const texA = renderDev(main, A, P, { aperture: ap, maxBlur: lerp(10, 18, macro), bloom: 0.26 * (1 - smooth(0.15, 0.5, t)) });
    if (swipe) {
      const sw = easeInOut(smooth(0.55, 0.92, t));
      if (sw <= 0) return { A: texA, B: null, mix: 0, swipe: 0 };
      blit(texA, assembleHold());
      return { A: assembleHold().texture, B: renderLive(B, 1, null).texture, mix: 0, swipe: sw };
    }
    // the last stretch: cross over from the picture on the screen to the machine itself
    const x = Q.has('nox') ? 0 : smooth(0.9, 1, t);
    if (x > 0) {
      const lt = liveTex && live && live.width === VW ? live.texture : renderLive(B, 1, nextState).texture;
      const H3 = disp && disp.portal && disp.state.frame ? frameHomography(disp, disp.state.frame, cam) : null;
      return { A: texA, B: lt, mix: x, swipe: 0, H: H3 };
    }
    return { A: texA, B: null, mix: 0, swipe: 0 };
  }

  function frameAssemble(A, B, t) {
    const focus = A.M.marks.focus, anchor = B.M.marks.anchor;
    if (!focus || !anchor) {
      homeParts(A);
      return { A: renderDev(main, A, restPose(A)), B: null, mix: 0, swipe: 0 };
    }
    if (t <= SPLIT) {
      homeParts(A);
      const P0 = restPose(A), P1 = heroPose(A, focus);
      const P = travel(P0, P1, easeInOut(t / SPLIT), markWorld(focus).c);
      const macro = smooth(0.3, 1, t / SPLIT);
      paintScreens(A);
      return { A: renderDev(main, A, P, { aperture: lerp(5, 22, macro), maxBlur: lerp(10, 20, macro) }), B: null, mix: 0, swipe: 0 };
    }
    const u = (t - SPLIT) / (1 - SPLIT);
    flyParts(B, u);
    if (B._shadowT !== t) { B.M.set.key.shadow.needsUpdate = true; B._shadowT = t; }
    if (B.assemble) B.assemble(B.M, u, {});
    const P1 = heroPose(B, anchor), P0 = restPose(B);
    const back = B.assembleBack ?? 0;
    let P = travel(P0, P1, 1 - easeInOut(u), markWorld(anchor).c);
    if (back) {
      // an exploded view pulls back further than rest, so the whole diagram fits, then settles
      const c = B.M.box.getCenter(new T.Vector3());
      const k = 1 + back * Math.pow(Math.sin(Math.PI * clamp(u / 0.97, 0, 1)), 1.3);
      P = pose(c.clone().add(P.pos.clone().sub(c).multiplyScalar(k)), P.quat, P.shift, P.focus * k, P.fov);
    }
    paintScreens(B);
    const macro = 1 - smooth(0, 0.6, u);
    // the first moment: the old chip, the same chip, crossing to the new board
    const x = smooth(0, 0.09, u);
    if (x < 1) {
      homeParts(A);
      blit(renderDev(main, A, heroPose(A, focus), { aperture: 22, maxBlur: 20 }), assembleHold());
      const texB = renderDev(main, B, P, { aperture: lerp(5, 22, macro), maxBlur: lerp(10, 20, macro) });
      return { A: assembleHold().texture, B: texB, mix: x, swipe: 0 };
    }
    return { A: renderDev(main, B, P, { aperture: lerp(5, 22, macro), maxBlur: lerp(10, 20, macro) }), B: null, mix: 0, swipe: 0 };
  }
  let holdRT = null;
  function assembleHold() {
    if (!holdRT || holdRT.width !== VW || holdRT.height !== VH) {
      if (holdRT) holdRT.dispose();
      holdRT = mipTarget(VW, VH);
    }
    return holdRT;
  }

  // Where a frame on a screen lies in the view: the map from the view's NDC to the frame's uv (the
  // next machine's render, 0…1, y up). The frame is a rectangle on a flat pane, so its picture
  // through a perspective camera is a homography; this is its inverse.
  const _hm = new T.Matrix4(), _h3 = new T.Matrix3(), _hv = new T.Vector4();
  function frameHomography(disp, f, c) {
    disp.mesh.updateWorldMatrix(true, false);
    const O = disp.uiToWorld(f[0], f[1] + f[3]);
    const Eu = disp.uiToWorld(f[0] + f[2], f[1] + f[3]).sub(O), Ev = disp.uiToWorld(f[0], f[1]).sub(O);
    _hm.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    const col = (v, w) => { _hv.set(v.x, v.y, v.z, w).applyMatrix4(_hm); return [_hv.x, _hv.y, _hv.w]; };
    const a = col(Eu, 0), b = col(Ev, 0), o = col(O, 1);
    _h3.set(a[0], b[0], o[0], a[1], b[1], o[1], a[2], b[2], o[2]);
    if (Math.abs(_h3.determinant()) < 1e-12) return null;
    return _h3.clone().invert();
  }

  function present(f) {
    PRESENT.uniforms.uWarp.value = f.H ? 1 : 0;
    if (f.H) PRESENT.uniforms.uH.value.copy(f.H);
    PRESENT.uniforms.tA.value = f.A;
    PRESENT.uniforms.tB.value = f.B || f.A;
    PRESENT.uniforms.uMix.value = f.B ? f.mix : 0;
    PRESENT.uniforms.uSwipe.value = f.B ? f.swipe : 0;
    PRESENT.uniforms.uRes.value.set(VW, VH);
    quad.material = PRESENT;
    renderer.setRenderTarget(null);
    quad.render(renderer);
  }

  // ---------- input ----------
  function nudge(dln) {
    if (AT !== null) return;
    S.anim = null;
    S.playing = false;
    syncPlay();
    S.Lt += dln / levelLn(Math.floor(S.Lt));
    S.dir = Math.sign(dln);
    S.lastInput = performance.now();
    touched();
  }
  function go(delta) {
    if (AT !== null) return;
    const from = S.L;
    const base = S.anim ? S.anim.to : Math.round(S.Lt);
    const to = base + delta;
    const dist = Math.abs(to - from);
    const slow = dist <= 1.01 && DEV[mod(Math.floor(Math.min(from, to)), N)].next.type === 'assemble';
    S.anim = { from, to, t0: performance.now(), dur: dist <= 1.01 ? (slow ? 4600 : 2200) : 1100 + 650 * dist };
    S.lastInput = performance.now();
    touched();
  }
  function goTo(i) {
    let d = i - mod(Math.round(S.L), N);
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    if (d) go(d);
  }
  addEventListener('wheel', (e) => {
    if (e.target.closest && e.target.closest('.rail')) return;
    e.preventDefault();
    if (e.ctrlKey) return;
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 18;
    else if (e.deltaMode === 2) d *= 400;
    nudge(d * 0.0028);
  }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) addEventListener(ev, (e) => e.preventDefault());
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { y: e.clientY });
    S.lastInput = performance.now();
  });
  cv.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p || pointers.size > 1) return;
    const dy = e.clientY - p.y;
    p.y = e.clientY;
    nudge(-dy * 0.0075);
  });
  const up = (e) => { pointers.delete(e.pointerId); S.lastInput = performance.now(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === '+' || k === '=' || k === ' ') { e.preventDefault(); go(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === '-' || k === '_') { e.preventDefault(); go(-1); }
    else if (k === 'p') togglePlay();
  });

  // ---------- UI ----------
  const $ = (id) => document.getElementById(id);
  const ui = { cap: $('cap'), year: $('m-year'), idx: $('m-idx'), kind: $('m-kind'), title: $('title'), line: $('line'), verb: $('verb'), next: $('next'), rail: $('ticks'), cursor: $('cursor'), hint: $('hint'), play: $('b-play') };
  $('m-total').textContent = String(N).padStart(2, '0');
  ui.rail.style.gridTemplateColumns = `repeat(${N}, minmax(0, 1fr))`;
  ui.cursor.parentElement.style.left = ui.cursor.parentElement.style.right = `calc(50% / ${N})`;
  DEV.forEach((d, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    for (const [cls, txt] of [['y', d.year], ['n', d.name]]) {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = txt;
      b.appendChild(sp);
    }
    b.setAttribute('aria-label', `${d.name}, ${d.year}`);
    b.addEventListener('click', () => { S.playing = false; syncPlay(); goTo(i); });
    li.appendChild(b);
    ui.rail.appendChild(li);
  });
  const tickBtns = [...ui.rail.querySelectorAll('button')];
  $('b-in').addEventListener('click', () => go(1));
  $('b-out').addEventListener('click', () => go(-1));
  ui.play.addEventListener('click', togglePlay);
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const notesBtn = $('b-notes');
  const setNotes = (onOff, save) => {
    document.body.classList.toggle('notes-off', !onOff);
    notesBtn.setAttribute('aria-pressed', onOff ? 'true' : 'false');
    if (save) store.set('iloop-notes', onOff ? '1' : '0');
  };
  // the notes start hidden; turning them on is remembered
  setNotes(store.get('iloop-notes') === '1');
  notesBtn.addEventListener('click', () => setNotes(document.body.classList.contains('notes-off'), true));
  const mark = (btn, name, on) => {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', `${name} ${on ? 'on' : 'off'}`);
  };
  const soundSwitch = (btn, name, set, key) => btn.addEventListener('click', () => {
    const on = window.Sound ? set(btn.getAttribute('aria-pressed') !== 'true') : false;
    mark(btn, name, on);
    if (key) store.set(key, on ? '1' : '0');
    touched();
  });
  // music and the voice clips are switched separately
  const musicBtn = $('b-music');
  soundSwitch(musicBtn, 'Music', (on) => Sound.setMusic(on), 'iloop-music');
  soundSwitch($('b-bites'), 'Voice clips', (on) => Sound.setBites(on));
  // The music is on unless you have turned it off. A browser lets a page make sound only after the
  // first click, tap or key (scrolling does not count), so it starts then.
  if (window.Sound && store.get('iloop-music') !== '0') {
    mark(musicBtn, 'Music', true);
    const WAKE = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    const wake = () => {
      for (const e of WAKE) removeEventListener(e, wake, true);
      if (musicBtn.getAttribute('aria-pressed') === 'true' && !Sound.music) Sound.setMusic(true);
    };
    for (const e of WAKE) addEventListener(e, wake, true);
  }
  function togglePlay() {
    S.playing = !S.playing;
    S.playNext = performance.now() + 300;
    S.playArrived = performance.now();
    syncPlay();
    touched();
  }
  function syncPlay() {
    ui.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    ui.play.setAttribute('aria-label', S.playing ? 'Pause' : 'Play');
  }
  function touched() {
    if (S.touched) return;
    S.touched = true;
    ui.hint.classList.add('gone');
  }
  function updateUI() {
    const r = Math.round(S.L);
    const i = mod(r, N);
    if (i !== S.idx) {
      S.idx = i;
      const d = DEV[i], nx = DEV[mod(i + 1, N)];
      ui.year.textContent = d.year;
      ui.idx.textContent = String(i + 1).padStart(2, '0');
      ui.kind.textContent = d.kind;
      ui.title.textContent = d.name;
      document.body.dataset.era = d.era || 'print';
      ui.line.textContent = d.line;
      ui.verb.textContent = d.verb;
      ui.next.textContent = `${nx.name}, ${nx.year}`;
      tickBtns.forEach((b, k) => b.classList.toggle('on', k === i));
    }
    const off = Math.abs(S.L - r);
    ui.cap.style.opacity = String(clamp(1 - off * 5, 0, 1));
    ui.cap.style.transform = `translateY(${(S.L - r) * -14}px)`;
    const pos = mod(S.L, N);
    const x = pos <= N - 1 ? pos / (N - 1) : 1 - (pos - (N - 1));
    ui.cursor.style.left = `${x * 100}%`;
  }

  // ---------- loop ----------
  let resized = true;
  function resize() {
    // 1.5 is all but as sharp as 2 on a Retina screen, at little over half the pixels; ?dpr=2 for full
    const want = Q.has('dpr') ? parseFloat(Q.get('dpr')) : Math.min(1.5, devicePixelRatio || 1);
    DPR = clamp(want * dynScale, 0.75, 3);
    W = innerWidth;
    H = innerHeight;
    VW = Math.round(W * DPR);
    VH = Math.round(H * DPR);
    renderer.setPixelRatio(1);
    renderer.setSize(VW, VH, false);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    sizeKey = `${W}x${H}@${VW}`;
    if (!main) { main = new Real.Pipeline(renderer, VW, VH); aux = new Real.Pipeline(renderer, Math.round(VW / 2), Math.round(VH / 2)); }
    else { main.setSize(VW, VH); aux.setSize(Math.round(VW / 2), Math.round(VH / 2)); if (auxF) auxF.setSize(VW, VH); }
    resized = true;
  }
  let dynScale = 1;
  let auxF = null;
  const auxFull = () => auxF || (auxF = new Real.Pipeline(renderer, VW, VH));
  addEventListener('resize', () => { resize(); });

  const perfEl = PERF ? Object.assign(document.createElement('div'), { className: 'perf' }) : null;
  if (perfEl) document.body.appendChild(perfEl);
  let last = performance.now(), prevL = 0, lastSig = '', frames = 0, slowFrames = 0, fpsAcc = 0, fpsN = 0, idleSince = 0;
  // Render quality: 0 while the view moves, easing back to 1 over a third of a second once it stops.
  // Animated screens tick for a while after you arrive, then hold still, so a page at rest costs nothing.
  let quality = 1, stillSince = 0;
  const SETTLE = 350, ANIMATE_FOR = 8000;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    S.time += dt;
    if (AT !== null) { S.L = S.Lt = AT; }
    else {
      if (S.playing && !S.anim && now > S.playNext) {
        // wait while this machine's sound bite is still to come or playing (then a breath of music),
        // but never hold the loop on one machine for more than 30 s
        if (window.Sound && Sound.busy && Sound.busy() && now - S.playArrived < 30000) S.playNext = now + 1200;
        else {
          go(1);
          const travel = (S.anim ? S.anim.dur : 2200) + 400;
          S.playNext = now + travel + 2400;
          S.playArrived = now + travel;
        }
      }
      if (S.anim) {
        const a = S.anim;
        const u = clamp((now - a.t0) / a.dur, 0, 1);
        S.L = a.from + (a.to - a.from) * easeInOut(u);
        S.Lt = S.L;
        if (u >= 1) { S.anim = null; S.L = S.Lt = a.to; }
      } else {
        const idle = now - S.lastInput > 1100 && pointers.size === 0;
        if (idle) {
          const k = Math.floor(S.Lt), f = S.Lt - k;
          S.Lt = k + (S.dir > 0 ? (f > 0.08 ? 1 : 0) : S.dir < 0 ? (f > 0.92 ? 1 : 0) : Math.round(f));
        }
        const tau = idle ? 0.3 : 0.07;
        S.L += (S.Lt - S.L) * (1 - Math.exp(-dt / tau));
        if (Math.abs(S.Lt - S.L) < 1e-4) S.L = S.Lt;
      }
    }
    const v = (S.L - prevL) / dt;
    S.vel += (v - S.vel) * (1 - Math.exp(-dt / 0.12));
    prevL = S.L;

    // render only when something changed: the level, the window, or a screen that animates
    const K = Math.floor(S.L);
    const A = DEV[mod(K, N)].build();
    const anim = A.M.screens.some((d) => d.o.animate);
    const sig = `${S.L.toFixed(5)}|${sizeKey}`;
    const moving = sig !== lastSig && frames >= 40 && AT === null;
    if (moving) stillSince = now;
    const q = moving ? 0 : clamp((now - stillSince) / SETTLE, 0, 1);
    const settling = q !== quality;
    quality = q;
    const ticking = anim && now - stillSince < ANIMATE_FOR && now - idleSince > 1000 / (A.M.screens[0].o.animate || 10);
    if (sig !== lastSig || resized || frames < 40 || settling || ticking) {
      const t0 = performance.now();
      if (!DEV[mod(K + 1, N)]._snap || DEV[mod(K + 1, N)]._snapKey !== sizeKey) snapshot(DEV[mod(K + 1, N)].build());
      const f = frameFor(S.L);
      present(f);
      lastSig = sig;
      resized = false;
      idleSince = now;
      frames++;
      const ms = performance.now() - t0;
      fpsAcc += ms; fpsN++;
      if (perfEl && fpsN >= 20) { perfEl.textContent = `${(fpsAcc / fpsN).toFixed(1)} ms/frame · ${VW}×${VH} · dpr ${DPR.toFixed(2)}`; fpsAcc = 0; fpsN = 0; }
    }
    updateUI();
    if (window.Sound) {
      const r = Math.round(S.L);
      Sound.update(S.L, !S.anim && Math.abs(S.L - r) < 0.04 ? mod(r, N) : null, now);
    }
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    const h = location.hash.slice(1);
    const found = DEV.findIndex((d) => d.slug === h);
    if (found >= 0) S.L = S.Lt = found;
    if (AT !== null) S.L = S.Lt = AT;
    prevL = S.L;
    const K = Math.floor(S.L);
    DEV[mod(K, N)].build();
    DEV[mod(K + 1, N)].build();
    DEV[mod(K + 2, N)].build();
    snapshot(DEV[mod(K + 2, N)]);
    snapshot(DEV[mod(K + 1, N)]);
    requestAnimationFrame(frame);
    idle(prewarm);
  }

  // While the page is idle, get every machine ready, nearest first: built, its shaders compiled, its
  // textures uploaded, its snapshot rendered (which does all of that), and the full-size buffers a
  // transition's last stretch uses allocated, so travel is smooth from its first frame. A snapshot
  // shows its own next machine on its screen, so one taken before that existed is taken again.
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
  let warmKey = '', warmQ = [];
  function prewarm(deadline) {
    if (warmKey !== sizeKey) {
      warmKey = sizeKey;
      const K = mod(Math.round(S.L), N);
      warmQ = [];
      for (let i = 1; i < N; i++) for (const j of [K + i, K - i + 1]) { const d = DEV[mod(j, N)]; if (!warmQ.includes(d)) warmQ.push(d); }
      warmQ.push('live');
      for (const d of DEV) warmQ.push(d);
    }
    // a step costs a render, so do one per idle period, and only when nothing is moving
    const busy = S.anim || Math.abs(S.Lt - S.L) > 1e-4 || pointers.size;
    if (warmQ.length && !busy && (!deadline || deadline.timeRemaining() > 8 || deadline.didTimeout)) {
      const d = warmQ.shift();
      try {
        if (d === 'live') {
          auxFull();
          const nx = DEV[mod(Math.floor(S.L) + 1, N)];
          if (nx.M) { renderLive(nx, 1, null); renderLive(nx, 0.4, null); }
        } else {
          d.build();
          const nx = DEV[mod(d.index + 1, N)];
          const shows = d.next.type === 'screen' || d.next.type === 'die';
          const complete = !shows || !!(nx._snap && nx._snapKey === sizeKey);
          if (!(d._snap && d._snapKey === sizeKey && (d._snapComplete || !complete))) {
            snapshot(d, true);
            d._snapComplete = complete;
          }
        }
      } catch (e) { console.error(e); }
      // the next frame must redraw the machine in front of you: a snapshot left its screens posed at rest
      lastSig = '';
    }
    if (warmQ.length || warmKey !== sizeKey) idle(prewarm, { timeout: 400 });
    else idle(() => { if (warmKey !== sizeKey) prewarm(); }, { timeout: 2000 });
  }
  addEventListener('resize', () => idle(prewarm, { timeout: 400 }));
  window.machines = { state: S, go, goTo, list: DEV, debug: { restPose, portalPose, portalFrame, stageRect, travel, markWorld, cam } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start);
  else start();
})();
