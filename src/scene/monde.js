/**
 * Le monde du voyage : ciel, planète, astéroïdes, étoiles, passerelle et
 * astronaute.
 *
 * WebGL 1 brut, sans bibliothèque :
 *   - le ciel et la planète sont l'image de référence découpée en plans
 *     (public/espace/), posés sur une sphère à l'infini ;
 *   - la passerelle est un maillage calculé une fois le long de son tracé :
 *     plancher de métal réfléchissant, tranches, lisses, montants, vitres
 *     et bandeaux lumineux, jusqu'à la plateforme d'arrivée ;
 *   - astéroïdes (images de l'atlas), étoiles et poussière en parallaxe,
 *     météores ;
 *   - l'astronaute, lui, est une suite d'images posée par-dessus (voir
 *     voyage.js) : le monde calcule seulement où se trouvent ses pieds.
 *
 * Le module ne connaît ni GSAP ni le DOM : il lit son objet `etat`, que la
 * mise en scène fait évoluer, et dessine quand on appelle `rendre`.
 */
import {
  PLEIN_ECRAN,
  CIEL_F,
  PONT_V,
  PONT_F,
  SPRITE_V,
  SPRITE_F,
  POINTS_V,
  POINTS_F,
} from './glsl.js';
import { media } from '../lib/media.js';

const DEG = Math.PI / 180;

/* La planète, dans le repère du ciel (voir glsl.js). */
const PLANETE = { lacet: 29.1 * DEG, tangage: 7.2 * DEG };

/* Les mesures de la passerelle, en mètres. */
const PONT = { demi: 2.8, rail: 2.88, haut: 1.02, epaisseur: 0.32, montants: 3, plateforme: 7 };

/* Rectangles de l'atlas d'astéroïdes (2048 × 512) : u, v, largeur,
   hauteur, en fractions. Voir scripts/plans.py. */
const ATLAS = [
  [0.0, 0, 0.20898, 0.70312],
  [0.21289, 0, 0.09082, 0.31836],
  [0.30762, 0, 0.07373, 0.25586],
  [0.38525, 0, 0.06201, 0.22852],
  [0.45117, 0, 0.05957, 0.23242],
  [0.51465, 0, 0.03809, 0.16211],
];

// Le ciel et la planète arrivent d'abord en définition moyenne, puis,
// sur les écrans qui en profitent, en haute définition.
const QUALITES = {
  haute: { dpr: 2, etoiles: 900, poussiere: 260, asteroides: 16, ciel: ['espace/ciel-2048.webp', 'espace/ciel-4096.webp'], planete: ['espace/planete-1024.webp', 'espace/planete-2048.webp'] },
  moyenne: { dpr: 2, etoiles: 650, poussiere: 180, asteroides: 12, ciel: ['espace/ciel-2048.webp'], planete: ['espace/planete-1024.webp', 'espace/planete-2048.webp'] },
  basse: { dpr: 1.5, etoiles: 420, poussiere: 110, asteroides: 9, ciel: ['espace/ciel-2048.webp'], planete: ['espace/planete-1024.webp'] },
};

/* La caméra du voyage : derrière l'astronaute, à cette distance (en
   mètres, horizontale) et à cette hauteur au-dessus du plancher. La
   longueur de ses pas en dépend (scene/voyage.js). */
export const CAMERA = { distance: 4.8, distancePortrait: 5.6, hauteur: 1.82 };
export const enPortrait = (largeur, hauteur) => largeur / hauteur < 0.9;

/* ---------- petite algèbre ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const melange = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lisse = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const borne = (x, a, b) => Math.min(b, Math.max(a, x));

/** Matrice 4 × 4 (colonnes) à partir d'une base et d'une origine. */
const matrice = (x, y, z, o) => new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, o[0], o[1], o[2], 1]);

function multiplier(a, b) {
  const m = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let l = 0; l < 4; l += 1) {
      let v = 0;
      for (let k = 0; k < 4; k += 1) v += a[k * 4 + l] * b[c * 4 + k];
      m[c * 4 + l] = v;
    }
  }
  return m;
}

