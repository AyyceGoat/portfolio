/* ------------------------------------------------------------------
   La geante du hero, calculee en temps reel.

   Une sphere et un plan d'anneaux lances en rayons, dans un seul
   fragment shader :
   - la surface est une texture de bandes et de tempetes, calculee une
     seule fois au demarrage, puis enroulee sur la sphere et tournee
     lentement autour de l'axe des anneaux ;
   - l'eclairage vient d'une etoile en haut a gauche : diffusion douce,
     assombrissement du limbe, atmosphere lumineuse sur le bord eclaire ;
   - les anneaux portent leur ombre sur la planete, la planete porte la
     sienne sur les anneaux, et la moitie arriere passe derriere le globe.

   Cadence : 30 images par seconde au plus, et seulement quand le hero
   est a l'ecran. Une image fixe suffit au niveau sans animation.
   ------------------------------------------------------------------ */

const PLEIN = `
  attribute vec2 aPos;
  varying vec2 vP;
  void main() {
    vP = aPos;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const ENTETE = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
`;

/* Texture equirectangulaire de la surface : longitude en x, latitude en y. */
const SURFACE = `${ENTETE}
  varying vec2 vP;

  float h(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float bruit(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h(i), h(i + vec3(1, 0, 0)), f.x), mix(h(i + vec3(0, 1, 0)), h(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(h(i + vec3(0, 0, 1)), h(i + vec3(1, 0, 1)), f.x), mix(h(i + vec3(0, 1, 1)), h(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      s += a * bruit(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s;
  }

  // Tempete ovale : centre en longitude et latitude, demi-axes en radians.
  float ovale(float lon, float lat, float lon0, float lat0, vec2 ax) {
    float dl = mod(lon - lon0 + 3.14159265, 6.2831853) - 3.14159265;
    return length(vec2(dl * cos(lat) / ax.x, (lat - lat0) / ax.y));
  }

  void main() {
    float lon = (vP.x * 0.5 + 0.5) * 6.2831853;
    float lat = vP.y * 1.5707963;
    vec3 P = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));

    // Latitude deformee par les courants : les bandes ondulent.
    float w = fbm(P * 2.4);
    float w2 = fbm(P * vec3(6.0, 2.5, 6.0) + w * 2.0);
    float y = P.y + 0.045 * (w2 - 0.5) + 0.012 * (fbm(P * 13.0) - 0.5);

    // Zones et ceintures : peu contrastees, comme sur les vraies geantes.
    float b1 = 0.5 + 0.5 * sin(y * 19.0 + 1.4 * sin(y * 5.0));
    float b2 = 0.5 + 0.5 * sin(y * 47.0 + w * 3.0);
    float b3 = 0.5 + 0.5 * sin(y * 113.0 + w2 * 5.0);
    float t = mix(mix(b1, b2, 0.3), b3, 0.18);

    vec3 ceinture = vec3(0.15, 0.26, 0.44);
    vec3 zone = vec3(0.44, 0.58, 0.76);
    vec3 brume = vec3(0.76, 0.84, 0.92);
    vec3 col = mix(ceinture, zone, smoothstep(0.15, 0.85, t));
    col = mix(col, brume, smoothstep(0.78, 1.0, t) * 0.35);

    // Equateur plus clair et plus chaud, poles plus sombres et plus bleus.
    float eq = smoothstep(0.22, 0.0, abs(y - 0.03));
    col = mix(col, vec3(0.70, 0.74, 0.80), eq * 0.45);
    col *= mix(0.55, 1.0, smoothstep(0.95, 0.35, abs(P.y)));

    // Filaments etires par la rotation.
    float fil = fbm(vec3(P.x * 4.0, y * 70.0, P.z * 4.0));
    col *= 0.9 + 0.2 * fil;

    // Une tempete claire, entouree d'un remous sombre.
    float e = ovale(lon, lat, 1.9, -0.34, vec2(0.16, 0.07));
    col *= 1.0 - 0.3 * smoothstep(1.5, 1.05, e) * smoothstep(0.7, 1.05, e);
    col = mix(col, brume, smoothstep(1.0, 0.25, e) * 0.75);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const RENDU = `${ENTETE}
  varying vec2 vP;
  uniform sampler2D uSurface;
  uniform float uRot;
  uniform float uPx;

  const float R = 0.40;
  const float RIN = 0.50;   // 1.25 R
  const float ROUT = 0.93;  // ~2.3 R
  const float LARG = 0.43;  // ROUT - RIN

  // Axe de rotation (normale des anneaux), lumiere de l'etoile, et deux
  // vecteurs de l'equateur pour la longitude.
  const vec3 AXE = vec3(-0.2182, 0.9407, 0.2600);
  const vec3 LUM = vec3(-0.9087, 0.3207, 0.2673);
  const vec3 E1 = vec3(0.9759, 0.2264, 0.0);
  const vec3 E2 = vec3(-0.0589, 0.2538, -0.9655);

  const vec3 SOLEIL = vec3(1.0, 0.95, 0.88);
  const vec3 CIEL = vec3(0.38, 0.64, 1.0);

  // Une onde de la structure des anneaux, eteinte quand elle devient plus
  // fine que le pixel : sans cela, le moire.
  float onde(float x, float f, float ph, float w) {
    return sin(x * f + ph) * clamp(1.0 - f * w * 0.3, 0.0, 1.0);
  }

  // Densite des anneaux, x de 0 (bord interieur) a 1 (bord exterieur) ;
  // w est la largeur d'un pixel dans la meme unite.
  float anneau(float x, float w) {
    if (x < 0.0 || x > 1.0) return 0.0;
    float d = 0.22;                                                   // anneau C, tenu
    d = mix(d, 0.92, smoothstep(0.2 - w, 0.24 + w, x));               // anneau B, dense
    d = mix(d, 0.06, smoothstep(0.6 - w, 0.62 + w, x));               // division de Cassini
    d = mix(d, 0.68, smoothstep(0.665 - w, 0.68 + w, x));             // anneau A
    d *= 1.0 - 0.75 * smoothstep(0.012 + w, 0.0, abs(x - 0.9));       // division d'Encke
    d *= 1.0 + 0.16 * onde(x, 41.0, 0.3, w) + 0.1 * onde(x, 97.0, 1.1, w) + 0.07 * onde(x, 233.0, 2.0, w);
    d *= smoothstep(0.0, 0.04 + w, x) * smoothstep(1.0, 0.97 - w, x);
    return clamp(d, 0.0, 1.0);
  }

  vec3 teinte(float x) {
    vec3 c = mix(vec3(0.55, 0.52, 0.5), vec3(0.86, 0.8, 0.7), smoothstep(0.18, 0.4, x));
    return mix(c, vec3(0.74, 0.74, 0.76), smoothstep(0.62, 0.9, x));
  }

  // Ombre de la planete sur un point P des anneaux, a bord flou.
  float ombrePlanete(vec3 P) {
    float b = dot(P, LUM);
    if (b > 0.0) return 1.0;
    float dmin = sqrt(max(dot(P, P) - b * b, 0.0));
    return smoothstep(R * 0.97, R * 1.04, dmin);
  }

  float rayonAnneau(vec2 p) {
    float t = -(p.x * AXE.x + p.y * AXE.y) / AXE.z;
    return length(vec3(p, t));
  }

  void main() {
    vec2 p = vP;
    float l = length(p);
    vec4 acc = vec4(0.0);

    // Halo atmospherique, nourri par le cote eclaire.
    vec2 l2 = normalize(LUM.xy);
    float cote = dot(p / max(l, 1e-4), l2);
    float ecart = max(l - R, 0.0);
    float halo = (exp(-ecart * 55.0) * 0.9 + exp(-ecart * 14.0) * 0.22) * smoothstep(-0.6, 0.9, cote);
    halo *= step(R, l);
    acc = vec4(CIEL * halo, halo * 0.8);

    // Plan des anneaux, vu par un rayon parti de la camera vers -z.
    float tA = -(p.x * AXE.x + p.y * AXE.y) / AXE.z;
    vec3 PA = vec3(p, tA);
    float rA = length(PA);
    float w = max(abs(rayonAnneau(p + vec2(uPx, 0.0)) - rA), abs(rayonAnneau(p + vec2(0.0, uPx)) - rA)) / LARG;
    float xA = (rA - RIN) / LARG;
    float dA = anneau(xA, w);

    // Planete.
    float zP = -1.0;
    if (l < R + uPx) {
      float z = sqrt(max(R * R - l * l, 0.0));
      zP = z;
      vec3 n = vec3(p, z) / R;

      // atan(y, 0) n'est pas defini partout : le centre du disque
      // sortait en point noir sur certains pilotes.
      float ex = dot(n, E1);
      ex = abs(ex) < 1e-4 ? 1e-4 : ex;
      float lon = atan(dot(n, E2), ex) + uRot;
      float lat = asin(clamp(dot(n, AXE), -1.0, 1.0));
      vec3 surf = texture2D(uSurface, vec2(lon / 6.2831853, lat / 3.1415927 + 0.5)).rgb;

      // Terminateur doux : l'atmosphere diffuse un peu au-dela.
      float nl = dot(n, LUM);
      float diff = smoothstep(-0.12, 0.75, nl);
      diff *= mix(0.7, 1.0, pow(max(n.z, 0.0), 0.5));

      // Ombre des anneaux sur le globe.
      vec3 S = n * R;
      float tO = -dot(S, AXE) / dot(LUM, AXE);
      float ombre = 1.0;
      if (tO > 0.0) {
        float xO = (length(S + LUM * tO) - RIN) / LARG;
        ombre = 1.0 - 0.85 * anneau(xO, 0.004);
      }

      // Face nocturne : un peu de lumiere renvoyee par les anneaux.
      float renvoi = 0.05 * smoothstep(0.1, -0.5, nl) * smoothstep(0.0, 0.8, dot(n, AXE));

      vec3 c = surf * SOLEIL * diff * ombre * 1.35 + surf * renvoi;

      // Atmosphere : un liseré bleu lumineux sur le limbe eclaire.
      float bord = pow(1.0 - max(n.z, 0.0), 3.0);
      c = mix(c, CIEL * 1.1, bord * 0.85 * smoothstep(-0.3, 0.5, nl));
      c += CIEL * 0.12 * smoothstep(0.3, 0.0, abs(nl + 0.05)) * pow(1.0 - n.z, 1.5);

      float couv = smoothstep(R + uPx, R - uPx, l);
      acc = vec4(c, 1.0) * couv + acc * (1.0 - couv);
    }

    // Anneaux : la moitie avant passe devant le globe, l'arriere derriere.
    if (dA > 0.0 && (zP < 0.0 || tA > zP)) {
      float o = ombrePlanete(PA);
      vec3 c = teinte(xA) * SOLEIL * (0.25 + 0.75 * dot(AXE, LUM)) * mix(0.04, 1.0, o) * 1.25;
      float a = dA * 0.9;
      acc = vec4(c * a, a) + acc * (1.0 - a);
    }

    gl_FragColor = acc;
  }
