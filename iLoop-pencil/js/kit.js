// kit.js: the machine registry and the shared pieces machines are drawn from: screens with an
// easter egg hidden in them, keyboards, vents, and period screen furniture (icons, menu bars, windows).
'use strict';

(function (global) {
  const { rr2, ell2 } = Shapes;
  const PI = Math.PI;

  const list = [];
  function add(spec) {
    const idx = list.length;
    spec.index = idx;
    spec.build = function () {
      if (this.parts) return this;
      const m = new Model(this.view, { fit: this.fit, center: this.center });
      this.model = m;
      this.make(m, Kit);
      m.render(1000 + idx * 131);
      // the screen is only known once the machine is drawn: its reflections go on a sheet of glass
      if (m.screen && this.glare !== false) {
        const p = new Ink.Plate(7000 + idx * 13);
        p.withM(m.screen.M, () => glare(p, m.screen.w, m.screen.h));
        m.parts.push({ name: 'glass', plate: p, ops: [], c: [500, 500] });
      }
      this.parts = m.parts;
      this.marks = m.marks;
      this.screen = m.screen;
      // a chip on this machine's board that is drawn again, larger, as the next machine
      if (this.next.align) {
        const nx = list[(idx + 1) % list.length].build();
        this.marks.portal = Af.chain(this.marks.chip, Af.inv(nx.marks.self), Af.S(1000));
        this.marks.clip = this.marks.chip;
      }
      return this;
    };
    list.push(spec);
    return spec;
  }

  // ---------- marks shared by many machines ----------
  // Reflections on the glass, the way a designer puts them on a screen: two bands swept diagonally
  // across it, a soft white rub with a few strokes of white pencil along each.
  function glare(p, W, H) {
    const L = Math.min(W, H), k = p.unit();
    const d = [-0.48, 1];
    p.withClip([0, 0, W, H], () => {
      for (const [o, bw, len, a, n] of [[0.12, 0.16, 1.25, 0.2, 4], [0.36, 0.05, 0.95, 0.15, 2]]) {
        const x0 = W * o, x1 = x0 + L * bw, l = L * len;
        p.sheen([[x0, 0], [x1, 0], [x1 + d[0] * l, d[1] * l], [x0 + d[0] * l, d[1] * l]], a);
        for (let i = 0; i < n; i++) {
          const sx = x0 + (x1 - x0) * ((i + 0.5) / n), f = p.rand(0.45, 0.95);
          p.pencil([[sx, 0], [sx + d[0] * l * f, d[1] * l * f]], { role: 'chalk', w: p.rand(0.8, 1.5) / k, over: 0, wob: 0.2, lod: 0.5, alpha: 0.75 });
        }
      }
    });
  }

  // A screen on a face. rect is in the face's units; ui = [W, H] are the screen's own units.
  // o.draw(p, W, H) paints what is on it; o.portal = [x, y, s] is the square the next machine is drawn
  // into, in ui units (the machine's own 1000 × 1000 frame).
  function screen(F, rect, o) {
    const [u, v, w, h] = rect;
    const p = F.p;
    const [W, H] = o.ui;
    if (o.bezel) {
      const b = o.bezelW ?? 0.6;
      F.draw(() => {
        p.fill(o.bezel, rr2(u - b, v - b, w + 2 * b, h + 2 * b, (o.r || 0) + b));
      });
    }
    const Mui = Af.mul(F.M, [w / W, 0, 0, h / H, u, v]);
    F.model.screen = { M: Mui, w: W, h: H };
    p.withM(Mui, () => {
      p.fill(o.bg || 'ink', rr2(0, 0, W, H, (o.r || 0) * (W / w)), 0);
      if (o.draw) p.withClip([0, 0, W, H], () => o.draw(p, W, H));
    });
    if (o.portal) {
      const [x, y, s] = o.portal;
      F.model.marks.portal = Af.mul(Mui, [s, 0, 0, s, x, y]);
      // o.clip = [x, y, w, h] is the window the machine is seen through (the portal square if left out);
      // o.round makes that window a circle
      if (o.clip) F.model.marks.clip = Af.mul(Mui, [o.clip[2], 0, 0, o.clip[3], o.clip[0], o.clip[1]]);
      if (o.round) F.model.marks.clipShape = 'circle';
    }
  }

  // Keycaps on a face: rows of [count, widthFactor?] with a gap; units are the face's.
  function keyboard(F, x, y, w, h, rows, o = {}) {
    const p = F.p;
    const k = F.px(1);
    F.draw(() => {
      if (o.well) p.fill(o.well, rr2(x - 0.3, y - 0.3, w + 0.6, h + 0.6, 0.3));
      const rh = h / rows.length;
      rows.forEach((row, r) => {
        const names = o.legends ? o.legends[r] || [] : [];
        let ki = 0;
        const keys = Array.isArray(row) ? row : Array(row).fill(1);
        const tot = keys.reduce((a, b) => a + Math.abs(b), 0);
        const unit = w / tot;
        let cx = x + (o.stagger ? (r % 2) * unit * 0.25 : 0);
        for (const kw of keys) {
          if (kw < 0) { cx += unit * -kw; continue; }
          const kx = cx + unit * 0.08, ky = y + r * rh + rh * 0.08;
          const kww = unit * kw - unit * 0.16, khh = rh * 0.78;
          const name = names[ki++];
          if (kx + kww <= x + w + 0.01) {
            p.fill(o.cap || 'umber', rr2(kx, ky, kww, khh, Math.min(kww, khh) * 0.18), 0.5);
            // the legend printed on the key: centred if one character, top left if a word
            if (name) {
              const one = name.length <= 1;
              p.text(o.legendRole || 'ink', name, one ? kx + kww / 2 : kx + kww * 0.12, ky + khh * (one ? 0.48 : 0.36), khh * (one ? 0.42 : 0.24), { align: one ? 'center' : 'left', lod: 1.2, weight: 500 });
            }
            if (o.shadow !== false) p.gouge(o.shadowRole || 'ink', [[kx + 0.05, ky + khh], [kx + kww / 2, ky + khh + 0.04], [kx + kww - 0.05, ky + khh]], 1.6 * k, { lod: 1, taper: 0.2 });
            if (o.hi) {
              // light catches the top and left of each cap
              p.gouge(o.hi, [[kx + kww * 0.1, ky + khh * 0.12], [kx + kww * 0.9, ky + khh * 0.12]], 1.1 * k, { lod: 1, smooth: false, taper: 0.3 });
              p.gouge(o.hi, [[kx + kww * 0.08, ky + khh * 0.2], [kx + kww * 0.08, ky + khh * 0.82]], 0.8 * k, { lod: 1, smooth: false, taper: 0.4 });
            }
          }
          cx += unit * kw;
        }
      });
    });
  }

  function slots(F, x, y, w, h, n, o = {}) {
    const p = F.p;
    F.draw(() => {
      for (let i = 0; i < n; i++) {
        const sx = x + (i * w) / n;
        p.fill(o.role || 'ink', o.vertical === false ? rr2(x, y + (i * h) / n, w, (h / n) * 0.5, 0.1) : rr2(sx, y, (w / n) * 0.45, h, (w / n) * 0.2), 0.5);
      }
    });
  }

  function text(F, str, x, y, size, o = {}) {
    F.draw(() => F.p.text(o.role || 'ink', str, x, y, size, { lod: o.lod ?? 1, ...o }));
  }

  // The logo's outline from the standard vector drawing of it (814 × 1000, y down), flattened into
  // polygons and scaled so it is 1.3 tall, centred on the origin: the body with its bite, and the leaf.
  const APPLE_PATH = 'M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z';
  let APPLE = null;
  function appleShape() {
    if (APPLE) return APPLE;
    const tokens = APPLE_PATH.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g);
    const subs = [];
    let cur = null, x = 0, y = 0, sx = 0, sy = 0, lc = null, cmd = '', i = 0;
    const num = () => parseFloat(tokens[i++]);
    const cubic = (x1, y1, x2, y2, x3, y3) => {
      for (let k = 1; k <= 10; k++) {
        const t = k / 10, u = 1 - t;
        cur.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]);
      }
      lc = [x2, y2]; x = x3; y = y3;
    };
    while (i < tokens.length) {
      if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
      const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      switch (cmd.toLowerCase()) {
        case 'm': x = ox + num(); y = oy + num(); sx = x; sy = y; cur = [[x, y]]; subs.push(cur); cmd = rel ? 'c' : 'C'; lc = null; break;
        case 'c': { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; cubic(...a); break; }
        case 's': { const r1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; const a = [ox + num(), oy + num(), ox + num(), oy + num()]; cubic(r1[0], r1[1], ...a); break; }
        case 'z': x = sx; y = sy; lc = null; break;
        default: i++;
      }
    }
    // the drawing spans x 0–814 and y 0–1000; centre it and make it 1.3 tall
    const k = 1.3 / 1000;
    const norm = (pts) => pts.map(([px, py]) => [(px - 407) * k, (py - 500) * k]);
    APPLE = { body: norm(subs[0]), leaf: norm(subs[1]) };
    return APPLE;
  }

  // ---------- period screen furniture, drawn in a screen's own units ----------
  const Icons = {
    // a 1-bit icon: a label under a framed pictogram
    label(p, x, y, s, str, role = 'ink', bg = 'paper') {
      const fs = s * 0.24, w = str.length * fs * 0.62 + fs * 0.6;
      p.fill(bg, rr2(x - w / 2, y + s * 1.0, w, fs * 1.35, fs * 0.2), 0.5);
      p.text(role, str, x, y + s * 1.0 + fs * 0.7, fs, { font: 'mono', weight: 500, lod: 0.5 });
    },
    disk(p, x, y, s, role = 'ink', bg = 'paper') {
      p.fill(bg, rr2(x - s * 0.36, y, s * 0.72, s * 0.8, s * 0.04), 0.5);
      p.ring(role, rr2(x - s * 0.36, y, s * 0.72, s * 0.8, s * 0.04), s * 0.04, 0.5);
      p.fill(role, rr2(x - s * 0.2, y + s * 0.02, s * 0.36, s * 0.24, 0.5), 0.5);
      p.ring(role, rr2(x - s * 0.24, y + s * 0.42, s * 0.48, s * 0.34, 0.5), s * 0.03, 0.5);
    },
    hd(p, x, y, s, role = 'ink', bg = 'paper') {
      p.fill(bg, rr2(x - s * 0.42, y + s * 0.3, s * 0.84, s * 0.38, s * 0.04), 0.5);
      p.ring(role, rr2(x - s * 0.42, y + s * 0.3, s * 0.84, s * 0.38, s * 0.04), s * 0.04, 0.5);
      p.fill(role, ell2(x + s * 0.3, y + s * 0.56, s * 0.04, s * 0.04, 8), 0.5);
    },
    trash(p, x, y, s, role = 'ink', bg = 'paper') {
      p.fill(bg, [[x - s * 0.28, y + s * 0.16], [x + s * 0.28, y + s * 0.16], [x + s * 0.22, y + s * 0.84], [x - s * 0.22, y + s * 0.84]], 0.5);
      p.ring(role, [[x - s * 0.28, y + s * 0.16], [x + s * 0.28, y + s * 0.16], [x + s * 0.22, y + s * 0.84], [x - s * 0.22, y + s * 0.84]], s * 0.04, 0.5);
      p.fill(role, rr2(x - s * 0.34, y + s * 0.06, s * 0.68, s * 0.08, 0.5), 0.5);
      for (const dx of [-0.1, 0, 0.1]) p.fill(role, rr2(x + dx * s - s * 0.012, y + s * 0.28, s * 0.024, s * 0.46, 0.2), 0.5);
    },
    // The Apple logo as a shape (so it prints anywhere, not only where the system font has it): two
    // lobes over a rounded body, the dip at the top and bottom, the bite, and the leaf. Rainbow-striped
    // for the 1977–1998 logo, one colour otherwise. size is its height; (x, y) its centre.
    apple(p, x, y, size, o = {}) {
      const { body, leaf } = appleShape();
      const k = size / 1.3;
      const at = (q) => [x + q[0] * k, y + q[1] * k];
      const B = body.map(at), Lf = leaf.map(at);
      if (!o.rainbow) { p.fill(o.role || 'ink', B, o.lod ?? 0.5); p.fill(o.role || 'ink', Lf, o.lod ?? 0.5); return; }
      const bands = ['#61bb46', '#fdb827', '#f5821f', '#e03a3e', '#963d97', '#009ddc'];
      const top = y - size * 0.5, hgt = size;
      // withClip takes corners: [x0, y0, x1, y1]
      bands.forEach((c, i) => p.withClip([x - size, top + (hgt * i) / 6, x + size, top + (hgt * (i + 1)) / 6 + 0.02], () => { p.fill(c, B, 0.5); p.fill(c, Lf, 0.5); }));
    },
    menubar(p, W, items, h, o = {}) {
      p.fill(o.bg || 'paper', [[0, 0], [W, 0], [W, h], [0, h]], 0.5);
      p.fill(o.role || 'ink', [[0, h - h * 0.06], [W, h - h * 0.06], [W, h], [0, h]], 0.5);
      // the Apple menu, then the application's menus
      Icons.apple(p, h * 0.95, h * 0.5, h * 0.74, { rainbow: o.rainbow, role: o.role });
      let x = o.x0 ?? h * 1.8;
      for (const it of items) {
        p.text(o.role || 'ink', it, x, h * 0.52, h * 0.62, { font: o.font || 'mono', weight: 600, align: 'left', lod: 0.5 });
        x += (it.length + 1.6) * h * 0.38;
      }
    },
    window(p, x, y, w, h, title, o = {}) {
      const bar = o.bar ?? 14;
      p.fill(o.bg || 'paper', [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 0.5);
      p.ring(o.role || 'ink', [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o.line ?? 1, 0.5);
      if (o.stripes !== false) for (let i = 2; i < bar - 2; i += 2.2) p.fill(o.role || 'ink', [[x + 3, y + i], [x + w - 3, y + i], [x + w - 3, y + i + 0.8], [x + 3, y + i + 0.8]], 1);
      p.fill(o.bg || 'paper', [[x + w / 2 - title.length * bar * 0.3, y + 1], [x + w / 2 + title.length * bar * 0.3, y + 1], [x + w / 2 + title.length * bar * 0.3, y + bar - 1], [x + w / 2 - title.length * bar * 0.3, y + bar - 1]], 1);
      p.text(o.role || 'ink', title, x + w / 2, y + bar / 2, bar * 0.62, { font: 'mono', weight: 600, lod: 0.5 });
      p.fill(o.role || 'ink', [[x, y + bar], [x + w, y + bar], [x + w, y + bar + 0.8], [x, y + bar + 0.8]], 0.5);
    },
    // a 50% dither, the grey desktop of a 1-bit Mac
    dither(p, x, y, w, h, step, role = 'ink') {
      for (let j = 0, yy = y; yy < y + h; yy += step, j++) {
        for (let xx = x + (j % 2) * step; xx < x + w; xx += step * 2) p.fill(role, [[xx, yy], [xx + step * 0.6, yy], [xx + step * 0.6, yy + step * 0.6], [xx, yy + step * 0.6]], 1);
      }
    },
  };

  const Kit = { add, screen, keyboard, slots, text, glare, Icons, rr2, ell2, PI };
  global.Machines = { list, add };
  global.Kit = Kit;
})(window);
