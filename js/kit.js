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
      if (m.screen && this.glare !== false) {
        m.part('glass');
        m.op((p) => p.withM(m.screen.M, () => glare(p, m.screen.w, m.screen.h)));
      }
      m.render(1000 + idx * 131);
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
  function glare(p, W, H) {
    const L = Math.min(W, H);
    for (let i = 0; i < 3; i++) {
      const o = 0.1 + i * 0.07;
      p.gouge('light', [[W * o, 2], [W * o - L * 0.14, L * 0.22], [2, H * (o + 0.04) + L * 0.14]], [L * 0.03, L * 0.012, L * 0.008][i], { lod: 0.5, taper: 0.02 });
    }
  }

  // A screen on a face. rect is in the face's units; ui = [W, H] are the screen's own units.
  // o.draw(p, W, H) paints what is on it; o.portal = [x, y, s] is the easter egg's square box in ui units.
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
      if (o.draw) o.draw(p, W, H);
    });
    if (o.portal) {
      const [x, y, s] = o.portal;
      F.model.marks.portal = Af.mul(Mui, [s, 0, 0, s, x, y]);
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
        const keys = Array.isArray(row) ? row : Array(row).fill(1);
        const tot = keys.reduce((a, b) => a + Math.abs(b), 0);
        const unit = w / tot;
        let cx = x + (o.stagger ? (r % 2) * unit * 0.25 : 0);
        for (const kw of keys) {
          if (kw < 0) { cx += unit * -kw; continue; }
          const kx = cx + unit * 0.08, ky = y + r * rh + rh * 0.08;
          const kww = unit * kw - unit * 0.16, khh = rh * 0.78;
          if (kx + kww <= x + w + 0.01) {
            p.fill(o.cap || 'umber', rr2(kx, ky, kww, khh, Math.min(kww, khh) * 0.18), 0.5);
            if (o.shadow !== false) p.gouge(o.shadowRole || 'ink', [[kx + 0.05, ky + khh], [kx + kww / 2, ky + khh + 0.04], [kx + kww - 0.05, ky + khh]], 1.6 * k, { lod: 1, taper: 0.2 });
            if (o.hi) p.gouge(o.hi, [[kx + kww * 0.12, ky + khh * 0.18], [kx + kww * 0.88, ky + khh * 0.18]], 0.9 * k, { lod: 1, smooth: false, taper: 0.3 });
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
    menubar(p, W, items, h, o = {}) {
      p.fill(o.bg || 'paper', [[0, 0], [W, 0], [W, h], [0, h]], 0.5);
      p.fill(o.role || 'ink', [[0, h - h * 0.06], [W, h - h * 0.06], [W, h], [0, h]], 0.5);
      let x = o.x0 ?? h * 1.2;
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
