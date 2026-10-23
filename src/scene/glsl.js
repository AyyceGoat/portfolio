/**
 * Shaders de la scène. WebGL 1, aucune extension requise.
 *
 * Toutes les positions sont exprimées RELATIVEMENT À LA CAMÉRA : la
 * matrice de vue ne porte que la rotation. Les nombres restent petits
 * et la précision des flottants ne se dégrade jamais en route.
 */

/* Le chemin lumineux : une ondulation fixée dans le monde (elle défile
   sous les pieds au rythme de la marche) et une courbe relative à la
   caméra, qui mène toujours le regard vers la planète. */
export const CHEMIN = /* glsl */ `
uniform float uVirage, uMontee, uFin;
float ondulation(float s) { return 2.4 * sin(s * 0.021) + 1.1 * sin(s * 0.057 + 1.3); }
float cheminX(float s, float ds) {
  float k = max(ds, 0.0) / 1000.0;
  return ondulation(s) / (1.0 + max(ds, 0.0) / 90.0) + uVirage * pow(k, 1.6);
}
float cheminY(float ds) {
  float k = max(ds - 20.0, 0.0) / 1000.0;
  return uMontee * pow(k, 1.8);
}
float demiLargeur(float s, float ds) { return 2.6 + 0.5 * sin(s * 0.09) + max(ds, 0.0) * 0.004; }
`;

