import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

import {
  ARCS_FRAG,
  ARCS_VERT,
  HALO_FRAG,
  HALO_VERT,
  POINTS_FRAG,
  POINTS_VERT,
} from './shaders.js';
import { DESTINATIONS, ORIGIN } from './cities.js';

const RADIUS = 100;
const MASK_URL = '/land-mask.png';

/* ------------------------------------------------------------------
   Outils geometriques
   ------------------------------------------------------------------ */

/** Latitude et longitude vers un point de la sphere de rayon r. */
function latLonToVec3(lat, lon, r, out = {}) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const s = Math.sin(phi);
  out.x = -r * s * Math.cos(theta);
  out.y = r * Math.cos(phi);
  out.z = r * s * Math.sin(theta);
  return out;
}

/**
 * Lit le masque des continents et renvoie un test « ce point est-il
 * sur la terre ferme ? ». Le masque vient de Natural Earth, domaine
 * public, et est servi depuis ce site — aucune requete exterieure.
 */
async function loadLandMask() {
  const img = new Image();
  img.src = MASK_URL;
  img.decoding = 'async';
  await img.decode();

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, w, h).data;

  // On compacte en un octet par pixel : quatre fois moins de memoire
  // a parcourir pendant le tirage des points.
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    mask[i] = rgba[p] > 127 ? 1 : 0;
  }

  return function isLand(lat, lon) {
    const x = (((lon + 180) / 360) * w) | 0;
    const y = (((90 - lat) / 180) * h) | 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    return mask[y * w + x] === 1;
  };
}

/**
 * Sonde la sphere selon la suite de Fibonacci — la repartition la
 * plus reguliere possible — et ne retient que les points tombant sur
 * la terre ferme, jusqu'a en obtenir le nombre demande.
 */
function buildLandPoints(isLand, wanted) {
  // Les terres couvrent environ 29 % du globe : on sonde en
  // consequence, avec une marge.
  const samples = Math.ceil(wanted / 0.27);
  const golden = Math.PI * (3 - Math.sqrt(5));

  const positions = [];
  const seeds = [];
  const tmp = {};

  for (let i = 0; i < samples && positions.length < wanted * 3; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (((golden * i) % (2 * Math.PI)) * 180) / Math.PI - 180;

    if (!isLand(lat, lon)) continue;

    latLonToVec3(lat, lon, RADIUS, tmp);
    positions.push(tmp.x, tmp.y, tmp.z);
    seeds.push(Math.random());
  }

  // Abidjan ferme la liste : c'est le dernier point, donc le seul
  // marque par l'attribut de ville.
  latLonToVec3(ORIGIN.lat, ORIGIN.lon, RADIUS * 1.004, tmp);
  positions.push(tmp.x, tmp.y, tmp.z);
  seeds.push(0.5);

  const count = seeds.length;
  const pos = new Float32Array(positions);
  const seed = new Float32Array(seeds);
  const city = new Float32Array(count);
  city[count - 1] = 1;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  geo.setAttribute('aCity', new BufferAttribute(city, 1));
  return { geo, count };
}

/**
 * Construit tous les arcs dans une seule geometrie : douze trajets,
 * un seul appel de rendu.
 */
function buildArcs(segments) {
  const a = latLonToVec3(ORIGIN.lat, ORIGIN.lon, 1, {});

  const positions = [];
  const ts = [];
  const phases = [];
  const tmp = {};

  DESTINATIONS.forEach((dest, index) => {
    const b = latLonToVec3(dest.lat, dest.lon, 1, {});

    // Angle entre les deux villes : plus elles sont loin, plus l'arc
    // monte haut.
    const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
    const omega = Math.acos(dot);
    const lift = RADIUS * (0.16 + 0.30 * (omega / Math.PI));
    const sinOmega = Math.sin(omega) || 1e-6;
    const phase = index / DESTINATIONS.length;

    let prev = null;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;

      // Interpolation sur le grand cercle, puis elevation.
      const k1 = Math.sin((1 - t) * omega) / sinOmega;
      const k2 = Math.sin(t * omega) / sinOmega;
      const r = RADIUS + Math.sin(t * Math.PI) * lift;

      tmp.x = (a.x * k1 + b.x * k2) * r;
      tmp.y = (a.y * k1 + b.y * k2) * r;
      tmp.z = (a.z * k1 + b.z * k2) * r;

      if (prev) {
        positions.push(prev.x, prev.y, prev.z, tmp.x, tmp.y, tmp.z);
        ts.push(prev.t, t);
        phases.push(phase, phase);
      }
      prev = { x: tmp.x, y: tmp.y, z: tmp.z, t };
    }
  });

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('aT', new BufferAttribute(new Float32Array(ts), 1));
  geo.setAttribute('aPhase', new BufferAttribute(new Float32Array(phases), 1));
  return geo;
}

