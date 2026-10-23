/**
 * Le monde : ciel, planète, soleil et chemin de lumière.
 *
 * WebGL 1 brut, cinq appels de dessin par image :
 *   1. un triangle plein écran — ciel, planète lancée en rayons (sol,
 *      nuages et leurs ombres, villes, atmosphère), soleil, voile de
 *      nuages de la descente, grain et vignettage ;
 *   2. quelques grands voiles de nébuleuse, en parallaxe ;
 *   3. et 4. la lueur du chemin, en halo puis en cœur ;
 *   5. un nuage de points — étoiles sur deux plans et grains du chemin.
 * La surface de la planète, ses nuages et la Voie lactée sont cuits une
 * seule fois au démarrage dans trois textures : par image, il ne reste
 * que des lectures de texture et quelques produits scalaires.
 *
 * Le module ne connaît ni GSAP ni le DOM : il lit son objet `etat`, que
 * la chronologie fait évoluer, et dessine quand on appelle `rendre`.
 */
import {
  PLEIN_ECRAN,
  CUISSON_SURFACE,
  CUISSON_NUAGES,
  CUISSON_CIEL,
  NUEES_V,
  NUEES_F,
  CIEL,
  RUBAN_V,
  RUBAN_F,
  POINTS_V,
  POINTS_F,
} from './glsl.js';

const DEG = Math.PI / 180;

/* Géométrie de la scène, en mètres (l'astronaute mesure 1,8 m). */
const G = {
  H: 10, // hauteur de l'objectif au-dessus du chemin
  ASTRO: 22, // distance de l'astronaute devant l'objectif
  R: 500, // rayon de la planète
  CY: -380, // hauteur de son centre
  DECALAGE: 0.55, // décalage latéral, en fraction de la distance
  DIST0: 1150, // distance au départ
  DIST1: 610, // distance à l'arrivée
  ORBITE_H: 40, // altitude de la scène finale
};

const QUALITES = {
  haute: { dpr: 1.75, lointaines: 4000, tunnel: 1600, poussiere: 0, grains: 14000, grainsLoin: 0, surface: 2048 },
  moyenne: { dpr: 1.35, lointaines: 1500, tunnel: 900, poussiere: 0, grains: 7000, grainsLoin: 0, surface: 1024 },
  basse: { dpr: 1, lointaines: 900, tunnel: 500, poussiere: 0, grains: 3500, grainsLoin: 0, surface: 512 },
};

/* ---------- petite algèbre ---------- */
const norm = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const melange = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lisse = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/* Le chemin, identique au shader (voir glsl.js). */
const ondulation = (s) => 2.4 * Math.sin(s * 0.021) + 1.1 * Math.sin(s * 0.057 + 1.3);
const cheminY = (ds, montee) => {
  const k = Math.max(ds - 20, 0) / 1000;
  return montee * Math.pow(k, 1.8);
};
const cheminX = (s, ds, virage) => {
  const k = Math.max(ds, 0) / 1000;
  return ondulation(s) / (1 + Math.max(ds, 0) / 90) + virage * Math.pow(k, 1.6);
};

/* Générateur pseudo-aléatoire déterministe : le ciel est le même à
   chaque visite. */
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

