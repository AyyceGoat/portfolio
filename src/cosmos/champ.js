/* ------------------------------------------------------------------
   Champ d'etoiles en WebGL brut.

   Chaque etoile est une capsule dessinee dans un seul appel de rendu.
   Au repos c'est un point lumineux qui scintille ; quand on defile vite,
   elle s'etire en trainee — le saut en vitesse lumiere, proportionnel a
   la vitesse reelle du defilement. Les etoiles proches bougent plus que
   les lointaines : c'est la parallaxe qui donne la profondeur.

   Economie d'energie : la cadence suit l'activite. 60 i/s pendant qu'on
   defile ou qu'on bouge la souris, 30 au repos, moins encore apres
   quelques secondes, et sur telephone le rendu s'arrete tout a fait
   quand la page est immobile. Onglet masque : arret complet.
   ------------------------------------------------------------------ */

const VERT = `
  precision highp float;
  attribute vec3 aPos;     // x, y dans [-1,1], profondeur dans ]0,1]
  attribute vec3 aInfo;    // rayon, graine, chaleur de la couleur
  attribute vec2 aCoin;    // coin du quadrilatere : (+-1, +-1)

  uniform vec2 uRes;       // taille en pixels CSS
  uniform vec2 uPtr;       // curseur lisse, de -1 a 1
  uniform float uDefil;    // position de defilement lissee
  uniform float uVit;      // vitesse de defilement, pixels par image
  uniform float uTemps;
  uniform float uIntro;    // 1 au chargement, retombe a 0
  uniform float uElan;     // impulsion au passage d'une section

  varying vec2 vLoc;
  varying float vDemi;
  varying float vRayon;
  varying float vAlpha;
  varying vec3 vCouleur;

  void main() {
    float proche = 1.0 - aPos.z;
    float par = 0.05 + proche * proche;

    float hauteur = uRes.y * 1.4;
    vec2 c = vec2(aPos.x * uRes.x * 0.56, aPos.y * hauteur * 0.5);

    c += uPtr * vec2(-28.0, -20.0) * par;
    c.y += uDefil * 0.30 * par;
    c.y = mod(c.y + hauteur * 0.5, hauteur) - hauteur * 0.5;

    // Entree en vitesse lumiere : les etoiles jaillissent du centre.
    float lc = length(c) + 0.001;
    vec2 radial = c / lc;
    c -= radial * uIntro * uIntro * lc * 0.82;

    vec2 trainee = vec2(0.0, uVit * (1.6 + 10.0 * par) * (1.0 + 2.2 * uElan));
    trainee += radial * uIntro * (30.0 + 760.0 * par);

    float rayon = aInfo.x * (0.55 + 1.35 * proche);
    float lon = length(trainee);
    vec2 dir = lon > 0.4 ? trainee / lon : vec2(0.0, 1.0);
    vec2 nrm = vec2(-dir.y, dir.x);
    float demi = lon * 0.5;
    float bord = rayon + 1.5;

    vec2 p = c - dir * demi
           + nrm * aCoin.x * bord
           + dir * aCoin.y * (demi + bord);

    gl_Position = vec4(p / (uRes * 0.5), 0.0, 1.0);

    vLoc = vec2(aCoin.x * bord, aCoin.y * (demi + bord));
    vDemi = demi;
    vRayon = rayon;

    float scint = 0.7 + 0.3 * sin(uTemps * (0.4 + aInfo.y * 2.0) + aInfo.y * 61.0);
    float energie = rayon / (rayon + lon * 0.3);
    vAlpha = (0.3 + 0.7 * proche) * scint * mix(1.0, min(1.0, energie * 1.8), step(0.4, lon));
    vCouleur = mix(vec3(0.76, 0.85, 1.0), vec3(1.0, 0.86, 0.72), aInfo.z);
  }
`;

const FRAG = `
  precision mediump float;
  varying vec2 vLoc;
  varying float vDemi;
  varying float vRayon;
  varying float vAlpha;
  varying vec3 vCouleur;
  uniform float uGain;

  void main() {
    vec2 q = vec2(vLoc.x, max(abs(vLoc.y) - vDemi, 0.0));
    float d = length(q) / max(vRayon, 0.35);
    float a = (exp(-d * d * 2.4) + exp(-d * 1.7) * 0.22) * vAlpha * uGain;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vCouleur * a, a);
  }
`;