const BRUIT = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float bruit(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x),
        mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x),
        mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 6; i++) {
    s += a * bruit(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
/* Direction <-> coordonnées équirectangulaires, identiques à la cuisson
   et à la lecture. */
vec3 directionDe(vec2 uv) {
  float lon = (uv.x - 0.5) * 6.2831853;
  float lat = (uv.y - 0.5) * 3.1415927;
  return vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat));
}
`;

export const PLEIN_ECRAN = /* glsl */ `
attribute vec2 aP;
varying vec2 vP;
void main() {
  vP = aP;
  gl_Position = vec4(aP, 0.0, 1.0);
}
`;

/* Cuisson unique : la surface de la planète (océans, continents, glace,
   nuages en spirale). RGB = albedo ; A = brillance de l'océan. */
export const CUISSON_SURFACE = /* glsl */ `
precision highp float;
varying vec2 vP;
${BRUIT}
void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 n = directionDe(uv);
  float lat = (uv.y - 0.5) * 3.1415927;

  float c = fbm(n * 1.7 + vec3(3.0, 1.0, 7.0));
  float terre = smoothstep(0.515, 0.545, c);
  vec3 ocean = mix(vec3(0.008, 0.035, 0.12), vec3(0.02, 0.11, 0.28), smoothstep(0.3, 0.515, c));
  float relief = fbm(n * 7.0 + vec3(11.0));
  vec3 sol = mix(vec3(0.09, 0.11, 0.08), vec3(0.24, 0.21, 0.15), relief);
  sol = mix(sol, vec3(0.32, 0.27, 0.19), smoothstep(0.62, 0.8, c) * 0.6);
  float glace = smoothstep(0.8, 0.9, abs(n.y) + (fbm(n * 5.0) - 0.5) * 0.18);
  vec3 col = mix(ocean, sol, terre);
  col = mix(col, vec3(0.86, 0.9, 0.96), glace);

  // Nuages : domaine déformé, pour des spirales plutôt que des taches.
  vec3 q = n * 3.4;
  vec3 w = vec3(fbm(q + vec3(0.0, 1.3, 5.2)), fbm(q + vec3(5.4, 1.1, 2.3)), fbm(q + vec3(2.2, 7.7, 1.9)));
  float nu = fbm(q * 1.5 + w * 2.6);
  nu = smoothstep(0.5, 0.74, nu) * (0.65 + 0.35 * sin(lat * 9.0 + w.x * 5.0));
  float voile = smoothstep(0.45, 0.75, fbm(n * 14.0 + w * 3.0)) * 0.3;
  nu = clamp(nu + voile * (1.0 - nu), 0.0, 1.0);
  col = mix(col, vec3(0.93, 0.95, 1.0), nu);

  gl_FragColor = vec4(col, (1.0 - terre) * (1.0 - nu) * (1.0 - glace));
}
`;

/* Cuisson unique : la Voie lactée et les nébuleuses du fond, en
   équirectangulaire. Valeurs multipliées par 4 pour limiter les
   aplats en 8 bits ; le grain final achève le travail. */
export const CUISSON_CIEL = /* glsl */ `
precision highp float;
varying vec2 vP;
${BRUIT}
void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 d = directionDe(uv);
  float bande = exp(-pow(dot(d, normalize(vec3(0.45, 1.0, 0.25))), 2.0) * 7.0);
  float n1 = fbm(d * 3.2);
  float n2 = fbm(d * 7.5 + vec3(4.0));
  float n3 = fbm(d * 16.0 + vec3(9.0));
  vec3 col = vec3(0.10, 0.17, 0.36) * pow(n1, 2.6) * bande * 1.6;
  col += vec3(0.26, 0.13, 0.30) * pow(n2, 3.6) * bande * 0.9;
  col += vec3(0.55, 0.62, 0.8) * pow(n3, 6.0) * bande * 0.8;
  col += vec3(0.012, 0.02, 0.045) * n1;
  gl_FragColor = vec4(col * 4.0, 1.0);
}
`;

/* Le ciel, la planète, le soleil et la lumière de l'objectif. */
export const CIEL = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform vec3 uDroite, uHaut, uAvant;
uniform vec2 uTan;
uniform vec3 uC;
uniform float uR;
uniform vec3 uSoleil;
uniform mat3 uRot;
uniform sampler2D uSurf, uFond;
uniform float uExpo, uTemps, uPlongee, uSoleilVis, uGrain;
uniform vec2 uSoleilEcran;
uniform vec2 uRes;

float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec3 rd = normalize(uAvant + vP.x * uTan.x * uDroite + vP.y * uTan.y * uHaut);

  // Fond : Voie lactée cuite, plus une lueur bleutée autour de la planète.
  vec2 uvf = vec2(atan(rd.x, -rd.z) / 6.2831853 + 0.5, asin(clamp(rd.y, -1.0, 1.0)) / 3.1415927 + 0.5);
  vec3 col = vec3(0.003, 0.005, 0.012) + texture2D(uFond, uvf).rgb * 0.25;

  vec3 oc = -uC;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - uR * uR;
  float h = b * b - c;
  float dist = sqrt(max(dot(oc, oc) - b * b, 0.0));
  float sd = max(dot(rd, uSoleil), 0.0);
  bool touche = h > 0.0 && (-b - sqrt(h)) > 0.0;

  if (touche) {
    float t = -b - sqrt(h);
    vec3 n = (rd * t - uC) / uR;
    vec3 nt = uRot * n;
    vec2 uv = vec2(atan(nt.x, -nt.z) / 6.2831853 + 0.5, asin(clamp(nt.y, -1.0, 1.0)) / 3.1415927 + 0.5);
    vec4 s = texture2D(uSurf, uv);
    float ndl = dot(n, uSoleil);
    float jour = smoothstep(-0.1, 0.55, ndl);
    float crepuscule = exp(-ndl * ndl * 55.0) * step(-0.25, ndl);
    vec3 lum = vec3(1.0, 0.96, 0.9) * jour * 1.15 + vec3(1.0, 0.42, 0.16) * crepuscule * 0.45;
    col = s.rgb * lum + s.rgb * vec3(0.012, 0.025, 0.06);

    col += s.a * pow(max(dot(reflect(rd, n), uSoleil), 0.0), 220.0) * vec3(1.0, 0.88, 0.7) * 0.6 * jour;

    float mu = max(dot(n, -rd), 0.0);
    float bord = pow(1.0 - mu, 2.6);
    float eclaire = smoothstep(-0.4, 0.35, ndl);
    col = mix(col, vec3(0.42, 0.68, 1.0) * (0.25 + 1.1 * jour), bord * 0.9 * eclaire);
    col += vec3(0.2, 0.42, 1.0) * pow(1.0 - mu, 1.4) * 0.16 * eclaire;
    // Diffusion vers l'avant quand le soleil est derrière.
    col += vec3(0.5, 0.75, 1.0) * pow(1.0 - mu, 6.0) * pow(sd, 3.0) * 1.5;
  } else {
    col += vec3(1.0, 0.9, 0.78) * (pow(sd, 3000.0) * 60.0 + pow(sd, 260.0) * 1.6 + pow(sd, 14.0) * 0.14) * uSoleilVis;
  }

  // Halo atmosphérique au-delà du limbe.
  if (b < 0.0 && !touche) {
    float hd = max(dist - uR, 0.0) / uR;
    vec3 L = normalize(rd * (-b) - uC);
    float ec = smoothstep(-0.45, 0.4, dot(L, uSoleil));
    float diffusion = 1.0 + 7.0 * pow(sd, 5.0);
    col += vec3(0.32, 0.62, 1.0) * exp(-hd * 60.0) * 1.35 * ec * diffusion;
    col += vec3(0.18, 0.36, 1.0) * exp(-hd * 10.0) * 0.16 * ec * diffusion;
    col += vec3(1.0, 0.82, 0.62) * exp(-hd * 40.0) * pow(sd, 40.0) * 3.0;
  }

  // Objectif : traînée horizontale et reflets, quand le soleil se montre.
  if (uSoleilVis > 0.001) {
    vec2 a = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = vP * a;
    vec2 so = uSoleilEcran * a;
    vec2 dd = p - so;
    col += vec3(0.55, 0.7, 1.0) * exp(-abs(dd.y) * 70.0) * exp(-abs(dd.x) * 1.1) * 0.35 * uSoleilVis;
    for (int i = 1; i <= 3; i++) {
      float f = float(i);
      vec2 g = so * (1.0 - f * 0.55);
      float r = 0.05 + f * 0.035;
      float disque = smoothstep(r, r * 0.55, length(p - g));
      col += mix(vec3(0.3, 0.5, 1.0), vec3(1.0, 0.6, 0.35), f / 3.0) * disque * 0.035 * uSoleilVis;
    }
  }

  // Entrée dans l'atmosphère.
  col = mix(col, vec3(0.55, 0.78, 1.0) * 1.4, pow(uPlongee, 2.2) * 0.85);

  col = vec3(1.0) - exp(-col * uExpo);
  float v = length(vP * vec2(0.85, 1.0));
  col *= 1.0 - smoothstep(0.75, 1.6, v) * 0.55;
  col += (h12(gl_FragCoord.xy + fract(uTemps * 7.13) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Le ruban de lumière du chemin. */
export const RUBAN_V = /* glsl */ `
attribute vec2 aR;
uniform mat4 uVP;
uniform vec3 uCam;
uniform float uPas;
varying float vU, vDs;
varying vec3 vRel;
${CHEMIN}
void main() {
  float ds = aR.x;
  float s = uPas + ds;
  vec3 w = vec3(cheminX(s, ds) + aR.y * demiLargeur(s, ds) * 1.6, cheminY(ds), -s);
  vRel = w - uCam;
  vU = aR.y;
  vDs = ds;
  gl_Position = uVP * vec4(vRel, 1.0);
}
`;

export const RUBAN_F = /* glsl */ `
precision highp float;
varying float vU, vDs;
varying vec3 vRel;
uniform vec3 uC;
uniform float uR, uChemin, uFin;
uniform vec3 uTeinte;
void main() {
  float a = exp(-vU * vU * 5.0) * 0.32 + exp(-vU * vU * 40.0) * 0.4;
  a *= smoothstep(-4.0, 10.0, vDs) * (1.0 - smoothstep(uFin * 0.985, uFin, vDs)) * (1.0 - 0.45 * smoothstep(0.0, uFin, vDs));
  float L = length(vRel);
  vec3 rd = vRel / L;
  float b = dot(-uC, rd);
  float h = b * b - (dot(uC, uC) - uR * uR);
  if (h > 0.0) {
    float t = -b - sqrt(h);
    if (t > 0.0) a *= smoothstep(30.0, 0.0, L - t);
  }
  gl_FragColor = vec4(uTeinte * a * uChemin, 1.0);
}
`;

/* Étoiles (deux plans), poussière en suspension et grains du chemin. */
export const POINTS_V = /* glsl */ `
attribute vec4 aA;
attribute vec4 aB;
uniform mat4 uVP;
uniform vec3 uCam, uC;
uniform float uR, uPas, uVol, uTemps, uFocal, uDpr, uChemin, uEtoiles;
uniform vec3 uTeinte;
varying vec3 vCol;
varying float vNet, vPic;
${CHEMIN}

