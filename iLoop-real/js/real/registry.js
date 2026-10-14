// registry.js: how a machine file registers its machine, and the builder it builds it with.
// See "Adding or finishing a machine" in the README for the full contract. Machine files must not
// edit this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = global.Real;
  const { G } = Real;

  const list = [];
  const eggs = {};

  class Builder {
    constructor(spec) {
      this.spec = spec;
      this.root = new T.Group();
      this.root.name = spec.slug;
      this.parts = [];
      this.byName = {};
      this.screens = [];
      this.main = null;
      this.marks = {};
      this.state = {};
      this.part('body');
    }
    // A named group of meshes that moves as one: lifts away when you go inside (o.peel), or flies in
    // when the machine assembles (o.fly). Later calls to mesh/add go into the current part.
    part(name, o = {}) {
      let p = this.byName[name];
      if (!p) {
        const group = new T.Group();
        group.name = name;
        this.root.add(group);
        p = { name, group, peel: null, fly: null };
        this.parts.push(p);
        this.byName[name] = p;
      }
      if (o.peel) p.peel = o.peel;
      if (o.fly) p.fly = o.fly;
      this.cur = p;
      return p.group;
    }
    add(obj, to) {
      (to || this.cur.group).add(obj);
      return obj;
    }
    // G.mesh with the current part as the default parent
    mesh(geo, mat, o = {}) {
      const m = G.mesh(geo, mat, o);
      (o.to || this.cur.group).add(m);
      return m;
    }
    group(o = {}) {
      const g = G.group(o);
      (o.to || this.cur.group).add(g);
      return g;
    }
    // A screen. o is Real.Display's options plus: to (the parent object, default the current part),
    // pos and rot (its place in the parent; the glass faces the parent's +z). The first screen is the
    // machine's main screen, M.main, the one that holds the portal (unless o.main is false).
    screen(o) {
      const d = new Real.Display(o);
      G.place(d.mesh, o);
      (o.to || this.cur.group).add(d.mesh);
      this.screens.push(d);
      if (!this.main && o.main !== false) this.main = d;
      return d;
    }
    // A rectangle the camera can travel to: a chip's top. object: the mesh or group it is on;
    // center: its centre in the object's own coordinates; x, y: its right and up directions there
    // (the camera looks down the normal x × y); w, h: its size in mm.
    mark(name, object, o) {
      this.marks[name] = {
        object,
        center: new T.Vector3(...(o.center || [0, 0, 0])),
        x: new T.Vector3(...(o.x || [1, 0, 0])).normalize(),
        y: new T.Vector3(...(o.y || [0, 0, -1])).normalize(),
        w: o.w,
        h: o.h,
        display: o.display || null,
      };
      return this.marks[name];
    }
  }

  // Register a machine. The order of the files in index.html is the order of the loop.
  function add(spec) {
    spec.index = list.length;
    spec.slug = spec.slug || spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    spec.next = spec.next || { type: 'screen' };
    spec.build = function () {
      if (this.M) return this;
      const M = new Builder(this);
      this.M = M;
      this.make(M, Real);
      M.root.updateMatrixWorld(true);
      // remember where every part belongs
      for (const p of M.parts) {
        p.home = { pos: p.group.position.clone(), quat: p.group.quaternion.clone(), scale: p.group.scale.clone() };
      }
      // the box the camera frames: everything but what asks to be left out
      const box = new T.Box3();
      M.root.traverse((o) => {
        if (!o.isMesh || o.userData.noFit) return;
        let skip = false;
        for (let q = o; q; q = q.parent) if (q.userData && q.userData.noFit) skip = true;
        if (!skip) box.expandByObject(o);
      });
      if (this.fitBox) box.set(new T.Vector3(...this.fitBox[0]), new T.Vector3(...this.fitBox[1]));
      M.box = box;
      const set = Real.makeSet(box, this.set || {});
      set.scene.add(M.root);
      M.scene = set.scene;
      M.set = set;
      M.root.traverse((o) => {
        if (o.isMesh && o.castShadow === undefined) o.castShadow = true;
      });
      if (this.pose) this.pose(M, {});
      return this;
    };
    list.push(spec);
    return spec;
  }

  // An easter egg that is an event rather than a picture (the 1984 hammer, the Mail envelope, Time
  // Machine's clock). fn(api) is called every frame while you travel from the machine whose screen
  // holds it to the next one; see the README.
  function egg(name, fn) { eggs[name] = fn; }

  Real.add = add;
  Real.egg = egg;
  Real.eggs = eggs;
  Real.list = list;
  Real.Builder = Builder;
})(window);