/* Hasard déterministe : le décor est le même à chaque visite. */
function alea(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Choisit le niveau de détail selon l'appareil. */
export function choisirQualite() {
  const nav = window.navigator || {};
  const tactile = window.matchMedia('(pointer: coarse)').matches;
  const coeurs = nav.hardwareConcurrency || 4;
  const memoire = nav.deviceMemory || 4;
  if (coeurs <= 4 || memoire <= 2) return 'basse';
  if (tactile || Math.min(window.innerWidth, window.innerHeight) < 600) return 'moyenne';
  return 'haute';
}

/* ---------- le tracé de la passerelle ----------
   Un cap (en radians, positif vers la droite) donné à quelques fractions
   de la longueur, lissé entre elles ; le tracé en découle par intégration.
   Il ondule doucement, puis tourne vers la planète. */
function creerTrace(L) {
  const cles = [
    [0, 0],
    [0.12, 0],
    [0.32, -6 * DEG],
    [0.52, 5 * DEG],
    [0.68, -1 * DEG],
    [0.9, 22 * DEG],
    [1, 24 * DEG],
  ];
  const cap = (s) => {
    const u = s / L;
    if (u <= 0) return 0;
    if (u >= 1) return cles[cles.length - 1][1];
    let k = 1;
    while (cles[k][0] < u) k += 1;
    const [u0, c0] = cles[k - 1];
    const [u1, c1] = cles[k];
    const t = (u - u0) / (u1 - u0);
    return c0 + (c1 - c0) * (t * t * (3 - 2 * t));
  };
  const PAS = 0.25;
  const debut = -20;
  const fin = L + PONT.plateforme * 2 + 10;
  const n = Math.ceil((fin - debut) / PAS) + 1;
  const xs = new Float32Array(n);
  const zs = new Float32Array(n);
  let x = 0;
  let z = -debut; // s = 0 en z = 0
  for (let i = 0; i < n; i += 1) {
    const s = debut + i * PAS;
    xs[i] = x;
    zs[i] = z;
    const c = cap(s + PAS / 2);
    x += Math.sin(c) * PAS;
    z -= Math.cos(c) * PAS;
  }
  const point = (s) => {
    const f = borne((s - debut) / PAS, 0, n - 1.001);
    const i = Math.floor(f);
    const t = f - i;
    return [xs[i] + (xs[i + 1] - xs[i]) * t, 0, zs[i] + (zs[i + 1] - zs[i]) * t];
  };
  const avant = (s) => {
    const c = cap(s);
    return [Math.sin(c), 0, -Math.cos(c)];
  };
  const droite = (s) => {
    const c = cap(s);
    return [Math.cos(c), 0, Math.sin(c)];
  };
  return { L, cap, point, avant, droite, debut };
}

/* ---------- maillages ---------- */
function Maillage() {
  const p = [];
  const nrm = [];
  const m = [];
  const t = [];
  return {
    sommet(pos, n, motif, type) {
      p.push(pos[0], pos[1], pos[2]);
      nrm.push(n[0], n[1], n[2]);
      m.push(motif[0], motif[1]);
      t.push(type);
    },
    quad(a, b, c, d, n, ma, mb, mc, md, type) {
      // deux triangles : a b c, a c d
      this.sommet(a, n, ma, type);
      this.sommet(b, n, mb, type);
      this.sommet(c, n, mc, type);
      this.sommet(a, n, ma, type);
      this.sommet(c, n, mc, type);
      this.sommet(d, n, md, type);
    },
    tableaux() {
      return { pos: new Float32Array(p), nrm: new Float32Array(nrm), motif: new Float32Array(m), type: new Float32Array(t), n: t.length };
    },
  };
}

/** La passerelle et la plateforme : un maillage opaque et un de vitres. */
function construirePont(trace) {
  const { L, point, droite, avant } = trace;
  const opaque = Maillage();
  const vitres = Maillage();
  const H = [0, 1, 0];
  const pas = 0.5;
  const debut = -18;

  // Plancher, tranches, dessous, bandeaux et vitres, par tronçons.
  for (let s = debut; s < L - 1e-3; s += pas) {
    const s1 = Math.min(s + pas, L);
    const a = point(s);
    const b = point(s1);
    const ra = droite(s);
    const rb = droite(s1);
    const at = (pt, r, u, y = 0) => [pt[0] + r[0] * u, y, pt[2] + r[2] * u];
    const W = PONT.demi;
    // plancher, découpé en largeur pour que les joints restent nets
    for (let k = -4; k < 4; k += 1) {
      const u0 = (k / 4) * W;
      const u1 = ((k + 1) / 4) * W;
      opaque.quad(at(a, ra, u0), at(a, ra, u1), at(b, rb, u1), at(b, rb, u0), H, [s, u0], [s, u1], [s1, u1], [s1, u0], 0);
    }
    for (const cote of [-1, 1]) {
      const e = PONT.demi + 0.15;
      const nrm = mul(ra, cote);
      // tranche
      opaque.quad(at(a, ra, e * cote, 0), at(b, rb, e * cote, 0), at(b, rb, e * cote, -PONT.epaisseur), at(a, ra, e * cote, -PONT.epaisseur), nrm, [s, 1], [s1, 1], [s1, 0], [s, 0], 1);
      // rebord entre plancher et tranche
      opaque.quad(at(a, ra, W * cote, 0.001), at(b, rb, W * cote, 0.001), at(b, rb, e * cote, 0.001), at(a, ra, e * cote, 0.001), H, [s, 0], [s1, 0], [s1, 0], [s, 0], 3);
      // bandeau lumineux au pied de la vitre
      const bl = PONT.rail - 0.06;
      opaque.quad(at(a, ra, bl * cote, 0.03), at(b, rb, bl * cote, 0.03), at(b, rb, bl * cote, 0.07), at(a, ra, bl * cote, 0.07), mul(nrm, -1), [s, 0], [s1, 0], [s1, 0], [s, 0], 5);
      // vitre
      vitres.quad(at(a, ra, PONT.rail * cote, 0.12), at(b, rb, PONT.rail * cote, 0.12), at(b, rb, PONT.rail * cote, PONT.haut - 0.04), at(a, ra, PONT.rail * cote, PONT.haut - 0.04), mul(nrm, -1), [s, 0], [s1, 0], [s1, 1], [s, 1], 4);
    }
    // dessous
    opaque.quad(at(a, ra, -PONT.demi - 0.15, -PONT.epaisseur), at(b, rb, -PONT.demi - 0.15, -PONT.epaisseur), at(b, rb, PONT.demi + 0.15, -PONT.epaisseur), at(a, ra, PONT.demi + 0.15, -PONT.epaisseur), [0, -1, 0], [s, 0], [s1, 0], [s1, 0], [s, 0], 2);
  }

  // Lisses (haute et basse) : des tubes à six pans, le long du tracé.
  const tube = (points, rayon) => {
    const PANS = 6;
    for (let i = 0; i < points.length - 1; i += 1) {
      const [c0, t0] = points[i];
      const [c1, t1] = points[i + 1];
      const r0 = norm(croix(t0, H));
      const r1 = norm(croix(t1, H));
      for (let k = 0; k < PANS; k += 1) {
        const a0 = (k / PANS) * Math.PI * 2;
        const a1 = ((k + 1) / PANS) * Math.PI * 2;
        const dir = (r, a) => add(mul(r, Math.cos(a)), mul(H, Math.sin(a)));
        const n0 = dir(r0, (a0 + a1) / 2);
        opaque.quad(
          add(c0, mul(dir(r0, a0), rayon)),
          add(c0, mul(dir(r0, a1), rayon)),
          add(c1, mul(dir(r1, a1), rayon)),
          add(c1, mul(dir(r1, a0), rayon)),
          norm(add(n0, dir(r1, (a0 + a1) / 2))),
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
          3
        );
      }
    }
  };
  for (const cote of [-1, 1]) {
    for (const [h, r] of [
      [PONT.haut, 0.045],
      [0.1, 0.03],
    ]) {
      const pts = [];
      for (let s = debut; s <= L + 1e-3; s += pas) {
        const pt = point(s);
        const rr = droite(s);
        pts.push([[pt[0] + rr[0] * PONT.rail * cote, h, pt[2] + rr[2] * PONT.rail * cote], avant(s)]);
      }
      tube(pts, r);
    }
  }

  // Montants : de fines barres verticales, tous les trois mètres.
  const montant = (c, r, f) => {
    const w = 0.03;
    const coins = [
      add(add(c, mul(r, w)), mul(f, w)),
      add(add(c, mul(r, -w)), mul(f, w)),
      add(add(c, mul(r, -w)), mul(f, -w)),
      add(add(c, mul(r, w)), mul(f, -w)),
    ];
    for (let k = 0; k < 4; k += 1) {
      const a = coins[k];
      const b = coins[(k + 1) % 4];
      const n = norm(add(sub(a, c), sub(b, c)));
      opaque.quad([a[0], 0, a[2]], [b[0], 0, b[2]], [b[0], PONT.haut, b[2]], [a[0], PONT.haut, a[2]], [n[0], 0, n[2]], [0, 0], [0, 0], [0, 0], [0, 0], 3);
    }
  };
  for (let s = Math.ceil(debut / PONT.montants) * PONT.montants; s <= L; s += PONT.montants) {
    const pt = point(s);
    const r = droite(s);
    for (const cote of [-1, 1]) montant([pt[0] + r[0] * PONT.rail * cote, 0, pt[2] + r[2] * PONT.rail * cote], r, avant(s));
  }

  // La plateforme d'arrivée : un disque, son garde-corps, l'entrée ouverte.
  const R = PONT.plateforme;
  const fin = point(L);
  const f = avant(L);
  const r = droite(L);
  const C = add(fin, mul(f, R));
  const PARTS = 72;
  const angleEntree = Math.atan2(dot(sub(fin, C), r), dot(sub(fin, C), f));
  const ouverture = Math.asin((PONT.demi + 0.3) / R);
  const local = (q) => [dot(sub(q, C), r), dot(sub(q, C), f)];
  const surCercle = (a, rayon, y = 0) => [C[0] + (f[0] * Math.cos(a) + r[0] * Math.sin(a)) * rayon, y, C[2] + (f[2] * Math.cos(a) + r[2] * Math.sin(a)) * rayon];
  for (let k = 0; k < PARTS; k += 1) {
    const a0 = (k / PARTS) * Math.PI * 2;
    const a1 = ((k + 1) / PARTS) * Math.PI * 2;
    for (let anneau = 0; anneau < 4; anneau += 1) {
      const ri = (anneau / 4) * R;
      const re = ((anneau + 1) / 4) * R;
      const pts = [surCercle(a0, ri), surCercle(a1, ri), surCercle(a1, re), surCercle(a0, re)];
      opaque.quad(pts[0], pts[1], pts[2], pts[3], H, local(pts[0]), local(pts[1]), local(pts[2]), local(pts[3]), 6);
    }
    const nrm = norm(sub(surCercle((a0 + a1) / 2, R), C));
    opaque.quad(surCercle(a0, R + 0.15, 0), surCercle(a1, R + 0.15, 0), surCercle(a1, R + 0.15, -0.4), surCercle(a0, R + 0.15, -0.4), nrm, [0, 1], [0, 1], [0, 0], [0, 0], 1);
    opaque.quad(surCercle(a0, R, 0.001), surCercle(a1, R, 0.001), surCercle(a1, R + 0.15, 0.001), surCercle(a0, R + 0.15, 0.001), H, [0, 0], [0, 0], [0, 0], [0, 0], 3);
    opaque.quad(surCercle(a0, R + 0.15, -0.4), surCercle(a1, R + 0.15, -0.4), C, C, [0, -1, 0], [0, 0], [0, 0], [0, 0], [0, 0], 2);
    // garde-corps, sauf à l'entrée
    const milieu = (a0 + a1) / 2;
    let ecart = Math.abs(milieu - angleEntree);
    ecart = Math.min(ecart, Math.PI * 2 - ecart);
    if (ecart > ouverture) {
      const rr = R - 0.12;
      vitres.quad(surCercle(a0, rr, 0.12), surCercle(a1, rr, 0.12), surCercle(a1, rr, PONT.haut - 0.04), surCercle(a0, rr, PONT.haut - 0.04), mul(nrm, -1), [0, 0], [0, 0], [0, 1], [0, 1], 4);
      opaque.quad(surCercle(a0, rr - 0.06, 0.03), surCercle(a1, rr - 0.06, 0.03), surCercle(a1, rr - 0.06, 0.07), surCercle(a0, rr - 0.06, 0.07), mul(nrm, -1), [0, 0], [0, 0], [0, 0], [0, 0], 5);
    }
  }
  // lisses et montants de la plateforme
  const arcs = [];
  let arc = [];
  for (let k = 0; k <= PARTS; k += 1) {
    const a = (k / PARTS) * Math.PI * 2;
    let ecart = Math.abs(a - angleEntree);
    ecart = Math.min(ecart, Math.PI * 2 - ecart);
    if (ecart > ouverture) arc.push(a);
    else if (arc.length) {
      arcs.push(arc);
      arc = [];
    }
  }
  if (arc.length) arcs.push(arc);
  for (const a of arcs) {
    for (const [h, rr] of [
      [PONT.haut, 0.045],
      [0.1, 0.03],
    ]) {
      tube(
        a.map((ang) => [surCercle(ang, R - 0.12, h), norm(croix(H, sub(surCercle(ang, 1), C)))]),
        rr
      );
    }
    for (let k = 0; k < a.length; k += 3) {
      const c = surCercle(a[k], R - 0.12);
      const radial = norm(sub(c, C));
      montant(c, radial, croix(H, radial));
    }
  }
  return { opaque: opaque.tableaux(), vitres: vitres.tableaux(), centre: C, sortie: f, droite: r };
}

export function creerMonde(toile, { qualite = 'haute', adaptatif = true, logiciel = false, etat, surPret = null, longueur = 150, parcours = longueur } = {}) {
  const Q = QUALITES[qualite] || QUALITES.haute;
  const gl = toile.getContext('webgl', {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
    // Pas de rendu logiciel : sans processeur graphique, la scène ne
    // tiendrait pas la cadence. L'affiche fixe prend alors le relais.
    failIfMajorPerformanceCaveat: !logiciel,
  });
  if (!gl) return null;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const moteur = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
  if (!logiciel && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(moteur)) {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    return null;
  }

  const trace = creerTrace(longueur);
  const versPlanete = [Math.sin(PLANETE.lacet) * Math.cos(PLANETE.tangage), Math.sin(PLANETE.tangage), -Math.cos(PLANETE.lacet) * Math.cos(PLANETE.tangage)];
  const souris = { x: 0, y: 0, cx: 0, cy: 0 };
  let largeur = 1;
  let hauteur = 1;
  let echelleDpr = 1;
  let dpr = 1;
  let perdu = false;
  let prets = null;
  let pont = null;
  // Où se trouve l'astronaute à l'écran : ses pieds, et la hauteur d'un
  // corps de 1,8 m à cet endroit (en pixels CSS).
  const astro = { x: 0, y: 0, echelle: 1, visible: false, marche: 0 };
  const textures = {};

  /* ---------- compilation ---------- */
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const msg = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(msg || 'shader');
    }
    return s;
  }
  function programme(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i += 1) {
      const nom = gl.getActiveUniform(p, i).name;
      u[nom] = gl.getUniformLocation(p, nom);
    }
    const a = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i += 1) {
      const nom = gl.getActiveAttrib(p, i).name;
      a[nom] = gl.getAttribLocation(p, nom);
    }
    return { p, u, a };
  }
  const tampon = (donnees) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, donnees, gl.STATIC_DRAW);
    return b;
  };
  const lier = (prog, nom, buf, taille) => {
    const loc = prog.a[nom];
    if (loc === undefined || loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, taille, gl.FLOAT, false, 0, 0);
  };
  const delier = (prog) => {
    for (const loc of Object.values(prog.a)) gl.disableVertexAttribArray(loc);
  };

  /* ---------- textures ---------- */
  // Les images sont redimensionnées en puissances de deux : WebGL 1 peut
  // alors en calculer les niveaux de flou (reflets du plancher).
  // Les images sont fournies en puissances de deux : WebGL 1 en calcule
  // alors les niveaux de détail (reflets du plancher, lointains).
  function televerser(img, premultiplie = false, ancienne = null) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplie);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    if (ancienne) gl.deleteTexture(ancienne);
    return tex;
  }
  const charger = (chemin) =>
    new Promise((ok, ko) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => ok(img);
      img.onerror = ko;
      img.src = media(chemin);
    });
  const images = Promise.all([charger(Q.ciel[0]), charger(Q.planete[0]), charger('espace/asteroides.webp')]);
  /** La haute définition, une fois la scène en route et le réseau libre. */
  function affiner() {
    const suite = [];
    if (Q.ciel[1]) suite.push(charger(Q.ciel[1]).then((img) => etapes.push(() => (textures.ciel = televerser(img, false, textures.ciel)))));
    if (Q.planete[1]) suite.push(charger(Q.planete[1]).then((img) => etapes.push(() => (textures.planete = televerser(img, true, textures.planete)))));
    return Promise.all(suite).catch(() => {});
  }

  /* ---------- décor : étoiles et astéroïdes ---------- */
  function construireEtoiles() {
    const r = alea(7);
    const n = Q.etoiles + Q.poussiere;
    const A = new Float32Array(n * 4);
    const B = new Float32Array(n * 4);
    const teintes = [
      [0.9, 0.93, 1.0],
      [0.75, 0.85, 1.0],
      [1.0, 0.85, 0.92],
      [0.8, 1.0, 0.97],
    ];
    for (let i = 0; i < n; i += 1) {
      // Trois plans : poussière tout près de la passerelle, étoiles
      // proches, étoiles lointaines. Chacun défile à sa vitesse.
      const poussiere = i >= Q.etoiles;
      const proche = i < Q.etoiles * 0.3;
      // un tiers de la poussière, tout près : elle passe au premier plan
      const premierPlan = poussiere && i >= Q.etoiles + Q.poussiere * 0.62;
      const s = r() * (longueur + 60) - 20;
      const base = trace.point(s);
      const cote = r() < 0.5 ? -1 : 1;
      const dr = trace.droite(s);
      if (premierPlan) {
        const lat = 0.6 + r() * 3.6;
        const sp = r() * (longueur + 12) - 6;
        const bp = trace.point(sp);
        const drp = trace.droite(sp);
        A[i * 4] = bp[0] + drp[0] * lat * cote;
        A[i * 4 + 1] = 0.3 + r() * 3.2;
        A[i * 4 + 2] = bp[2] + drp[2] * lat * cote;
        A[i * 4 + 3] = 1.6 + r() * 2.2;
      } else if (poussiere) {
        const lat = 4.5 + r() * 26;
        A[i * 4] = base[0] + dr[0] * lat * cote;
        A[i * 4 + 1] = -4 + r() * 12;
        A[i * 4 + 2] = base[2] + dr[2] * lat * cote;
        A[i * 4 + 3] = 1.2 + r() * 1.4;
      } else {
        const d = proche ? 30 + r() * 80 : 220 + r() * 500;
        const ang = (r() - 0.35) * Math.PI;
        A[i * 4] = base[0] + dr[0] * Math.cos(ang) * d * cote;
        A[i * 4 + 1] = Math.sin(ang) * d * 0.8 + 5;
        A[i * 4 + 2] = base[2] + dr[2] * Math.cos(ang) * d * cote - (proche ? 0 : r() * 200);
        A[i * 4 + 3] = proche ? 1.4 + r() * 1.6 : 1.1 + r() * 1.3;
      }
      const t = teintes[Math.floor(r() * teintes.length)];
      const lum = premierPlan ? 0.1 + r() * 0.16 : poussiere ? 0.18 + r() * 0.3 : 0.35 + r() * 0.55;
      B[i * 4] = t[0] * lum;
      B[i * 4 + 1] = t[1] * lum;
      B[i * 4 + 2] = t[2] * lum;
      B[i * 4 + 3] = r();
    }
    return { A: tampon(A), B: tampon(B), n };
  }
  function construireAsteroides() {
    const r = alea(31);
    const liste = [];
    let essais = 0;
    while (liste.length < Q.asteroides && essais < 400) {
      essais += 1;
      const i = liste.length;
      const s = -10 + (i / Q.asteroides) * (longueur + 70) + r() * 8;
      const base = trace.point(s);
      const dr = trace.droite(s);
      const cote = r() < 0.55 ? -1 : 1;
      const lat = 18 + r() * 60;
      let taille = 2.6 + r() * 3.5 + lat * 0.07;
      const centre = [base[0] + dr[0] * lat * cote, -8 + r() * 24, base[2] + dr[2] * lat * cote - r() * 20];
      // Net à toute distance : jamais affiché plus grand que son image.
      // Au plus près, il mesure à l'écran (en pixels d'un écran de 2 160
      // pixels de haut) taille × 2 100 / distance ; on lui donne une image
      // assez grande, sinon on le réduit.
      const pres = Math.max(8, Math.hypot(lat, centre[1] - 2) - 4);
      const besoin = (taille * 2100) / pres;
      const tailles = ATLAS.map((q) => Math.max(q[2] * 2048, q[3] * 512));
      const assez = tailles.map((t, k) => [t, k]).filter(([t]) => t >= besoin);
      const image = assez.length ? assez[Math.floor(r() * assez.length)][1] : tailles.indexOf(Math.max(...tailles));
      taille = Math.min(taille, (tailles[image] * pres) / 2100);
      // jamais devant la planète, vu du chemin
      const vu = norm(sub(centre, add(base, [0, 2, 0])));
      if (dot(vu, versPlanete) > Math.cos(32 * DEG)) continue;
      liste.push({
        centre,
        derive: norm([r() - 0.5, (r() - 0.5) * 0.4, r() - 0.5]),
        vitesse: 0.16 + r() * 0.26,
        taille,
        angle: r() * Math.PI * 2,
        rotation: (r() < 0.5 ? -1 : 1) * (0.08 + r() * 0.17),
        image,
        miroir: r() < 0.5,
      });
    }
    return liste;
  }

  /* ---------- initialisation, une étape par image ---------- */
  let etapes = [];
  function initialiser() {
    prets = null;
    const progs = {};
    const geo = {};
    etapes = [
      () => {
        geo.plein = tampon(new Float32Array([-1, -1, 3, -1, -1, 3]));
        geo.coin = tampon(new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
        progs.ciel = programme(PLEIN_ECRAN, CIEL_F);
      },
      () => {
        progs.pont = programme(PONT_V, PONT_F);
      },
      () => {
        progs.sprite = programme(SPRITE_V, SPRITE_F);
        progs.points = programme(POINTS_V, POINTS_F);
      },
      () => {
        pont = construirePont(trace);
      },
      () => {
        geo.pont = {
          pos: tampon(pont.opaque.pos),
          nrm: tampon(pont.opaque.nrm),
          motif: tampon(pont.opaque.motif),
          type: tampon(pont.opaque.type),
          n: pont.opaque.n,
        };
        geo.vitres = {
          pos: tampon(pont.vitres.pos),
          nrm: tampon(pont.vitres.nrm),
          motif: tampon(pont.vitres.motif),
          type: tampon(pont.vitres.type),
          n: pont.vitres.n,
        };
      },
      () => {
        geo.etoiles = construireEtoiles();
        geo.asteroides = construireAsteroides();
      },
    ];
    images
      .then(([ciel, planete, atlas]) => {
        etapes.push(() => {
          textures.ciel = televerser(ciel);
        });
        etapes.push(() => {
          textures.planete = televerser(planete, true);
          textures.atlas = televerser(atlas, true);
          prets = { progs, geo };
          if (!logiciel) window.setTimeout(affiner, 1500);
        });
      })
      .catch(() => {
        perdu = true;
      });
  }
  function avancer() {
    if (!etapes.length) return false;
    etapes.shift()();
    return true;
  }

  /* ---------- dimensions ---------- */
  function redimensionner() {
    const l = toile.clientWidth || window.innerWidth;
    const h = toile.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, Q.dpr) * echelleDpr;
    largeur = Math.max(1, Math.round(l * dpr));
    hauteur = Math.max(1, Math.round(h * dpr));
    if (toile.width !== largeur || toile.height !== hauteur) {
      toile.width = largeur;
      toile.height = hauteur;
    }
  }

  /* ---------- caméra ---------- */
  const cam = { pos: [0, 2, 5], avant: [0, 0, -1], droite: [1, 0, 0], haut: [0, 1, 0], tan: [1, 1], vp: new Float32Array(16) };

  /** Une direction de regard à partir d'un cap et d'une inclinaison. */
  const regard = (lacet, tangage) => [Math.sin(lacet) * Math.cos(tangage), Math.sin(tangage), -Math.cos(lacet) * Math.cos(tangage)];

  function calculerCamera() {
    const e = etat;
    const aspect = largeur / hauteur;
    const portrait = enPortrait(largeur, hauteur);
    const vfov = (portrait ? 66 : 54) * DEG;
    const fin = longueur + PONT.plateforme - 2.5;
    const d = borne(e.marche, 0, fin);
    const A = trace.point(d);
    const capChemin = trace.cap(d);

    // Pendant le voyage : derrière l'astronaute, un peu au-dessus, le
    // regard entre son cap et la planète.
    const biais = portrait ? 13 * DEG : 4 * DEG;
    let lacet = capChemin * 0.4 + biais + souris.cx * 0.6 * DEG;
    let tangage = 1.2 * DEG + souris.cy * 0.4 * DEG;
    let dist = portrait ? CAMERA.distancePortrait : CAMERA.distance;
    let h = CAMERA.hauteur;
    // L'arrivée : la caméra recule, s'élève et se tourne vers la planète.
    const a = lisse(0, 1, e.arrivee);
    lacet += (PLANETE.lacet * 0.72 - lacet) * a;
    tangage += 2 * DEG * a;
    dist += 2.4 * a;
    h += 0.8 * a;
    let dir = regard(lacet, 0);
    let pos = add(sub(A, mul(dir, dist)), [0, h, 0]);
    let vue = regard(lacet, tangage);

    // Au bout du chemin : deux plans fixes, enchaînés par le défilement.
    if (e.apres > 0) {
      const C = pont.centre;
      const plans = [
        { pos, vue },
        // poste de travail : au ras de la plateforme, la planète derrière
        { pos: add(C, add(mul(regard(PLANETE.lacet * 0.85, 0), -10.5), [0, 1.55, 0])), vue: regard(PLANETE.lacet * 0.85, 2.5 * DEG) },
        // contact : le regard se lève vers les étoiles
        { pos: add(C, add(mul(regard(PLANETE.lacet * 0.85, 0), -10.5), [0, 1.7, 0])), vue: regard(PLANETE.lacet * 0.7, 22 * DEG) },
      ];
      const k = Math.min(Math.floor(e.apres), 1);
      const t = lisse(0, 1, e.apres - k);
      pos = melange(plans[k].pos, plans[k + 1].pos, t);
      vue = norm(melange(plans[k].vue, plans[k + 1].vue, t));
      const sx = souris.cx * 0.5 * DEG;
      vue = norm(add(vue, [Math.cos(PLANETE.lacet) * sx, souris.cy * 0.3 * DEG, Math.sin(PLANETE.lacet) * sx]));
    }

    const droite = norm(croix(vue, [0, 1, 0]));
    const haut = croix(droite, vue);
    cam.pos = pos;
    cam.avant = vue;
    cam.droite = droite;
    cam.haut = haut;
    const t = Math.tan(vfov / 2);
    cam.tan = [t * aspect, t];
    const f = 1 / t;
    const pres = 0.05;
    const loin = 2000;
    const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (loin + pres) / (pres - loin), -1, 0, 0, (2 * loin * pres) / (pres - loin), 0];
    const V = [
      droite[0], haut[0], -vue[0], 0,
      droite[1], haut[1], -vue[1], 0,
      droite[2], haut[2], -vue[2], 0,
      -dot(droite, pos), -dot(haut, pos), dot(vue, pos), 1,
    ];
    cam.vp = multiplier(new Float32Array(P), new Float32Array(V));
    return d;
  }

  /* ---------- météores : rares, rapides ---------- */
  const meteore = { prochain: 2.5 + Math.random() * 2.5, debut: -1, x: 0, y: 0, angle: 0 };
  function majMeteore(t) {
    if (meteore.debut < 0 && t > meteore.prochain) {
      meteore.debut = t;
      meteore.x = -0.6 + Math.random() * 1.4;
      meteore.y = 0.45 + Math.random() * 0.4;
      meteore.angle = Math.PI + (0.25 + Math.random() * 0.35) * (Math.random() < 0.5 ? -1 : 1) * -1;
    }
    if (meteore.debut >= 0) {
      const p = (t - meteore.debut) / 0.75;
      if (p >= 1) {
        meteore.debut = -1;
        meteore.prochain = t + 3.5 + Math.random() * 4.5;
        return [0, 0];
      }
      return [p, Math.sin(Math.PI * p) * 0.9];
    }
    return [0, 0];
  }

  /* ---------- rendu ---------- */
  let derniere = 0;
  let moyenne = 16.7;
  let lentes = 0;
  function adapter(dt) {
    if (!adaptatif || dt <= 0 || dt > 250) return;
    moyenne += (dt - moyenne) * 0.05;
    if (moyenne > 21) lentes += dt;
    else lentes = Math.max(0, lentes - dt * 0.5);
    if (lentes > 1500 && echelleDpr > 0.6) {
      lentes = 0;
      moyenne = 16.7;
      echelleDpr = Math.max(0.55, echelleDpr * 0.85);
      redimensionner();
    }
  }

  let annonce = false;

  function rendre(temps) {
    if (perdu) return;
    if (!prets) {
      avancer();
      derniere = 0;
      return;
    }
    const dt = derniere ? (temps - derniere) * 1000 : 16.7;
    derniere = temps;
    adapter(dt);
    souris.cx += (souris.x - souris.cx) * 0.05;
    souris.cy += (souris.y - souris.cy) * 0.05;

    const { progs, geo } = prets;
    const e = etat;
    const d = calculerCamera();
    // la planète grandit au fil de la marche, puis à l'arrivée
    const echellePlanete = 1 + 0.3 * lisse(0, parcours, d) + 0.32 * lisse(0, 2, e.apres);
    const lumiere = norm([-0.45, 0.8, 0.45]);
    const [avMeteore, iMeteore] = majMeteore(temps);

    gl.viewport(0, 0, largeur, hauteur);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    const cielUniformes = (p) => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.ciel);
      gl.uniform1i(p.u.uCiel, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.planete);
      gl.uniform1i(p.u.uPlanete, 1);
      gl.uniform1f(p.u.uTemps, temps);
      gl.uniform1f(p.u.uPlaneteEchelle, echellePlanete);
    };

    // 1. Le ciel.
    let p = progs.ciel;
    gl.useProgram(p.p);
    cielUniformes(p);
    gl.uniform3fv(p.u.uDroite, cam.droite);
    gl.uniform3fv(p.u.uHaut, cam.haut);
    gl.uniform3fv(p.u.uAvant, cam.avant);
    gl.uniform2fv(p.u.uTan, cam.tan);
    gl.uniform4f(p.u.uMeteore, meteore.x, meteore.y, meteore.angle, avMeteore);
    gl.uniform1f(p.u.uMeteoreI, iMeteore);
    lier(p, 'aP', geo.plein, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    delier(p);

    // 2. La passerelle (opaque).
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    p = progs.pont;
    gl.useProgram(p.p);
    cielUniformes(p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uCam, cam.pos);
    gl.uniform3fv(p.u.uLumiere, lumiere);
    gl.uniform1f(p.u.uBrume, 0.006);
    const dessinerPont = (g) => {
      lier(p, 'aPos', g.pos, 3);
      lier(p, 'aNormale', g.nrm, 3);
      lier(p, 'aMotif', g.motif, 2);
      lier(p, 'aType', g.type, 1);
      gl.drawArrays(gl.TRIANGLES, 0, g.n);
      delier(p);
    };
    dessinerPont(geo.pont);

    // 3. Étoiles proches et astéroïdes, derrière ou devant la passerelle.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    p = progs.points;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uCam, cam.pos);
    gl.uniform1f(p.u.uTemps, temps);
    gl.uniform1f(p.u.uDpr, dpr);
    lier(p, 'aA', geo.etoiles.A, 4);
    lier(p, 'aB', geo.etoiles.B, 4);
    gl.drawArrays(gl.POINTS, 0, geo.etoiles.n);
    delier(p);

    p = progs.sprite;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uDroite, cam.droite);
    gl.uniform3fv(p.u.uHaut, cam.haut);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.atlas);
    gl.uniform1i(p.u.uAtlas, 2);
    lier(p, 'aP', geo.coin, 2);
    const visibles = geo.asteroides
      .map((a) => {
        const c = add(a.centre, mul(a.derive, a.vitesse * temps));
        return { a, c, dist: Math.hypot(c[0] - cam.pos[0], c[1] - cam.pos[1], c[2] - cam.pos[2]) };
      })
      .sort((x, y) => y.dist - x.dist);
    for (const { a, c, dist } of visibles) {
      const r = ATLAS[a.image];
      gl.uniform3fv(p.u.uCentre, c);
      gl.uniform1f(p.u.uTaille, a.taille);
      gl.uniform1f(p.u.uAspect, (r[2] * 4) / r[3]);
      gl.uniform1f(p.u.uAngle, a.angle + a.rotation * temps);
      gl.uniform4f(p.u.uRect, a.miroir ? r[0] + r[2] : r[0], r[1], a.miroir ? -r[2] : r[2], r[3]);
      gl.uniform1f(p.u.uOpacite, lisse(8, 20, dist) * (1 - lisse(260, 340, dist)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    delier(p);

    // 4. L'astronaute : on calcule seulement la place de ses pieds.
    {
      const pied = trace.point(d);
      const m = cam.vp;
      const proj = (q) => {
        const x = m[0] * q[0] + m[4] * q[1] + m[8] * q[2] + m[12];
        const y = m[1] * q[0] + m[5] * q[1] + m[9] * q[2] + m[13];
        const w = m[3] * q[0] + m[7] * q[1] + m[11] * q[2] + m[15];
        return w > 0.05 ? [x / w, y / w] : null;
      };
      const bas = proj(pied);
      const haut = proj([pied[0], 1.8, pied[2]]);
      const lc = toile.clientWidth || window.innerWidth;
      const hc = toile.clientHeight || window.innerHeight;
      astro.visible = Boolean(bas && haut) && e.apres < 0.6;
      if (astro.visible) {
        astro.x = (bas[0] * 0.5 + 0.5) * lc;
        astro.y = (0.5 - bas[1] * 0.5) * hc;
        astro.echelle = (haut[1] - bas[1]) * 0.5 * hc;
      }
      astro.marche = d;
    }

    // 5. Les vitres, en dernier.
    p = progs.pont;
    gl.useProgram(p.p);
    cielUniformes(p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uCam, cam.pos);
    gl.uniform3fv(p.u.uLumiere, lumiere);
    gl.uniform1f(p.u.uBrume, 0.006);
    dessinerPont(geo.vitres);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    if (!annonce) {
      annonce = true;
      if (surPret) surPret();
    }
  }

  /* ---------- cycle de vie ---------- */
  const surPerte = (ev) => {
    ev.preventDefault();
    perdu = true;
  };
  const surRetour = () => {
    perdu = false;
    try {
      initialiser();
    } catch (err) {
      perdu = true;
    }
  };
  toile.addEventListener('webglcontextlost', surPerte);
  toile.addEventListener('webglcontextrestored', surRetour);

  initialiser();
  redimensionner();

  return {
    etat,
    rendre,
    redimensionner,
    astro,
    /** Réservé aux vérifications : un point du plancher, à l'abscisse s du
        tracé, et sa position à l'écran (pixels CSS). */
    verifier(s, lateral = 0) {
      const q = add(trace.point(s), mul(trace.droite(s), lateral));
      const v = cam.vp;
      const x = v[0] * q[0] + v[4] * q[1] + v[8] * q[2] + v[12];
      const y = v[1] * q[0] + v[5] * q[1] + v[9] * q[2] + v[13];
      const w = v[3] * q[0] + v[7] * q[1] + v[11] * q[2] + v[15];
      const lc = toile.clientWidth || window.innerWidth;
      const hc = toile.clientHeight || window.innerHeight;
      return [(x / w * 0.5 + 0.5) * lc, (0.5 - (y / w) * 0.5) * hc];
    },
    /** La distance de la caméra derrière l'astronaute, pour l'écran actuel. */
    distanceCamera: () => (enPortrait(largeur, hauteur) ? CAMERA.distancePortrait : CAMERA.distance),
    /** La distance où l'astronaute s'arrête, sur la plateforme. */
    fin: longueur + PONT.plateforme - 2.5,
    /** Achève l'initialisation (affiche immobile, captures). */
    async preparer() {
      await images;
      while (avancer());
      await Promise.resolve();
      while (avancer());
    },
    orienterSouris(x, y) {
      souris.x = x;
      souris.y = y;
    },
    detruire() {
      toile.removeEventListener('webglcontextlost', surPerte);
      toile.removeEventListener('webglcontextrestored', surRetour);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    },
  };
}
