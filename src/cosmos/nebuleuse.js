/* ------------------------------------------------------------------
   Les nuees — le decor du voyage.

   Un seul quadrilatere plein ecran, peint par un shader. Trois plans de
   nuages se superposent, chacun defilant a sa propre vitesse : c'est ce
   decalage qui donne la profondeur. La palette, elle, se deplace avec la
   page — chaque section traverse une region du ciel qui lui est propre,
   de l'indigo du debut a l'or de la fin.

   Cout : l'image n'est recalculee que lorsque la position de lecture ou
   le curseur ont vraiment bouge, et jamais a pleine resolution. Page
   immobile, rien ne tourne.
   ------------------------------------------------------------------ */

const VERT = 'attribute vec2 aCoin;void main(){gl_Position=vec4(aCoin,0.,1.);}';

const FRAG = `
  precision highp float;

  uniform vec2 uRes;      // taille du tampon, en pixels
  uniform float uVoyage;  // progression dans la page, de 0 a 1
  uniform vec2 uPtr;      // curseur lisse, de -1 a 1
  uniform float uLarge;   // 1 sur un ecran large, 0 sur un ecran etroit

  float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float bruit(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
               mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

  float fbm3(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * bruit(p); p = ROT * p * 2.07 + 1.7; a *= 0.5; }
    return v;
  }

  float fbm5(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * bruit(p); p = ROT * p * 2.03 + 3.1; a *= 0.5; }
    return v;
  }

  /* --- Les six regions traversees -----------------------------------
     cA : la masse sombre et coloree du nuage
     cB : la lumiere qui le traverse
     cC : les points chauds, filaments et coeurs  */
  void palette(float j, out vec3 cA, out vec3 cB, out vec3 cC) {
    cA = vec3(0.090, 0.130, 0.460);   // 0 — indigo profond
    cB = vec3(0.110, 0.470, 0.720);   //     bleu d'etoile
    cC = vec3(0.980, 0.820, 0.520);   //     or

    float t = smoothstep(0.0, 1.0, j - 0.15);
    cA = mix(cA, vec3(0.320, 0.110, 0.560), t);   // 1 — violet
    cB = mix(cB, vec3(0.700, 0.170, 0.520), t);   //     magenta
    cC = mix(cC, vec3(0.960, 0.780, 1.000), t);

    t = smoothstep(0.0, 1.0, j - 1.15);
    cA = mix(cA, vec3(0.055, 0.160, 0.520), t);   // 2 — bleu d'encre
    cB = mix(cB, vec3(0.190, 0.560, 0.980), t);   //     azur
    cC = mix(cC, vec3(0.820, 0.920, 1.000), t);

    t = smoothstep(0.0, 1.0, j - 2.15);
    cA = mix(cA, vec3(0.430, 0.090, 0.450), t);   // 3 — pourpre
    cB = mix(cB, vec3(0.840, 0.220, 0.470), t);   //     magenta chaud
    cC = mix(cC, vec3(1.000, 0.830, 0.460), t);   //     or

    t = smoothstep(0.0, 1.0, j - 3.15);
    cA = mix(cA, vec3(0.040, 0.165, 0.420), t);   // 4 — nuit froide
    cB = mix(cB, vec3(0.090, 0.620, 0.730), t);   //     turquoise
    cC = mix(cC, vec3(0.860, 0.960, 1.000), t);

    t = smoothstep(0.0, 1.0, j - 4.15);
    cA = mix(cA, vec3(0.270, 0.100, 0.500), t);   // 5 — violet et or
    cB = mix(cB, vec3(0.880, 0.520, 0.210), t);
    cC = mix(cC, vec3(1.000, 0.930, 0.790), t);
  }

  /* Galaxie spirale vue de trois quarts : deux bras logarithmiques
     et un bulbe. Elle s'allume dans deux regions du voyage. */
  float galaxie(vec2 q, float rot) {
    q = vec2(q.x, q.y * 2.35);                 // disque incline
    q = mat2(0.94, 0.34, -0.34, 0.94) * q;
    float r = length(q);
    float a = atan(q.y, q.x);
    float bras = sin(2.0 * (a + log(r + 0.055) * 3.1 + rot));
    float m = exp(-r * 3.4) * (0.22 + 0.78 * pow(max(bras, 0.0), 1.6));
    m *= 0.55 + 0.45 * fbm3(q * 9.0 + rot);
    m += exp(-r * r * 90.0) * 1.15;            // bulbe central
    return m;
  }

  void main() {
    vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
    float j = clamp(uVoyage, 0.0, 1.0) * 5.0;

    vec3 cA, cB, cC;
    palette(j, cA, cB, cC);

    // Trois plans, trois vitesses : le lointain glisse a peine, le
    // premier plan file. C'est toute la profondeur du decor.
    vec2 pA = p * 1.80 + vec2(uPtr.x * 0.010, -uVoyage * 0.50) + vec2(2.0, 0.0);
    vec2 pB = p * 3.60 + vec2(uPtr.x * 0.034, -uVoyage * 1.40) + vec2(0.0, 7.3);
    vec2 pC = p * 5.60 + vec2(uPtr.x * 0.072, -uVoyage * 3.00) + vec2(11.1, 0.0);

    // Le ciel est noir par defaut. Les nuees n'occupent qu'une part de
    // l'ecran : une grande masse lente, resserree sur une bande oblique
    // qui se deplace d'une region a l'autre. C'est ce qui fait un ciel
    // plutot qu'un aplat colore.
    float etendue = smoothstep(0.34, 0.76, fbm3(p * 0.62 + vec2(3.0, -uVoyage * 0.44)));
    float bande = exp(-pow((p.y + 0.26 * p.x + 0.02 - 0.22 * sin(j * 0.85 + 0.6)) * 1.25, 2.0));
    float champ = etendue * (0.30 + 1.05 * bande);

    vec2 q = vec2(fbm3(pA), fbm3(pA + vec2(5.2, 1.3)));
    float a = fbm5(pA + 1.85 * q);
    float b = fbm5(pB + 1.10 * vec2(fbm3(pB), fbm3(pB + 3.7)));
    float c = 1.0 - abs(fbm3(pC) * 2.0 - 1.0);

    vec3 col = vec3(0.010, 0.013, 0.030);

    col += cA * pow(smoothstep(0.30, 0.95, a), 1.6) * champ * 2.45;
    col += cB * pow(smoothstep(0.45, 1.00, b * (0.40 + 0.90 * a)), 1.4) * champ * 1.55;
    // Les filaments : seules les cretes s'allument, tres fin, et
    // uniquement la ou il y a deja du gaz.
    col += cC * pow(smoothstep(0.66, 1.00, c), 4.0) * pow(smoothstep(0.42, 0.95, a), 2.0) * champ * 1.75;

    // Deux coeurs lumineux derivent d'une region a l'autre.
    vec2 k1 = vec2(sin(j * 1.63 + 0.4) * 0.72, cos(j * 1.07 + 1.2) * 0.34);
    float g1 = exp(-length((p - k1) * vec2(1.0, 1.35)) * 5.0);
    col += (cB * g1 * 0.60 + cC * pow(g1, 3.0) * 0.80) * (0.3 + 0.7 * etendue);

    vec2 k2 = vec2(cos(j * 1.19 + 2.1) * 0.95, sin(j * 1.41) * 0.42);
    float g2 = exp(-length((p - k2) * vec2(1.25, 1.0)) * 4.0);
    col += (cA * g2 * 0.85 + cB * pow(g2, 3.0) * 0.40) * (0.3 + 0.7 * etendue);

    // La galaxie : une fois dans les projets, une fois vers la fin.
    float vis = smoothstep(0.55, 1.45, j) * smoothstep(3.05, 2.25, j)
              + smoothstep(3.70, 4.40, j) * smoothstep(5.10, 4.70, j);
    if (vis > 0.004) {
      vec2 gc = vec2(0.62 - uVoyage * 0.45, -0.17 + sin(j) * 0.16);
      float g = galaxie((p - gc) * 3.4, j * 0.5);
      col += (cC * 0.55 + cB * 0.45) * g * vis * 1.10;
    }

    // Compression des hautes lumieres : plus aucun blanc ne brule, et
    // le texte garde partout son contraste.
    col = col / (1.0 + col * 1.30);

    // Saturation : la compression ci-dessus tire tout vers le gris. On
    // reecarte les couleurs de leur luminance pour que le gaz reste du
    // gaz colore et non de la fumee.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = clamp(mix(vec3(lum), col, 1.42), 0.0, 1.0);

    // Le texte court sur la gauche : on garde ce bord plus sobre et on
    // laisse la lumiere s'installer a droite.
    col *= mix(1.0, mix(0.66, 1.16, smoothstep(-0.95, 0.75, p.x)), uLarge);
    // Le haut de l'ecran reste calme, sous la barre de navigation.
    col *= 0.76 + 0.24 * smoothstep(0.72, 0.05, p.y);
    // Sur un ecran etroit le texte occupe toute la largeur : aucun bord
    // ne peut lui servir d'abri, on baisse donc le ciel entier.
    col *= mix(0.68, 1.0, uLarge);

    // Tramage : sans lui, les degrades larges se decoupent en bandes.
    col += (h21(gl_FragCoord.xy * 1.37 + uVoyage) - 0.5) / 180.0;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

function compiler(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{facteur:number, max:number}} reglages
 */
export function creerNuees(canvas, reglages) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    // Ces nuees ne sont peintes que lorsque la lecture avance. Sans
    // conservation du tampon, WebKit le vide apres chaque composition
    // et la page immobile se retrouve devant un ciel noir.
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compiler(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compiler(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const tampon = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aCoin');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  ['uRes', 'uVoyage', 'uPtr', 'uLarge'].forEach((n) => {
    u[n] = gl.getUniformLocation(prog, n);
  });

  let voyage = 0;
  let ptrX = 0;
  let dessine = false;
  let dernierVoyage = -1;
  let dernierPtr = -9;
  let dernierTemps = -1e9;
  const pause = reglages.pause || 0;

  function peindre() {
    gl.uniform1f(u.uVoyage, voyage);
    gl.uniform2f(u.uPtr, ptrX, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    dernierVoyage = voyage;
    dernierPtr = ptrX;
    dessine = true;
  }

  function dimensionner() {
    const l = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ech = Math.min(reglages.facteur * dpr, reglages.max / Math.max(l, 1));
    canvas.width = Math.max(2, Math.round(l * ech));
    canvas.height = Math.max(2, Math.round(h * ech));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uLarge, l >= 900 ? 1 : 0);
    peindre();
  }

  window.addEventListener('resize', dimensionner, { passive: true });
  dimensionner();

  return {
    /** Appele a chaque image du champ d'etoiles ; ne repeint qu'au besoin. */
    majour(px, v) {
      voyage = v;
      ptrX = px;
      const bouge =
        Math.abs(voyage - dernierVoyage) > 0.0012 || Math.abs(ptrX - dernierPtr) > 0.012;
      if (!bouge) return;
      if (pause) {
        const t = performance.now();
        if (t - dernierTemps < pause) return;
        dernierTemps = t;
      }
      peindre();
    },
    pret() {
      return dessine;
    },
    detruire() {
      window.removeEventListener('resize', dimensionner);
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    },
  };
}