export function creerMonde(
  toile,
  { qualite = 'haute', adaptatif = true, logiciel = false, etat: etatExterne = null, surPret = null } = {}
) {
  const Q = QUALITES[qualite] || QUALITES.haute;
  const gl = toile.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
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

  /* Ce que la chronologie fait évoluer. */
  const etat = etatExterne || {
    pas: 0, // distance parcourue à pied, en mètres
    vol: 0, // défilement des étoiles du plan intermédiaire
    approche: 0, // 0 au départ, 1 au pied de la planète
    soleil: 0, // course du soleil : de face, derrière la planète, puis levant
    plongee: 0, // entrée dans l'atmosphère
    orbite: 0, // scène finale, au-dessus de l'horizon
    derive: 0, // lente dérive de la scène finale
    chemin: 1, // visibilité du chemin
    expo: 1.15,
    regard: 0, // inclinaison du regard dans la scène finale, en degrés
    // Caméra de la visite guidée, ajoutée au parcours :
    zoom: 1, // champ : < 1 resserre
    lacet: 0, // panoramique horizontal, en degrés
  };

  const souris = { x: 0, y: 0, cx: 0, cy: 0 };
  const astro = { x: 0, y: 0, echelle: 1, visible: true };

  let largeur = 1;
  let hauteur = 1;
  let echelleDpr = 1;
  let dpr = 1;
  let programmes = null;
  let tampons = null;
  let textures = null;
  let groupes = [];
  let fraction = 1;
  let perdu = false;

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
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i += 1) {
      const info = gl.getActiveUniform(p, i);
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    const a = {};
    const m = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < m; i += 1) {
      const info = gl.getActiveAttrib(p, i);
      a[info.name] = gl.getAttribLocation(p, info.name);
    }
    return { p, u, a };
  }

  /* ---------- cuisson des textures ---------- */
  function cuire(source, l, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, l, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const prog = programme(PLEIN_ECRAN, source);
    gl.useProgram(prog.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.plein);
    gl.enableVertexAttribArray(prog.a.aP);
    gl.vertexAttribPointer(prog.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, l, h);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(prog.a.aP);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteProgram(prog.p);
    return tex;
  }

  /* ---------- géométrie ---------- */
  function construirePoints() {
    const r = alea(20041980);
    const gauss = () => (r() + r() + r() + r() - 2) / 2;
    const plans = [
      [0, Math.round(Q.lointaines)],
      [1, Math.round(Q.tunnel)],
      [2, Math.round(Q.poussiere)],
      [3, Math.round(Q.grains)],
      [4, Math.round(Q.grainsLoin)],
    ];
    const total = plans.reduce((n, [, c]) => n + c, 0);
    const A = new Float32Array(total * 4);
    const B = new Float32Array(total * 4);
    let i = 0;
    groupes = [];
    for (const [type, n] of plans) {
      groupes.push({ debut: i, n });
      for (let k = 0; k < n; k += 1, i += 1) {
        const o = i * 4;
        A[o + 3] = type;
        B[o + 2] = r();
        if (type === 0) {
          const z = r() * 2 - 1;
          const t = r() * Math.PI * 2;
          const q = Math.sqrt(1 - z * z);
          A[o] = q * Math.cos(t);
          A[o + 1] = z;
          A[o + 2] = q * Math.sin(t);
          const brillante = r() < 0.012;
          B[o] = brillante ? 2.8 + r() * 0.6 : 0.7 + Math.pow(r(), 3) * 1.4;
          B[o + 1] = brillante ? 1.8 : 0.3 + Math.pow(r(), 4) * 1.6;
          B[o + 3] = r();
        } else if (type === 1) {
          const t = r() * Math.PI * 2;
          const rayon = 70 + Math.pow(r(), 0.75) * 950;
          A[o] = Math.cos(t) * rayon;
          A[o + 1] = Math.sin(t) * rayon * 0.8;
          A[o + 2] = r() * 1600;
          B[o] = 0.6 + Math.pow(r(), 2) * 0.9;
          B[o + 1] = 0.35 + Math.pow(r(), 2.5) * 1.3;
          B[o + 3] = r();
        } else if (type === 2) {
          A[o] = r() * 50;
          A[o + 1] = r() * 50;
          A[o + 2] = r() * 50;
          B[o] = 0.02 + r() * 0.05;
          B[o + 1] = 0.05 + r() * 0.16;
        } else {
          const loin = type === 4;
          A[o] = loin ? 0.12 + Math.pow(r(), 0.85) * 0.88 : r() * 170;
          const ecart = r() < 0.12 ? gauss() * 1.6 : gauss() * 0.75;
          A[o + 1] = Math.max(-1.9, Math.min(1.9, ecart));
          A[o + 2] = r() * 0.04;
          B[o] = loin ? 0.1 + r() * 0.2 : 0.010 + Math.pow(r(), 3) * 0.035;
          B[o + 1] = 0.25 + Math.pow(r(), 1.8) * 1.05;
          B[o + 3] = r() < 0.18 ? 1 : 0;
        }
      }
    }
    return { A, B, total };
  }

  /* Huit grands voiles de nébuleuse : deux triangles chacun, orientés
     face à la caméra dans le shader. */
  function construireNuees() {
    const r = alea(7031);
    const N = 8;
    const A = new Float32Array(N * 6 * 4);
    const B = new Float32Array(N * 6 * 4);
    const coins = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < N; i += 1) {
      const t = r() * Math.PI * 2;
      const rayon = 260 + r() * 700;
      const x = Math.cos(t) * rayon;
      const y = Math.sin(t) * rayon * 0.55 + 120;
      const z = (i / N) * 2600 + r() * 200;
      const taille = 260 + r() * 360;
      const teinte = i % 3;
      const graine = r();
      for (let k = 0; k < 6; k += 1) {
        const o = (i * 6 + k) * 4;
        A.set([x, y, z, taille], o);
        B.set([coins[k][0], coins[k][1], teinte, graine], o);
      }
    }
    return { A, B, n: N * 6 };
  }

  function construireRuban() {
    const M = 420;
    const d = new Float32Array((M + 1) * 4);
    for (let i = 0; i <= M; i += 1) {
      const t = i / M;
      const ds = -8 + 1208 * t * t;
      d.set([ds, -1, ds, 1], i * 4);
    }
    return { d, n: (M + 1) * 2 };
  }

  /* L'initialisation est découpée en étapes, une par image : compiler un
     programme ou cuire une texture ne bloque jamais le fil principal
     plus de quelques millisecondes d'affilée. */
  let etapes = [];
  function initialiser() {
    programmes = null;
    etapes = [
      () => {
        const plein = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, plein);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        tampons = { plein };
        textures = {};
      },
      () => {
        textures.surface = cuire(CUISSON_SURFACE, Q.surface, Q.surface / 2);
      },
      () => {
        textures.nuages = cuire(CUISSON_NUAGES, Q.surface, Q.surface / 2);
      },
      () => {
        textures.fond = cuire(CUISSON_CIEL, 1024, 512);
      },
      () => {
        prets.ciel = programme(PLEIN_ECRAN, CIEL);
      },
      () => {
        prets.ruban = programme(RUBAN_V, RUBAN_F);
        const ruban = construireRuban();
        tampons.ruban = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tampons.ruban);
        gl.bufferData(gl.ARRAY_BUFFER, ruban.d, gl.STATIC_DRAW);
        tampons.rubanN = ruban.n;
      },
      () => {
        prets.points = programme(POINTS_V, POINTS_F);
      },
      () => {
        prets.nuees = programme(NUEES_V, NUEES_F);
        const nu = construireNuees();
        tampons.nueesA = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tampons.nueesA);
        gl.bufferData(gl.ARRAY_BUFFER, nu.A, gl.STATIC_DRAW);
        tampons.nueesB = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tampons.nueesB);
        gl.bufferData(gl.ARRAY_BUFFER, nu.B, gl.STATIC_DRAW);
        tampons.nueesN = nu.n;
      },
      () => {
        const pts = construirePoints();
        tampons.A = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tampons.A);
        gl.bufferData(gl.ARRAY_BUFFER, pts.A, gl.STATIC_DRAW);
        tampons.B = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tampons.B);
        gl.bufferData(gl.ARRAY_BUFFER, pts.B, gl.STATIC_DRAW);
        programmes = prets;
      },
    ];
    const prets = {};
  }

  /** Exécute une étape d'initialisation ; vrai tant qu'il en reste. */
  function avancer() {
    if (!etapes.length) return false;
    etapes.shift()();
    return etapes.length > 0 || !programmes;
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
  const cam = {
    pos: [0, 0, 0],
    avant: [0, 0, -1],
    droite: [1, 0, 0],
    haut: [0, 1, 0],
    C: [0, 0, 0],
    soleil: [0, 0, 1],
    virage: 300,
    montee: 100,
    fin: 900,
    L: [0, 0, -900],
    nL: [0, 1, 0],
    tan: [1, 1],
    vp: new Float32Array(16),
  };

  function orienter(yaw, pitch) {
    return [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  }

  function calculerCamera() {
    const e = etat;
    const aspect = largeur / hauteur;
    const portrait = aspect < 1;
    // Le zoom de la caméra de la visite resserre légèrement le champ.
    const demi = Math.tan(((portrait ? 64 : 50) * DEG) / 2) * (e.zoom || 1);

    const a = e.approche;
    const ae = a * a * (3 - 2 * a);
    const dist = G.DIST0 + (G.DIST1 - G.DIST0) * ae;

    let pos;
    let avant;
    let C;
    let soleil;

    if (e.orbite < 0.5) {
      // Le voyage, à pied, derrière l'astronaute.
      pos = [ondulation(e.pas) * 0.85 + souris.cx * 0.6, G.H + souris.cy * 0.25, -e.pas];
      C = [pos[0] + dist * G.DECALAGE, G.CY, pos[2] - dist];

      // Le chemin aboutit sur la face visible de la planète, près du
      // limbe : on règle sa courbe pour qu'il passe par ce point.
      const vC = norm([C[0] - pos[0], C[1] - pos[1], C[2] - pos[2]]);
      const xC = norm(croix(vC, [0, 1, 0]));
      const hC = croix(xC, vC);
      const nL = norm([
        hC[0] * 0.62 - vC[0] * 0.72 - xC[0] * 0.3,
        hC[1] * 0.62 - vC[1] * 0.72 - xC[1] * 0.3,
        hC[2] * 0.62 - vC[2] * 0.72 - xC[2] * 0.3,
      ]);
      const L = [C[0] + nL[0] * G.R, C[1] + nL[1] * G.R, C[2] + nL[2] * G.R];
      const dsL = -L[2] - e.pas;
      cam.fin = dsL;
      cam.virage = (L[0] - ondulation(e.pas + dsL) / (1 + dsL / 90)) / Math.pow(dsL / 1000, 1.6);
      cam.L = L;
      cam.nL = nL;
      cam.montee = L[1] / Math.pow((dsL - 20) / 1000, 1.8);
      const yaw = (portrait ? 9 : 4.5) * DEG + souris.cx * 1.2 * DEG + Math.cos(e.pas * 0.021) * 0.6 * DEG;
      const pitch = (-10 - 3 * ae) * DEG + souris.cy * 0.8 * DEG;
      avant = orienter(yaw, pitch);

      // Plongée : l'objectif fond sur la planète.
      // Le point d'arrivée du chemin, d'où l'on regarde le soleil se lever.
      if (e.plongee > 0) {
        const p = e.plongee;
        const pe = p * p * (3 - 2 * p);
        const cible = [cam.L[0] + cam.nL[0] * 14, cam.L[1] + cam.nL[1] * 14, cam.L[2] + cam.nL[2] * 14];
        const vers = norm([cam.L[0] - pos[0], cam.L[1] - pos[1], cam.L[2] - pos[2]]);
        pos = melange(pos, cible, pe);
        avant = norm(melange(avant, vers, Math.min(1, p * 1.6) * 0.7));
      }

      // Course du soleil : de face, puis derrière la planète, puis levant.
      const dirC = norm([C[0] - pos[0], C[1] - pos[1], C[2] - pos[2]]);
      const dC = Math.hypot(C[0] - pos[0], C[1] - pos[1], C[2] - pos[2]);
      const angR = Math.asin(Math.min(G.R / dC, 0.999));
      const haut = norm(croix(croix(dirC, [0, 1, 0]), dirC));
      const t = Math.tan(angR + 0.035);
      const leve = norm([dirC[0] + haut[0] * t, dirC[1] + haut[1] * t, dirC[2] + haut[2] * t]);
      const s0 = norm([-0.85, 0.35, -0.25]);
      const s = e.soleil;
      soleil = s < 0.6 ? norm(melange(s0, dirC, lisse(0, 0.6, s))) : norm(melange(dirC, leve, lisse(0.6, 1, s)));
    } else {
      // La scène finale : en orbite basse, face au lever de soleil.
      const d = e.derive;
      pos = [souris.cx * 0.8, souris.cy * 0.4, 0];
      C = [0, -(G.R + G.ORBITE_H), -30 - d * 20];
      const yaw = (souris.cx * 1.4 + (d - 0.5) * 3) * DEG;
      const pitch = (-9.5 + souris.cy * 0.8 - (portrait ? 2.5 : 0) + (e.regard || 0)) * DEG;
      avant = orienter(yaw, pitch);
      // Le soleil reste juste sous l'horizon : une aube douce, sans éblouir.
      soleil = norm(orienter(0, (-23.6 - (e.regard || 0) * 0.15) * DEG));
    }

    let droite = norm(croix(avant, [0, 1, 0]));
    let haut = croix(droite, avant);

    // Caméra de la visite guidée : un léger panoramique horizontal.
    const lacet = Math.tan((e.lacet || 0) * DEG);
    if (lacet) {
      avant = norm([avant[0] + droite[0] * lacet, avant[1] + droite[1] * lacet, avant[2] + droite[2] * lacet]);
      droite = norm(croix(avant, [0, 1, 0]));
      haut = croix(droite, avant);
    }
    cam.pos = pos;
    cam.avant = avant;
    cam.droite = droite;
    cam.haut = haut;
    cam.C = [C[0] - pos[0], C[1] - pos[1], C[2] - pos[2]];
    cam.soleil = soleil;
    cam.tan = [demi * aspect, demi];

    // Projection × vue (rotation seule : tout est relatif à la caméra).
    const f = 1 / demi;
    const pres = 0.05;
    const loin = 6000;
    const P = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (loin + pres) / (pres - loin), -1, 0, 0, (2 * loin * pres) / (pres - loin), 0];
    const V = [droite[0], haut[0], -avant[0], 0, droite[1], haut[1], -avant[1], 0, droite[2], haut[2], -avant[2], 0, 0, 0, 0, 1];
    const m = cam.vp;
    for (let c = 0; c < 4; c += 1) {
      for (let l = 0; l < 4; l += 1) {
        let v = 0;
        for (let k = 0; k < 4; k += 1) v += P[k * 4 + l] * V[c * 4 + k];
        m[c * 4 + l] = v;
      }
    }
  }

  function projeter(rel) {
    const m = cam.vp;
    const x = m[0] * rel[0] + m[4] * rel[1] + m[8] * rel[2] + m[12];
    const y = m[1] * rel[0] + m[5] * rel[1] + m[9] * rel[2] + m[13];
    const w = m[3] * rel[0] + m[7] * rel[1] + m[11] * rel[2] + m[15];
    if (w <= 0.01) return null;
    return { x: (x / w) * 0.5 + 0.5, y: 0.5 - (y / w) * 0.5, w };
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
    if (lentes > 1500) {
      lentes = 0;
      moyenne = 16.7;
      if (echelleDpr > 0.6) {
        echelleDpr = Math.max(0.55, echelleDpr * 0.85);
        redimensionner();
      } else if (fraction > 0.4) {
        fraction *= 0.75;
      }
    }
  }

  let annonce = false;
  function rendre(temps) {
    if (perdu) return;
    if (!programmes) {
      avancer();
      derniere = 0;
      return;
    }
    const dt = derniere ? (temps - derniere) * 1000 : 16.7;
    derniere = temps;
    adapter(dt);

    souris.cx += (souris.x - souris.cx) * 0.045;
    souris.cy += (souris.y - souris.cy) * 0.045;

    calculerCamera();
    const e = etat;
    const C = cam.C;
    const focal = hauteur / 2 / cam.tan[1];

    // Soleil : visibilité (caché par la planète ?) et place à l'écran.
    const dC = Math.hypot(C[0], C[1], C[2]);
    const angR = Math.asin(Math.min(G.R / dC, 0.999));
    const ecart = Math.acos(Math.min(Math.max(scal(cam.soleil, norm(C)), -1), 1));
    const face = lisse(0.05, 0.35, scal(cam.soleil, cam.avant));
    const vis = lisse(angR - 0.004, angR + 0.03, ecart) * face;

    // Teinte du chemin : blanc froid, réchauffé par le lever du soleil.
    const chaud = lisse(0.55, 1, e.soleil) * (1 - e.orbite);
    const teinte = [1.0, 0.9 + 0.02 * (1 - chaud), 0.78 - 0.16 * chaud];
    const chemin = e.chemin * (1 - lisse(0.15, 0.6, e.plongee)) * (e.orbite < 0.5 ? 1 : 0);

    // Rotation propre de la planète.
    const ang = temps * 0.006 + e.approche * 0.5 + e.derive * 0.3;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const ct = Math.cos(0.41);
    const st = Math.sin(0.41);
    const rot = new Float32Array([ca, st * sa, -ct * sa, 0, ct, st, sa, -st * ca, ct * ca]);
    const angN = ang * 1.18 + 0.35;
    const cn = Math.cos(angN);
    const sn = Math.sin(angN);
    const rotN = new Float32Array([cn, st * sn, -ct * sn, 0, ct, st, sn, -st * cn, ct * cn]);

    gl.viewport(0, 0, largeur, hauteur);
    gl.disable(gl.BLEND);

    // 1. Ciel et planète.
    let p = programmes.ciel;
    gl.useProgram(p.p);
    gl.uniform3fv(p.u.uDroite, cam.droite);
    gl.uniform3fv(p.u.uHaut, cam.haut);
    gl.uniform3fv(p.u.uAvant, cam.avant);
    gl.uniform2fv(p.u.uTan, cam.tan);
    gl.uniform3fv(p.u.uC, C);
    gl.uniform1f(p.u.uR, G.R);
    gl.uniform3fv(p.u.uSoleil, cam.soleil);
    gl.uniformMatrix3fv(p.u.uRot, false, rot);
    gl.uniformMatrix3fv(p.u.uRotN, false, rotN);
    gl.uniform1f(p.u.uExpo, e.expo);
    gl.uniform1f(p.u.uTemps, temps);
    gl.uniform1f(p.u.uPlongee, e.orbite < 0.5 ? e.plongee : 0);
    gl.uniform1f(p.u.uSoleilVis, vis);
    gl.uniform1f(p.u.uGrain, 0.016);
    gl.uniform2f(p.u.uRes, largeur, hauteur);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.surface);
    gl.uniform1i(p.u.uSurf, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.fond);
    gl.uniform1i(p.u.uFond, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, textures.nuages);
    gl.uniform1i(p.u.uNuages, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.plein);
    gl.enableVertexAttribArray(p.a.aP);
    gl.vertexAttribPointer(p.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(p.a.aP);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // 2. Voiles de nébuleuse.
    p = programmes.nuees;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uDroite, cam.droite);
    gl.uniform3fv(p.u.uHaut, cam.haut);
    gl.uniform1f(p.u.uVol, e.vol);
    gl.uniform3fv(p.u.uC, C);
    gl.uniform1f(p.u.uR, G.R);
    gl.uniform1f(p.u.uNuees, 1 - e.plongee * (e.orbite < 0.5 ? 1 : 0) * 0.9);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.fond);
    gl.uniform1i(p.u.uFond, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.nueesA);
    gl.enableVertexAttribArray(p.a.aN);
    gl.vertexAttribPointer(p.a.aN, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.nueesB);
    gl.enableVertexAttribArray(p.a.aC);
    gl.vertexAttribPointer(p.a.aC, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, tampons.nueesN);
    gl.disableVertexAttribArray(p.a.aN);
    gl.disableVertexAttribArray(p.a.aC);

    // 3. et 4. Lueur du chemin : halo large, puis cœur.
    if (chemin > 0.001) {
      p = programmes.ruban;
      gl.useProgram(p.p);
      gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
      gl.uniform3fv(p.u.uCam, cam.pos);
      gl.uniform1f(p.u.uPas, e.pas);
      gl.uniform1f(p.u.uVirage, cam.virage);
      gl.uniform1f(p.u.uMontee, cam.montee);
      gl.uniform1f(p.u.uFin, cam.fin);
      gl.uniform3fv(p.u.uC, C);
      gl.uniform1f(p.u.uR, G.R);
      gl.uniform1f(p.u.uChemin, chemin);
      gl.uniform3fv(p.u.uTeinte, teinte);
      gl.bindBuffer(gl.ARRAY_BUFFER, tampons.ruban);
      gl.enableVertexAttribArray(p.a.aR);
      gl.vertexAttribPointer(p.a.aR, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(p.u.uLarge, 2.5);
      gl.uniform1f(p.u.uNettete, 2.2);
      gl.uniform1f(p.u.uIntensite, 0.1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, tampons.rubanN);
      gl.uniform1f(p.u.uLarge, 1.6);
      gl.uniform1f(p.u.uNettete, 4.5);
      gl.uniform1f(p.u.uIntensite, 0.7);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, tampons.rubanN);
      gl.disableVertexAttribArray(p.a.aR);
    }

    // 5. Étoiles, poussière et grains.
    p = programmes.points;
    gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, cam.vp);
    gl.uniform3fv(p.u.uCam, cam.pos);
    gl.uniform3fv(p.u.uC, C);
    gl.uniform1f(p.u.uR, G.R);
    gl.uniform1f(p.u.uPas, e.pas);
    gl.uniform1f(p.u.uVol, e.vol);
    gl.uniform1f(p.u.uTemps, temps);
    gl.uniform1f(p.u.uFocal, focal);
    gl.uniform1f(p.u.uDpr, dpr);
    gl.uniform1f(p.u.uChemin, chemin);
    gl.uniform1f(p.u.uEtoiles, 1 - e.plongee * 0.8 * (e.orbite < 0.5 ? 1 : 0));
    gl.uniform1f(p.u.uVirage, cam.virage);
    gl.uniform1f(p.u.uMontee, cam.montee);
    gl.uniform1f(p.u.uFin, cam.fin);
    gl.uniform3fv(p.u.uTeinte, teinte);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.A);
    gl.enableVertexAttribArray(p.a.aA);
    gl.vertexAttribPointer(p.a.aA, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampons.B);
    gl.enableVertexAttribArray(p.a.aB);
    gl.vertexAttribPointer(p.a.aB, 4, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < groupes.length; i += 1) {
      const g = groupes[i];
      const n = i >= 3 && chemin <= 0.001 ? 0 : Math.round(g.n * (i >= 3 ? fraction : 1));
      if (n > 0) gl.drawArrays(gl.POINTS, g.debut, n);
    }
    gl.disableVertexAttribArray(p.a.aA);
    gl.disableVertexAttribArray(p.a.aB);

    // Place de l'astronaute, pour la couche DOM.
    const s = e.pas + G.ASTRO;
    const pied = projeter([
      cheminX(s, G.ASTRO, cam.virage) - cam.pos[0],
      cheminY(G.ASTRO, cam.montee) - cam.pos[1],
      -s - cam.pos[2],
    ]);
    if (pied) {
      astro.x = pied.x * (toile.clientWidth || window.innerWidth);
      astro.y = pied.y * (toile.clientHeight || window.innerHeight);
      // Hauteur à l'écran d'un corps de 1,8 m, en pixels CSS.
      astro.echelle = ((1.8 * focal) / pied.w) / dpr;
      astro.visible = true;
    } else {
      astro.visible = false;
    }

    // Première image complète : la toile peut apparaître.
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
    astro,
    rendre,
    redimensionner,
    /** Achève l'initialisation d'un coup (décor immobile). */
    preparer() {
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