function compiler(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

/** Generateur pseudo-aleatoire reproductible : le ciel est le meme a chaque visite. */
function alea(graine) {
  let s = graine;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function construireEtoiles(gl, n) {
  const r = alea(20251002);
  const pos = new Float32Array(n * 4 * 3);
  const info = new Float32Array(n * 4 * 3);
  const coin = new Float32Array(n * 4 * 2);
  const idx = new Uint16Array(n * 6);
  const coins = [-1, -1, 1, -1, 1, 1, -1, 1];

  for (let i = 0; i < n; i++) {
    // Beaucoup d'etoiles lointaines, peu de proches : profondeur credible.
    const z = 0.08 + 0.92 * Math.pow(r(), 0.55);
    const x = r() * 2 - 1;
    const y = r() * 2 - 1;
    const m = Math.pow(r(), 6);
    const rayon = 0.55 + m * 1.9;
    const graine = r();
    const chaud = r() < 0.12 ? 0.6 + r() * 0.4 : r() * 0.15;

    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k;
      pos.set([x, y, z], v * 3);
      info.set([rayon, graine, chaud], v * 3);
      coin[v * 2] = coins[k * 2];
      coin[v * 2 + 1] = coins[k * 2 + 1];
    }
    const b = i * 4;
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6);
  }

  const tampon = (data, cible = gl.ARRAY_BUFFER) => {
    const t = gl.createBuffer();
    gl.bindBuffer(cible, t);
    gl.bufferData(cible, data, gl.STATIC_DRAW);
    return t;
  };
  return {
    pos: tampon(pos),
    info: tampon(info),
    coin: tampon(coin),
    idx: tampon(idx, gl.ELEMENT_ARRAY_BUFFER),
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{etoiles:number, dpr:number, repos:number, sommeil:number, arret:number}} reglages
 * @param {{ intro:boolean, surDeclassement:(niveau:string)=>void, surCalques:(x:number,y:number,d:number)=>void }} options
 */
export function creerChamp(canvas, reglages, options) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compiler(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compiler(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = construireEtoiles(gl, reglages.etoiles);
  const lier = (nom, tampon, taille) => {
    const loc = gl.getAttribLocation(prog, nom);
    gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, taille, gl.FLOAT, false, 0, 0);
  };
  lier('aPos', buf.pos, 3);
  lier('aInfo', buf.info, 3);
  lier('aCoin', buf.coin, 2);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.idx);

  const u = {};
  ['uRes', 'uPtr', 'uDefil', 'uVit', 'uTemps', 'uIntro', 'uElan', 'uGain'].forEach((n) => {
    u[n] = gl.getUniformLocation(prog, n);
  });

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  /* --- etat --------------------------------------------------------- */

  const e = {
    nombre: reglages.etoiles,
    ptrX: 0,
    ptrY: 0,
    cibleX: 0,
    cibleY: 0,
    defil: window.scrollY,
    vit: 0,
    elan: 0,
    intro: options.intro ? 1 : 0,
    depart: performance.now(),
    dernierRendu: 0,
    derniereActivite: performance.now(),
    frame: 0,
    actif: false,
    visible: document.visibilityState !== 'hidden',
    mesures: [],
    derniereImage: 0,
    largeur: 1,
    hauteur: 1,
  };

  function dimensionner() {
    const dpr = Math.min(window.devicePixelRatio || 1, reglages.dpr);
    e.largeur = window.innerWidth;
    e.hauteur = window.innerHeight;
    canvas.width = Math.round(e.largeur * dpr);
    canvas.height = Math.round(e.hauteur * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uRes, e.largeur, e.hauteur);
    reveiller();
  }

  /* --- garde-fou de cadence ----------------------------------------
     Pendant les premieres secondes d'activite, on mesure l'intervalle
     reel entre deux images. Si l'appareil ne suit pas, on dessine moins
     d'etoiles ; s'il ne suit toujours pas, on rend la main au ciel fixe
     peint en CSS. Le lecteur ne voit jamais une page qui rame. */
  let palier = 0;
  function surveiller(dt) {
    if (palier > 1 || dt > 200) return;
    e.mesures.push(dt);
    if (e.mesures.length < 50) return;
    const tri = e.mesures.slice().sort((a, b) => a - b);
    const mediane = tri[Math.floor(tri.length / 2)];
    e.mesures = [];
    if (mediane > 24) {
      palier += 1;
      if (palier === 1) {
        e.nombre = Math.floor(e.nombre * 0.45);
      } else {
        options.surDeclassement('fixe');
      }
    } else {
      palier = 2; // la cadence tient : on cesse de mesurer
    }
  }

  /* --- boucle -------------------------------------------------------- */

  function image(t) {
    if (!e.actif) return;
    e.frame = requestAnimationFrame(image);

    const calme = t - e.derniereActivite;
    if (reglages.arret && calme > reglages.arret && e.intro === 0 && e.elan < 0.01) {
      // Page immobile sur telephone : derniere image conservee, plus rien
      // ne tourne. Le moindre geste relance la boucle.
      arreter();
      return;
    }
    const pas = calme < 1500 || e.intro > 0 || e.elan > 0.01 ? 0 : calme < 6000 ? reglages.repos : reglages.sommeil;
    if (pas && t - e.dernierRendu < pas - 1) return;

    const dt = e.derniereImage ? t - e.derniereImage : 16.7;
    e.derniereImage = t;
    if (calme < 1500 && !pas) surveiller(dt);
    const k = Math.min(dt / 16.7, 3);
    e.dernierRendu = t;

    // Lissage du defilement : la vitesse alimente l'etirement.
    const cible = window.scrollY;
    const avant = e.defil;
    e.defil += (cible - e.defil) * Math.min(1, 0.14 * k);
    const v = (e.defil - avant) / k;
    e.vit += (v - e.vit) * Math.min(1, 0.25 * k);

    e.ptrX += (e.cibleX - e.ptrX) * Math.min(1, 0.06 * k);
    e.ptrY += (e.cibleY - e.ptrY) * Math.min(1, 0.06 * k);

    if (e.intro > 0) {
      const p = Math.min(1, (t - e.depart) / 1700);
      e.intro = Math.pow(1 - p, 3);
      if (p >= 1) e.intro = 0;
    }
    e.elan *= Math.pow(0.955, k);
    if (e.elan < 0.002) e.elan = 0;

    gl.uniform2f(u.uPtr, e.ptrX, e.ptrY);
    gl.uniform1f(u.uDefil, e.defil);
    gl.uniform1f(u.uVit, Math.max(-60, Math.min(60, e.vit)));
    gl.uniform1f(u.uTemps, (t - e.depart) * 0.001);
    gl.uniform1f(u.uIntro, e.intro);
    gl.uniform1f(u.uElan, e.elan);
    gl.uniform1f(u.uGain, 1 - e.intro * 0.35);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, e.nombre * 6, gl.UNSIGNED_SHORT, 0);

    options.surCalques(e.ptrX, e.ptrY, e.defil);
  }

  function demarrer() {
    if (e.actif || !e.visible) return;
    e.actif = true;
    e.derniereImage = 0;
    e.frame = requestAnimationFrame(image);
  }

  function arreter() {
    e.actif = false;
    cancelAnimationFrame(e.frame);
  }

  function reveiller() {
    e.derniereActivite = performance.now();
    demarrer();
  }

  /* --- ecouteurs ------------------------------------------------------ */

  const surDefil = () => reveiller();
  const surPointeur = (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse') return;
    e.cibleX = (ev.clientX / e.largeur) * 2 - 1;
    e.cibleY = -((ev.clientY / e.hauteur) * 2 - 1);
    reveiller();
  };
  const surToucher = () => reveiller();
  const surVisibilite = () => {
    e.visible = document.visibilityState !== 'hidden';
    if (e.visible) reveiller();
    else arreter();
  };

  window.addEventListener('scroll', surDefil, { passive: true });
  window.addEventListener('pointermove', surPointeur, { passive: true });
  window.addEventListener('touchstart', surToucher, { passive: true });
  window.addEventListener('resize', dimensionner, { passive: true });
  document.addEventListener('visibilitychange', surVisibilite);

  dimensionner();

  return {
    /** Impulsion de vitesse lumiere au passage d'une section. */
    elan() {
      e.elan = 1;
      reveiller();
    },
    detruire() {
      arreter();
      window.removeEventListener('scroll', surDefil);
      window.removeEventListener('pointermove', surPointeur);
      window.removeEventListener('touchstart', surToucher);
      window.removeEventListener('resize', dimensionner);
      document.removeEventListener('visibilitychange', surVisibilite);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    },
  };
}