float visible(vec3 rel) {
  float L = length(rel);
  vec3 rd = rel / L;
  float b = dot(-uC, rd);
  float h = b * b - (dot(uC, uC) - uR * uR);
  if (h <= 0.0) return 1.0;
  float t = -b - sqrt(h);
  if (t < 0.0) return 1.0;
  return smoothstep(10.0, 0.0, L - t);
}

void main() {
  float type = aA.w;
  vec3 rel;
  float px;
  float lum = aB.y;
  vec3 col;
  vPic = 0.0;
  vNet = 4.0;
  float scint = 0.72 + 0.28 * sin(uTemps * (0.5 + aB.z * 2.6) + aB.z * 61.0);

  if (type < 0.5) {
    // Plan lointain : à l'infini, aucune parallaxe.
    rel = aA.xyz * 3000.0;
    px = aB.x * uDpr;
    col = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.86, 0.72), aB.w);
    lum *= scint * uEtoiles;
    if (aB.x > 2.6) { vPic = 0.9; vNet = 26.0; }
  } else if (type < 1.5) {
    // Plan intermédiaire : un tunnel d'étoiles que l'on traverse.
    float D = 1600.0;
    float k = mod(aA.z + uVol, D);
    rel = vec3(aA.x, aA.y, -D + k);
    float prof = -rel.z;
    px = aB.x * uDpr * (1.0 + 160.0 / max(prof, 1.0));
    px = min(px, 5.0 * uDpr);
    lum *= scint * smoothstep(0.0, 120.0, prof) * (1.0 - smoothstep(D * 0.7, D, prof)) * uEtoiles;
    col = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.78), aB.w);
  } else if (type < 2.5) {
    // Poussière lumineuse en suspension, tout près de l'objectif.
    vec3 q = aA.xyz + vec3(sin(uTemps * 0.13 + aB.z * 6.0) * 1.5, uTemps * 0.25, uPas * 0.9 + uVol * 0.02);
    rel = mod(q, 50.0) - 25.0;
    rel.y += 2.0;
    float prof = -rel.z;
    px = aB.x * uFocal / max(prof, 0.3);
    lum *= smoothstep(0.5, 3.0, prof) * (1.0 - smoothstep(16.0, 25.0, prof)) * uChemin;
    col = mix(vec3(0.75, 0.85, 1.0), uTeinte, 0.5);
    vNet = 1.6;
  } else {
    // Grains du chemin. Proches : fixés au monde, ils défilent sous les
    // pas. Lointains : liés à la caméra, ils scintillent sur place.
    float s;
    if (type < 3.5) {
      float W = 170.0;
      s = uPas - 8.0 + mod(aA.x - (uPas - 8.0), W);
    } else {
      s = uPas + aA.x * uFin;
    }
    float ds = s - uPas;
    vec3 w = vec3(cheminX(s, ds) + aA.y * demiLargeur(s, ds), cheminY(ds) + aA.z, -s);
    rel = w - uCam;
    float prof = max(-rel.z, 0.1);
    px = aB.x * uFocal / prof;
    float centre = exp(-aA.y * aA.y * 1.2);
    lum *= (0.35 + 0.65 * centre) * (0.8 + 0.2 * scint) * uChemin;
    lum *= smoothstep(-6.0, 4.0, ds) * (1.0 - smoothstep(uFin * 0.985, uFin, ds));
    col = mix(uTeinte, vec3(0.78, 0.86, 1.0), aB.w * 0.6);
  }

  lum *= visible(rel);
  if (px < 1.2 * uDpr) {
    float r = px / (1.2 * uDpr);
    lum *= r * r;
    px = 1.2 * uDpr;
  }
  if (vPic > 0.0) px = max(px, 16.0 * uDpr);
  else if (type < 1.5 || type > 2.5) vNet = 0.35 + 3.65 * smoothstep(1.2, 4.0, px / uDpr);
  vCol = col * lum;
  gl_PointSize = min(px, 64.0);
  gl_Position = uVP * vec4(rel, 1.0);
  if (lum < 0.002) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

export const POINTS_F = /* glsl */ `
precision mediump float;
varying vec3 vCol;
varying float vNet, vPic;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float a = exp(-r2 * vNet);
  if (vPic > 0.0) {
    a += vPic * (exp(-abs(q.x) * 22.0) * exp(-abs(q.y) * 3.0) + exp(-abs(q.y) * 22.0) * exp(-abs(q.x) * 3.0)) * (1.0 - r2);
  }
  gl_FragColor = vec4(vCol * a, 1.0);
}
`;