/** Trois ondes concentriques au-dessus d'Abidjan. */
function buildHalo() {
  const p = latLonToVec3(ORIGIN.lat, ORIGIN.lon, RADIUS * 1.004, {});
  const n = 3;
  const pos = new Float32Array(n * 3);
  const phases = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
    phases[i] = i / n;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new BufferAttribute(phases, 1));
  return geo;
}

/* ------------------------------------------------------------------
   Scene
   ------------------------------------------------------------------ */

/**
 * Monte le globe dans le canevas fourni et renvoie une poignee de
 * commandes. Tout est nettoyable : voir destroy().
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {string} options.accent   couleur d'accent, en hexadecimal
 * @param {string} options.base     couleur des terres
 * @param {object} options.quality  { points, maxPixelRatio, segments }
 */
export async function createGlobe({ canvas, accent, base, quality }) {
  const isLand = await loadLandMask();

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false, // inutile pour des points ronds, et couteux
    powerPreference: 'high-performance',
  });
  renderer.setClearAlpha(0);

  const scene = new Scene();
  // On coupe la mise a jour automatique des matrices : c'est du temps
  // processeur depense chaque image pour des objets qui ne bougent pas.
  scene.matrixWorldAutoUpdate = false;
  const camera = new PerspectiveCamera(32, 1, 1, 2000);
  camera.position.set(0, 0, 520);

  // Un groupe porte la rotation : la geometrie, elle, ne bouge jamais.
  const globe = new Group();
  scene.add(globe);

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 2.6 },
    uPixelRatio: { value: 1 },
    uDissolve: { value: 0 },
    uFade: { value: 1 },
    uColor: { value: new Color(base) },
    uAccent: { value: new Color(accent) },
  };

  const { geo: pointsGeo, count } = buildLandPoints(isLand, quality.points);
  const pointsMat = new ShaderMaterial({
    uniforms,
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  globe.add(new Points(pointsGeo, pointsMat));

  const haloMat = new ShaderMaterial({
    uniforms,
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  globe.add(new Points(buildHalo(), haloMat));

  const arcsGeo = buildArcs(quality.segments);
  const arcsMat = new ShaderMaterial({
    uniforms,
    vertexShader: ARCS_VERT,
    fragmentShader: ARCS_FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  globe.add(new LineSegments(arcsGeo, arcsMat));

  // Abidjan face a l'observateur au premier regard.
  globe.rotation.y = -((ORIGIN.lon + 180) * Math.PI) / 180 + Math.PI * 0.5;
  globe.rotation.x = 0.12;

  /* --- Etat de l'animation --------------------------------------- */

  const state = {
    spin: globe.rotation.y,
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    dragVX: 0,
    dragVY: 0,
    dragging: false,
    scroll: 0,
    running: false,
    visible: true,
    onScreen: true,
    lastTime: 0,
    frame: 0,
    lastRender: 0,
    minFrameMs: quality.minFrameMs || 0,
  };

  let width = 1;
  let height = 1;
  let pixelRatio = 1;

  function resize(w, h) {
    width = Math.max(1, w);
    height = Math.max(1, h);
    pixelRatio = Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    // Le globe garde la meme presence quelle que soit la largeur.
    const shrink = Math.min(1, width / 900);
    camera.position.z = 520 + (1 - shrink) * 300;
    camera.updateProjectionMatrix();

    // Sur grand ecran il se range a droite, dans la zone que le texte
    // du hero laisse libre ; en dessous, il reprend le centre.
    const wide = width >= 1000;
    globe.position.x = wide ? RADIUS * 1.12 : 0;
    globe.position.y = wide ? 0 : -RADIUS * 0.1;

    uniforms.uPixelRatio.value = pixelRatio;
  }

  /* --- Boucle ----------------------------------------------------- */

  function render(now) {
    if (!state.running) return;
    state.frame = requestAnimationFrame(render);

    // Cadence plafonnee : on rend la main sans rien calculer.
    if (state.minFrameMs > 0 && now - state.lastRender < state.minFrameMs) return;
    state.lastRender = now;

    const t = now * 0.001;
    const dt = state.lastTime ? Math.min(0.05, t - state.lastTime) : 0.016;
    state.lastTime = t;

    uniforms.uTime.value = t;

    // Rotation continue, plus l'inertie laissee par un glisser.
    if (!state.dragging) {
      state.spin += dt * 0.055 + state.dragVX;
      state.dragVX *= 0.94;
      state.dragVY *= 0.94;
      state.targetY += state.dragVY;
      // Rappel doux vers l'horizontale
      state.targetY += (0 - state.targetY) * dt * 0.6;
    }

    // Suivi de la souris : une inclinaison legere, amortie.
    const wantX = state.pointerY * 0.22 + state.targetY;
    const wantY = state.pointerX * 0.26;
    globe.rotation.x += (state.targetX + wantX - globe.rotation.x) * Math.min(1, dt * 3.4);
    globe.rotation.y = state.spin + wantY;

    // Le globe recule et se disperse au fil du defilement.
    const s = state.scroll;
    uniforms.uDissolve.value = s;
    uniforms.uFade.value = 1 - s * 0.72;
    camera.position.z = (520 + (1 - Math.min(1, width / 900)) * 300) * (1 + s * 0.5);

    globe.updateMatrix();
    globe.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
  }

  function shouldRun() {
    return state.visible && state.onScreen;
  }

  function sync() {
    const want = shouldRun();
    if (want && !state.running) {
      state.running = true;
      state.lastTime = 0;
      state.frame = requestAnimationFrame(render);
    } else if (!want && state.running) {
      state.running = false;
      cancelAnimationFrame(state.frame);
    }
  }

  /* --- Commandes exposees ----------------------------------------- */

  return {
    resize,

    /** Position du curseur, normalisee entre -1 et 1. */
    setPointer(x, y) {
      state.pointerX = x;
      state.pointerY = y;
    },

    /** Avancement du defilement du hero, de 0 a 1. */
    setScroll(v) {
      state.scroll = Math.min(1, Math.max(0, v));
    },

    dragStart() {
      state.dragging = true;
      state.dragVX = 0;
      state.dragVY = 0;
    },

    dragMove(dx, dy) {
      state.spin += dx * 0.005;
      state.targetY += dy * 0.003;
      state.targetY = Math.min(0.6, Math.max(-0.6, state.targetY));
      state.dragVX = dx * 0.0016;
      state.dragVY = dy * 0.0008;
    },

    dragEnd() {
      state.dragging = false;
    },

    /** Onglet affiche ou non. */
    setVisible(v) {
      state.visible = v;
      sync();
    },

    /** Le hero est-il encore a l'ecran ? */
    setOnScreen(v) {
      state.onScreen = v;
      sync();
    },

    start() {
      state.visible = document.visibilityState !== 'hidden';
      sync();
    },

    /** Rend une image unique, sans demarrer la boucle. */
    renderOnce() {
      uniforms.uTime.value = performance.now() * 0.001;
      globe.updateMatrix();
      globe.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
    },

    pointCount: count,

    // Vrai sur appareil modeste : la page adapte alors sa strategie.
    allege: (quality.minFrameMs || 0) > 0,

    destroy() {
      state.running = false;
      cancelAnimationFrame(state.frame);
      pointsGeo.dispose();
      arcsGeo.dispose();
      pointsMat.dispose();
      arcsMat.dispose();
      haloMat.dispose();
      renderer.dispose();
    },
  };
}
