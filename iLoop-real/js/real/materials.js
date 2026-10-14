// materials.js: physically based materials for the machines, and procedural surface texture.
// Real.Mat.<name>(options) returns a THREE material. Surfaces get their fine texture (the stipple of
// moulded ABS, the grain of blasted aluminium, brush lines) from noise in the object's own space,
// so it needs no UVs and holds up at any zoom. Shared by every machine. Machine files must not edit
// this file.
'use strict';

(function (global) {
  const T = global.THREE;
  const Real = global.Real;

  // 3D value noise with its gradient (by central differences), and a two-octave fbm of it.
  const NOISE = `
    float rr_h(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float rr_n(vec3 x) {
      vec3 i = floor(x), f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(rr_h(i), rr_h(i + vec3(1, 0, 0)), f.x), mix(rr_h(i + vec3(0, 1, 0)), rr_h(i + vec3(1, 1, 0)), f.x), f.y),
                 mix(mix(rr_h(i + vec3(0, 0, 1)), rr_h(i + vec3(1, 0, 1)), f.x), mix(rr_h(i + vec3(0, 1, 1)), rr_h(i + vec3(1, 1, 1)), f.x), f.y), f.z);
    }
    float rr_f(vec3 x) { return rr_n(x) * 0.65 + rr_n(x * 2.13 + 17.1) * 0.35; }
  `;

  // Adds micro texture to a MeshStandard/Physical material.
  // o.size: feature size in mm; o.bump: strength of the normal perturbation; o.rough: roughness
  // variation; o.stretch: scales noise per axis ([0.02, 1, 1] draws brush lines along x);
  // o.tone: colour variation (mottling), as a fraction.
  function micro(mat, o = {}) {
    const size = o.size ?? 0.35, bump = o.bump ?? 0.25, rough = o.rough ?? 0.15, tone = o.tone ?? 0;
    const st = o.stretch || [1, 1, 1];
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uMicro = { value: new T.Vector4(1 / size, bump, rough, tone) };
      sh.uniforms.uStretch = { value: new T.Vector3(...st) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vObjPos;\nuniform vec4 uMicro;\nuniform vec3 uStretch;\nuniform mat3 normalMatrix;\n${NOISE}`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          vec3 mP = vObjPos * uMicro.x * uStretch;
          float mN = rr_f(mP);
          roughnessFactor = clamp(roughnessFactor * (1.0 + uMicro.z * (mN - 0.5) * 2.0), 0.02, 1.0);`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            float e = 0.35;
            vec3 g = vec3(rr_f(mP + vec3(e, 0, 0)) - rr_f(mP - vec3(e, 0, 0)), rr_f(mP + vec3(0, e, 0)) - rr_f(mP - vec3(0, e, 0)), rr_f(mP + vec3(0, 0, e)) - rr_f(mP - vec3(0, 0, e))) / (2.0 * e);
            g *= uStretch;
            vec3 gv = normalMatrix * g;
            // fade the texture out where it is finer than a pixel, so it shimmers neither near nor far
            float px = length(fwidth(mP));
            float k = uMicro.y * (1.0 - smoothstep(0.6, 1.6, px));
            normal = normalize(normal - k * (gv - dot(gv, normal) * normal));
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= 1.0 + uMicro.w * (rr_f(vObjPos * uMicro.x * 0.07 * uStretch + 3.7) - 0.5) * 2.0;`);
    };
    mat.customProgramCacheKey = () => 'micro';
    return mat;
  }

  const cache = new Map();
  const keyed = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };
  const col = (c) => new T.Color(c);

  const Mat = {
    micro,
    // moulded ABS with its fine stipple (the Mac, the Apple II, keycaps)
    abs(color, o = {}) {
      return keyed(`abs${color}${JSON.stringify(o)}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: o.rough ?? 0.58, metalness: 0, sheen: o.sheen ?? 0.15, sheenRoughness: 0.6, sheenColor: col('#ffffff') }), { size: o.grain ?? 0.22, bump: o.bump ?? 0.35, rough: 0.25, tone: o.tone ?? 0.012 }));
    },
    // smooth plastic (keycaps that wore glossy, a phone's plastic back)
    plastic(color, o = {}) {
      return keyed(`pl${color}${JSON.stringify(o)}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: o.rough ?? 0.32, metalness: 0, clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.2 }), { size: 0.5, bump: o.bump ?? 0.06, rough: 0.12 }));
    },
    // bead-blasted anodised aluminium (the unibody Macs, the watch, the iPhone's back)
    alu(color = '#c9cacc', o = {}) {
      return keyed(`alu${color}${JSON.stringify(o)}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: o.rough ?? 0.34, metalness: 1 }), { size: 0.05, bump: 0.12, rough: 0.2 }));
    },
    // brushed metal: lines along the axis given by o.axis ('x' | 'y' | 'z')
    brushed(color = '#cfd0d2', o = {}) {
      const st = { x: [0.015, 1, 1], y: [1, 0.015, 1], z: [1, 1, 0.015] }[o.axis || 'x'];
      return keyed(`br${color}${JSON.stringify(o)}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: o.rough ?? 0.26, metalness: 1 }), { size: 0.05, bump: 0.35, rough: 0.5, stretch: st }));
    },
    chrome(o = {}) {
      return keyed(`chrome${JSON.stringify(o)}`, () => new T.MeshPhysicalMaterial({ color: col(o.color || '#f2f2f2'), roughness: o.rough ?? 0.05, metalness: 1 }));
    },
    // polished steel, a little warmer and softer than chrome
    steel(o = {}) {
      return keyed(`steel${JSON.stringify(o)}`, () => new T.MeshPhysicalMaterial({ color: col(o.color || '#d8d6d2'), roughness: o.rough ?? 0.12, metalness: 1 }));
    },
    rubber(color = '#1d1d1d') {
      return keyed(`rub${color}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: 0.86, metalness: 0 }), { size: 0.3, bump: 0.2, rough: 0.1 }));
    },
    // a black glass front (phone, watch, modern displays) over whatever the screen shows
    glass(o = {}) {
      return keyed(`glass${JSON.stringify(o)}`, () => new T.MeshPhysicalMaterial({ color: col(o.color || '#050506'), roughness: o.rough ?? 0.03, metalness: 0, ior: 1.52, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02 }));
    },
    // clear glass or polycarbonate you can see through
    clear(o = {}) {
      return keyed(`clear${JSON.stringify(o)}`, () => new T.MeshPhysicalMaterial({ color: col(o.color || '#ffffff'), roughness: o.rough ?? 0.05, metalness: 0, transmission: o.transmission ?? 1, thickness: o.thickness ?? 2, ior: o.ior ?? 1.5, attenuationColor: col(o.tint || '#ffffff'), attenuationDistance: o.depth ?? 1e9, transparent: false }));
    },
    // translucent coloured polycarbonate (the iMac G3's shell)
    translucent(color, o = {}) {
      return keyed(`tl${color}${JSON.stringify(o)}`, () => new T.MeshPhysicalMaterial({ color: col('#ffffff'), roughness: o.rough ?? 0.22, metalness: 0, transmission: o.transmission ?? 0.82, thickness: o.thickness ?? 3, ior: 1.58, attenuationColor: col(color), attenuationDistance: o.depth ?? 6, clearcoat: o.clearcoat ?? 0.6, clearcoatRoughness: 0.1 }));
    },
    // black epoxy chip packages, white ceramic packages
    epoxy(color = '#1b1b1c') {
      return keyed(`ep${color}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: 0.62, metalness: 0 }), { size: 0.08, bump: 0.3, rough: 0.2 }));
    },
    ceramic(color = '#ecebe6') {
      return keyed(`cer${color}`, () => micro(new T.MeshPhysicalMaterial({ color: col(color), roughness: 0.45, metalness: 0, clearcoat: 0.2 }), { size: 0.06, bump: 0.15, rough: 0.2 }));
    },
    gold() {
      return keyed('gold', () => new T.MeshPhysicalMaterial({ color: col('#f1c35a'), roughness: 0.22, metalness: 1 }));
    },
    tin() {
      return keyed('tin', () => new T.MeshPhysicalMaterial({ color: col('#c9c8c4'), roughness: 0.3, metalness: 1 }));
    },
    // a dark slot or hole: almost no light comes back out of it
    hole(color = '#050505') {
      return keyed(`hole${color}`, () => new T.MeshStandardMaterial({ color: col(color), roughness: 1, metalness: 0 }));
    },
    // a printed or painted surface from a canvas (labels, legends, silkscreen, PCBs).
    // draw(ctx, w, h) paints it; o.w × o.h is its size in canvas pixels.
    printed(draw, o = {}) {
      const tex = Real.Mat.canvasTexture(draw, o.w || 512, o.h || 512);
      const m = new T.MeshPhysicalMaterial({ map: tex, roughness: o.rough ?? 0.5, metalness: o.metal ?? 0, transparent: !!o.alpha, alphaTest: o.alpha ? 0.02 : 0, clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.25, polygonOffset: !!o.decal, polygonOffsetFactor: o.decal ? -2 : 0, polygonOffsetUnits: o.decal ? -2 : 0, depthWrite: !o.alpha });
      return o.micro ? micro(m, o.micro) : m;
    },
    canvasTexture(draw, w, h, o = {}) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      draw(g, w, h);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 8;
      if (o.nearest) { tex.magFilter = T.NearestFilter; }
      return tex;
    },
  };
  Real.Mat = Mat;
})(window);
