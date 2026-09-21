/* ------------------------------------------------------------------
   Ondulation au survol des captures de projet.

   WebGL brut, sans bibliotheque : l'effet ne depend donc pas du
   chargement de three.js et pese quelques centaines d'octets.

   Un seul contexte graphique est cree pour toute la page, puis
   deplace d'une carte a l'autre. Creer un contexte par carte
   couterait cher et epuiserait le quota du navigateur.
   ------------------------------------------------------------------ */

const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision mediump float;

  uniform sampler2D uTex;
  uniform vec2 uMouse;    // position du curseur, en coordonnees de texture
  uniform float uTime;
  uniform float uForce;   // monte a 1 a l'entree, retombe a la sortie
  uniform float uRatio;   // rapport largeur/hauteur, pour un cercle rond

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Distance au curseur, corrigee du rapport d'image : sans cela
    // l'onde serait ovale sur une vignette large.
    vec2 d = (uv - uMouse) * vec2(uRatio, 1.0);
    float dist = length(d);

    // Train d'ondes concentriques qui s'eteint avec la distance.
    float onde = sin(dist * 26.0 - uTime * 5.0) * exp(-dist * 7.0);

    // Deplacement le long du rayon. L'amplitude reste faible :
    // l'image doit fremir, pas se tordre.
    vec2 dir = dist > 0.0001 ? normalize(uv - uMouse) : vec2(0.0);
    uv += dir * onde * uForce * 0.016;

    gl_FragColor = texture2D(uTex, clamp(uv, 0.001, 0.999));
  }
`;

let contexte = null;

function compiler(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || 'compilation impossible');
  }
  return s;
}

/** Cree — une seule fois — le canevas et son programme. */
function obtenirContexte() {
  if (contexte) return contexte;

  const canvas = document.createElement('canvas');
  canvas.className = 'ondulation';
  canvas.setAttribute('aria-hidden', 'true');

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
  });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compiler(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compiler(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  // Un simple quadrilatere couvrant tout l'ecran.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  contexte = {
    canvas,
    gl,
    texture,
    u: {
      tex: gl.getUniformLocation(prog, 'uTex'),
      mouse: gl.getUniformLocation(prog, 'uMouse'),
      time: gl.getUniformLocation(prog, 'uTime'),
      force: gl.getUniformLocation(prog, 'uForce'),
      ratio: gl.getUniformLocation(prog, 'uRatio'),
    },
    hote: null,
    frame: 0,
    force: 0,
    cible: 0,
    mx: 0.5,
    my: 0.5,
    depart: 0,
  };
  return contexte;
}

/** L'effet a-t-il sa place ici ? (survol precis, animation permise) */
export function ondulationPossible() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl');
  } catch (e) {
    return false;
  }
}

function boucle() {
  const c = contexte;
  if (!c || !c.hote) return;

  c.force += (c.cible - c.force) * 0.12;

  // Sortie terminee : on range le canevas et on libere la boucle.
  if (c.cible === 0 && c.force < 0.01) {
    c.force = 0;
    c.canvas.classList.remove('is-on');
    c.hote = null;
    c.frame = 0;
    return;
  }

  const { gl, u } = c;
  gl.uniform1f(u.time, (performance.now() - c.depart) * 0.001);
  gl.uniform1f(u.force, c.force);
  gl.uniform2f(u.mouse, c.mx, c.my);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  c.frame = requestAnimationFrame(boucle);
}

/**
 * Pose l'effet sur une vignette.
 * @param {HTMLElement} hote   le conteneur de l'image
 * @param {HTMLImageElement} image  la capture, deja chargee
 */
export function poser(hote, image) {
  const c = obtenirContexte();
  if (!c || !image || !image.complete || !image.naturalWidth) return;

  const r = hote.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr);
  const h = Math.round(r.height * dpr);

  if (c.canvas.width !== w || c.canvas.height !== h) {
    c.canvas.width = w;
    c.canvas.height = h;
  }
  c.gl.viewport(0, 0, w, h);
  c.gl.uniform1f(c.u.ratio, r.width / r.height);
  c.gl.uniform1i(c.u.tex, 0);

  // La texture n'est renvoyee que si l'on change de vignette.
  if (c.image !== image) {
    c.image = image;
    c.gl.bindTexture(c.gl.TEXTURE_2D, c.texture);
    c.gl.texImage2D(c.gl.TEXTURE_2D, 0, c.gl.RGBA, c.gl.RGBA, c.gl.UNSIGNED_BYTE, image);
  }

  if (c.canvas.parentElement !== hote) hote.appendChild(c.canvas);
  c.canvas.classList.add('is-on');

  c.hote = hote;
  c.cible = 1;
  c.depart = performance.now();
  if (!c.frame) c.frame = requestAnimationFrame(boucle);
}

/** Position du curseur, en fraction de la vignette. */
export function viser(x, y) {
  if (!contexte) return;
  contexte.mx = x;
  contexte.my = 1 - y; // la texture est retournee verticalement
}

/** Lance l'extinction : la boucle s'arretera d'elle-meme. */
export function retirer() {
  if (!contexte) return;
  contexte.cible = 0;
  if (!contexte.frame && contexte.hote) {
    contexte.frame = requestAnimationFrame(boucle);
  }
}