`;

function compiler(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function programme(gl, frag) {
  const p = gl.createProgram();
  gl.attachShader(p, compiler(gl, gl.VERTEX_SHADER, PLEIN));
  gl.attachShader(p, compiler(gl, gl.FRAGMENT_SHADER, frag));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('programme');
  return p;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ dpr:number, fps:number, fixe:boolean, surPrete:()=>void }} options
 */
export function creerPlanete(canvas, options) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    // Rendu a la demande : le tampon doit survivre a la composition.
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  let progSurface;
  let progRendu;
  try {
    progSurface = programme(gl, SURFACE);
    progRendu = programme(gl, RENDU);
  } catch (err) {
    return null;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  /* --- Surface : calculee une fois, dans une texture ----------------- */
  const LT = 1024;
  const HT = 512;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LT, HT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  gl.viewport(0, 0, LT, HT);
  gl.useProgram(progSurface);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.deleteProgram(progSurface);

  gl.useProgram(progRendu);
  const uRot = gl.getUniformLocation(progRendu, 'uRot');
  const uPx = gl.getUniformLocation(progRendu, 'uPx');
  gl.uniform1i(gl.getUniformLocation(progRendu, 'uSurface'), 0);
  gl.clearColor(0, 0, 0, 0);

  /* --- Boucle ---------------------------------------------------------- */
  const TOUR = 100000; // une rotation complete en cent secondes
  const pas = 1000 / options.fps;
  let frame = 0;
  let attente = 0;
  let dernier = 0;
  let enVue = true;
  let visible = document.visibilityState !== 'hidden';
  let premiere = true;
  const depart = performance.now();

  function dimensionner() {
    const dpr = Math.min(window.devicePixelRatio || 1, options.dpr);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    if (canvas.width !== w) {
      canvas.width = w;
      canvas.height = w;
    }
    gl.viewport(0, 0, w, w);
    gl.uniform1f(uPx, 2.0 / w);
  }

  function peindre(t) {
    const rot = options.fixe ? 0 : (((t - depart) / TOUR) % 1) * Math.PI * 2;
    gl.uniform1f(uRot, rot);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (premiere) {
      premiere = false;
      options.surPrete();
    }
  }

  /* On ne demande une image au navigateur que lorsqu'elle est due : un
     requestAnimationFrame a chaque rafraichissement, meme sans rien
     peindre, lui impose a chaque fois style, intersections et commit. */
  function image(t) {
    frame = 0;
    if (!enVue || !visible) return;
    dernier = t;
    peindre(t);
    relancer();
  }

  function relancer() {
    if (options.fixe || frame || attente || !enVue || !visible) return;
    const reste = Math.max(0, dernier + pas - performance.now() - 4);
    attente = window.setTimeout(() => {
      attente = 0;
      if (enVue && visible) frame = requestAnimationFrame(image);
    }, reste);
  }

  dimensionner();
  peindre(performance.now());

  const ro = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        dimensionner();
        peindre(performance.now());
      })
    : null;
  if (ro) ro.observe(canvas);

  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((e) => {
        enVue = e[e.length - 1].isIntersecting;
        relancer();
      })
    : null;
  if (io) io.observe(canvas);

  const surVisibilite = () => {
    visible = document.visibilityState !== 'hidden';
    relancer();
  };
  document.addEventListener('visibilitychange', surVisibilite);
  relancer();

  return {
    detruire() {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(attente);
      frame = 0;
      attente = 0;
      enVue = false;
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', surVisibilite);
      gl.deleteTexture(tex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(progRendu);
    },
  };
}
