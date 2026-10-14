// Entry for vendor/three.bundle.js: three.js core plus the addons iLoop-real uses, as one classic
// script that sets window.THREE (so index.html opens from file:// with no server).
import * as CORE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LoftGeometry } from 'three/addons/geometries/LoftGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const THREE = Object.assign({}, CORE, {
  RoundedBoxGeometry, LoftGeometry, RoomEnvironment, EffectComposer, RenderPass, ShaderPass, GTAOPass,
  UnrealBloomPass, BokehPass, OutputPass, SMAAPass, FullScreenQuad, Pass, BufferGeometryUtils,
  RectAreaLightUniformsLib, SVGLoader,
});
window.THREE = THREE;
