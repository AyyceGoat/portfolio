/**
 * Shaders de la scène. WebGL 1, aucune extension requise.
 *
 * Toutes les positions sont exprimées RELATIVEMENT À LA CAMÉRA : la
 * matrice de vue ne porte que la rotation. Les nombres restent petits
 * et la précision des flottants ne se dégrade jamais en route.
 */

/* Le chemin lumineux : une ondulation fixée dans le monde (elle défile
   sous les pieds au rythme de la marche) et une courbe relative à la
   caméra, qui mène toujours jusqu'au point d'arrivée sur la planète. Il
   s'élargit avec la distance : il reste un fleuve de lumière jusqu'au
   bout, au lieu de s'amincir en un fil. */
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
float demiLargeur(float s, float ds) {
  return 2.8 + 0.5 * sin(s * 0.09) + max(ds, 0.0) * 0.024;
}
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
  for (int i = 0; i < 7; i++) {
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
/* Relief des continents, partagé par les deux cuissons. */
float continents(vec3 n) {
  vec3 q = n * 1.55 + vec3(3.0, 1.0, 7.0);
  vec3 w = vec3(fbm(q + vec3(4.1, 0.3, 2.2)), fbm(q + vec3(1.7, 6.2, 0.4)), fbm(q + vec3(8.3, 2.8, 5.1)));
  return fbm(q + (w - 0.5) * 1.3);
}
`;

const SPHERE = /* glsl */ `
vec2 uvSphere(vec3 n) {
  return vec2(atan(n.x, -n.z) / 6.2831853 + 0.5, asin(clamp(n.y, -1.0, 1.0)) / 3.1415927 + 0.5);
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

/* Cuisson unique : la surface (océans, hauts-fonds, déserts, forêts,
   toundra, reliefs, glaces). RGB = albedo ; A = masque océanique. */
export const CUISSON_SURFACE = /* glsl */ `
precision highp float;
varying vec2 vP;
${BRUIT}
void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 n = directionDe(uv);
  float lat = abs(n.y);
  float c = continents(n);
  float terre = smoothstep(0.505, 0.525, c);
  float cote = smoothstep(0.43, 0.505, c) * (1.0 - terre);

  vec3 abysses = vec3(0.006, 0.022, 0.07);
  vec3 large = vec3(0.012, 0.05, 0.13);
  vec3 lagon = vec3(0.03, 0.17, 0.24);
  vec3 ocean = mix(abysses, large, smoothstep(0.25, 0.45, c));
  ocean = mix(ocean, lagon, cote * cote);

  float humidite = fbm(n * 3.1 + vec3(5.0, 2.0, 9.0));
  float relief = fbm(n * 9.0 + vec3(11.0));
  vec3 desert = vec3(0.34, 0.27, 0.18);
  vec3 steppe = vec3(0.2, 0.2, 0.12);
  vec3 foret = vec3(0.05, 0.11, 0.05);
  vec3 toundra = vec3(0.2, 0.2, 0.18);
  vec3 sol = mix(desert, steppe, smoothstep(0.34, 0.46, humidite));
  sol = mix(sol, foret, smoothstep(0.44, 0.56, humidite) * (1.0 - smoothstep(0.55, 0.75, lat)));
  sol = mix(sol, desert, smoothstep(0.2, 0.08, abs(lat - 0.36)) * smoothstep(0.48, 0.36, humidite) * 0.8);
  sol = mix(sol, toundra, smoothstep(0.62, 0.78, lat));
  float montagne = smoothstep(0.6, 0.72, c) * relief;
  sol = mix(sol, vec3(0.36, 0.32, 0.29), montagne * 0.8);
  sol *= 0.75 + 0.5 * relief;

  vec3 col = mix(ocean, sol, terre);
  float glace = smoothstep(0.84, 0.92, lat + (fbm(n * 6.0) - 0.5) * 0.14);
  col = mix(col, vec3(0.82, 0.87, 0.93), glace);
  gl_FragColor = vec4(col, (1.0 - terre) * (1.0 - glace));
}
`;

/* Cuisson unique : la couche nuageuse (R, avec cyclones et bandes) et
   les lumières des villes (G). Les nuages tournent un peu plus vite que
   le sol et y projettent leur ombre. */
export const CUISSON_NUAGES = /* glsl */ `
precision highp float;
varying vec2 vP;
${BRUIT}
void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 n = directionDe(uv);
  float lat = (uv.y - 0.5) * 3.1415927;

  vec3 q = n * 3.0;
  vec3 w = vec3(fbm(q + vec3(0.0, 1.3, 5.2)), fbm(q + vec3(5.4, 1.1, 2.3)), fbm(q + vec3(2.2, 7.7, 1.9)));
  // Cyclone : un tourbillon, enroulé autour d'un axe.
  vec3 axe = normalize(vec3(0.6, 0.35, -0.7));
  float d = acos(clamp(dot(n, axe), -1.0, 1.0));
  float tour = exp(-d * 5.0);
  vec3 tq = q + cross(axe, n) * tour * 2.6;
  float nu = fbm(tq * 1.45 + w * 2.4);
  nu = smoothstep(0.48, 0.75, nu);
  nu *= 0.62 + 0.38 * sin(lat * 8.0 + w.x * 5.0);
  float fin = smoothstep(0.45, 0.78, fbm(n * 16.0 + w * 3.0));
  nu = clamp(nu + fin * 0.28 * (1.0 - nu) + tour * 0.3 * fin, 0.0, 1.0);

  float c = continents(n);
  float terre = smoothstep(0.51, 0.53, c);
  float villes = smoothstep(0.66, 0.82, fbm(n * 26.0 + vec3(5.0)));
  villes *= smoothstep(0.5, 0.75, fbm(n * 5.0 + vec3(2.0)));
  villes *= terre * (1.0 - smoothstep(0.7, 0.85, abs(n.y)));
  gl_FragColor = vec4(nu, villes, 0.0, 1.0);
}
`;

/* Cuisson unique : la Voie lactée et les nébuleuses du fond. Valeurs
   multipliées par 4 pour limiter les aplats en 8 bits ; le grain final
   achève le travail. */
export const CUISSON_CIEL = /* glsl */ `
precision highp float;
varying vec2 vP;
${BRUIT}
void main() {
  vec2 uv = vP * 0.5 + 0.5;
  vec3 d = directionDe(uv);
  vec3 plan = normalize(vec3(0.45, 1.0, 0.25));
  float h = dot(d, plan);
  float bande = exp(-h * h * 7.0);
  float coeur = exp(-pow(distance(d, normalize(vec3(-0.75, 0.15, -0.6))), 2.0) * 3.0);
  float n1 = fbm(d * 3.0);
  float n2 = fbm(d * 7.0 + vec3(4.0));
  float n3 = fbm(d * 18.0 + vec3(9.0));
  float poussiere = smoothstep(0.45, 0.72, fbm(d * 9.0 + vec3(2.0, 7.0, 1.0)));

  float fil = smoothstep(0.52, 0.8, n2);
  vec3 col = vec3(0.07, 0.12, 0.32) * pow(n1, 3.0) * bande * 1.8;
  col += vec3(0.03, 0.2, 0.26) * fil * pow(n1, 2.0) * bande * 1.2;
  col += vec3(0.34, 0.1, 0.34) * pow(n2, 5.0) * (bande * 0.5 + coeur) * 1.4;
  col += vec3(0.55, 0.38, 0.24) * pow(n1, 2.4) * coeur * 1.2;
  col += vec3(0.72, 0.78, 0.94) * pow(n3, 6.0) * bande * 1.1;
  col *= 1.0 - poussiere * 0.6 * bande;
  col += vec3(0.006, 0.01, 0.026) * n1;
  gl_FragColor = vec4(col * 4.0, 1.0);
}
`;

/* Le ciel, la planète, le soleil, l'objectif et la plongée. */
export const CIEL = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform vec3 uDroite, uHaut, uAvant;
uniform vec2 uTan;
uniform vec3 uC;
uniform float uR;
uniform vec3 uSoleil;
uniform mat3 uRot, uRotN;
uniform sampler2D uSurf, uNuages, uFond;
uniform float uExpo, uTemps, uPlongee, uVitesse, uSoleilVis, uGrain, uArriveeI;
uniform vec3 uArrivee;
uniform vec2 uSoleilEcran;
uniform vec2 uRes;
${SPHERE}

float h12(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec3 rd = normalize(uAvant + vP.x * uTan.x * uDroite + vP.y * uTan.y * uHaut);

  vec3 col = vec3(0.002, 0.004, 0.011) + texture2D(uFond, uvSphere(rd)).rgb * 0.2;

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
    vec3 nc = uRotN * n;
    vec4 s = texture2D(uSurf, uvSphere(nt));
    vec2 nuv = texture2D(uNuages, uvSphere(nc)).rg;
    float nuage = nuv.r;
    float villes = texture2D(uNuages, uvSphere(nt)).g;
    float ombre = texture2D(uNuages, uvSphere(uRotN * normalize(n - uSoleil * 0.012))).r;

    float ndl = dot(n, uSoleil);
    float jour = smoothstep(-0.06, 0.45, ndl);
    float crepuscule = exp(-ndl * ndl * 40.0) * step(-0.3, ndl);
    vec3 soleilC = mix(vec3(1.0, 0.97, 0.92), vec3(1.0, 0.55, 0.28), crepuscule * 0.8);

    vec3 sol = s.rgb * (1.0 - ombre * 0.6 * jour);
    vec3 surface = sol * soleilC * jour * 1.35 + s.rgb * vec3(0.006, 0.014, 0.035);
    vec3 refl = reflect(rd, n);
    float brille = max(dot(refl, uSoleil), 0.0);
    surface += s.a * (1.0 - nuage) * (pow(brille, 140.0) * 1.2 + pow(brille, 14.0) * 0.06) * soleilC * jour;
    vec3 blanc = mix(vec3(0.93, 0.95, 1.0), vec3(1.0, 0.62, 0.38), crepuscule * 0.7);
    vec3 nuees = blanc * (jour * 1.18 + 0.012);
    col = mix(surface, nuees, nuage);
    col += villes * (1.0 - nuage) * vec3(1.0, 0.66, 0.32) * 0.75 * (1.0 - smoothstep(-0.2, 0.06, ndl));

    float mu = max(dot(n, -rd), 0.0);
    float eclaire = smoothstep(-0.35, 0.3, ndl);
    vec3 diffuse = mix(vec3(0.32, 0.58, 1.0), vec3(1.0, 0.52, 0.28), crepuscule * 0.85);
    col = mix(col, diffuse * (0.22 + 1.05 * jour), pow(1.0 - mu, 2.4) * 0.85 * eclaire);
    col += vec3(0.18, 0.38, 1.0) * pow(1.0 - mu, 1.3) * 0.14 * eclaire;
    col += vec3(0.5, 0.75, 1.0) * pow(1.0 - mu, 6.0) * pow(sd, 3.0) * 1.6;

    // Le point d'arrivée du chemin : une lueur posée sur la planète.
    float a = max(dot(rd, uArrivee), 0.0);
    col += vec3(1.0, 0.86, 0.62) * (pow(a, 9000.0) * 2.2 + pow(a, 900.0) * 0.5) * uArriveeI;
  } else {
    col += vec3(1.0, 0.9, 0.78) * (pow(sd, 3000.0) * 60.0 + pow(sd, 260.0) * 1.6 + pow(sd, 14.0) * 0.14) * uSoleilVis;
  }

  // Halo atmosphérique au-delà du limbe, bleu le jour, orangé au crépuscule.
  if (b < 0.0 && !touche) {
    float hd = max(dist - uR, 0.0) / uR;
    vec3 L = normalize(rd * (-b) - uC);
    float lnd = dot(L, uSoleil);
    float ec = smoothstep(-0.45, 0.4, lnd);
    float ter = exp(-lnd * lnd * 18.0);
    float diffusion = 1.0 + 7.0 * pow(sd, 5.0);
    vec3 teinte = mix(vec3(0.32, 0.62, 1.0), vec3(1.0, 0.55, 0.3), ter * 0.7);
    col += teinte * exp(-hd * 55.0) * 1.4 * ec * diffusion;
    col += vec3(0.18, 0.36, 1.0) * exp(-hd * 9.0) * 0.18 * ec * diffusion;
    col += vec3(1.0, 0.82, 0.62) * exp(-hd * 40.0) * pow(sd, 40.0) * 3.0;
  }

  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 p = vP * asp;

  // Objectif : traînée horizontale et reflets, quand le soleil se montre.
  if (uSoleilVis > 0.001) {
    vec2 so = uSoleilEcran * asp;
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

  // Traits de vitesse : pendant la plongée, et pendant les vols de la
  // caméra de cinéma (vers l'avant, ils fuient vers les bords ; en
  // arrière, ils convergent vers le centre).
  float vitesse = smoothstep(0.08, 0.5, uPlongee) * (1.0 - smoothstep(0.9, 1.0, uPlongee));
  float vol = abs(uVitesse);
  if (max(vitesse, vol) > 0.001) {
    float r = length(p);
    float ang = atan(p.y, p.x);
    float secteur = floor(ang * 57.2958 * 1.6);
    float tirage = h12(vec2(secteur, 3.7));
    float trait = step(0.86 - vol * 0.06, tirage) * smoothstep(0.15, 0.9, r);
    float sens = uVitesse < 0.0 && vol > vitesse ? -1.0 : 1.0;
    float avance = fract(r * 1.4 - sens * uTemps * (2.2 + tirage * 2.0 + vol * 2.5) - tirage * 7.0);
    trait *= smoothstep(0.0, 0.15, avance) * (1.0 - smoothstep(0.15, 0.6, avance));
    col += vec3(0.75, 0.88, 1.0) * trait * max(vitesse, vol) * 1.3;
  }

  // Plongée : plasma de rentrée, nuages qui défilent.
  if (uPlongee > 0.001) {
    float ang = atan(p.y, p.x);
    float rentree = smoothstep(0.4, 0.8, uPlongee);
    float bord = smoothstep(0.55, 1.45, length(vP * vec2(0.9, 1.0)));
    float flamme = 0.6 + 0.4 * sin(ang * 9.0 + uTemps * 13.0) * sin(ang * 5.0 - uTemps * 7.0);
    col += mix(vec3(1.0, 0.45, 0.15), vec3(0.4, 0.75, 1.0), 0.5 + 0.5 * sin(ang * 3.0 + uTemps * 2.0)) * bord * flamme * rentree * 1.4;

    float couche = smoothstep(0.55, 0.92, uPlongee);
    float z1 = fract(uTemps * 0.55);
    float z2 = fract(uTemps * 0.55 + 0.5);
    float n1 = texture2D(uNuages, vec2(0.5) + p * 0.22 / (0.25 + z1 * 1.6)).r;
    float n2 = texture2D(uNuages, vec2(0.3, 0.6) + p * 0.22 / (0.25 + z2 * 1.6)).r;
    float voile = n1 * sin(z1 * 3.1416) + n2 * sin(z2 * 3.1416);
    col = mix(col, vec3(0.86, 0.93, 1.0) * 1.3, clamp(voile * couche * 0.75, 0.0, 1.0));
    col = mix(col, vec3(0.6, 0.8, 1.0) * 1.5, pow(uPlongee, 3.0) * 0.6);
  }

  col = vec3(1.0) - exp(-col * uExpo);
  float v = length(vP * vec2(0.85, 1.0));
  col *= 1.0 - smoothstep(0.75, 1.6, v) * 0.55;
  col += (h12(gl_FragCoord.xy + fract(uTemps * 7.13) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Le ruban de lumière du chemin, dessiné deux fois : un halo large et
   diffus, puis le cœur. Des impulsions y courent vers la planète. */
export const RUBAN_V = /* glsl */ `
attribute vec2 aR;
uniform mat4 uVP;
uniform vec3 uCam;
uniform float uPas, uLarge;
varying float vU, vDs;
varying vec3 vRel;
${CHEMIN}
void main() {
  float ds = aR.x;
  float s = uPas + ds;
  vec3 w = vec3(cheminX(s, ds) + aR.y * demiLargeur(s, ds) * uLarge, cheminY(ds) + 0.02, -s);
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
uniform float uR, uChemin, uFin, uTemps, uIntensite, uNettete;
uniform vec3 uTeinte;
void main() {
  float a = exp(-vU * vU * uNettete) * 0.34 + exp(-vU * vU * uNettete * 8.0) * 0.42;
  float loin = vDs / max(uFin, 1.0);
  a *= smoothstep(-4.0, 10.0, vDs) * (1.0 - smoothstep(0.985, 1.0, loin));
  a *= 0.8 + 0.6 * smoothstep(0.55, 1.0, loin);
  float impulsion = pow(0.5 + 0.5 * sin(vDs * 0.045 - uTemps * 2.2), 10.0);
  a *= 1.0 + impulsion * 0.9 * smoothstep(5.0, 40.0, vDs);
  float L = length(vRel);
  vec3 rd = vRel / L;
  float b = dot(-uC, rd);
  float h = b * b - (dot(uC, uC) - uR * uR);
  if (h > 0.0) {
    float t = -b - sqrt(h);
    if (t > 0.0) a *= smoothstep(30.0, 0.0, L - t);
  }
  gl_FragColor = vec4(uTeinte * a * uChemin * uIntensite, 1.0);
}
`;

/* Nébuleuses à mi-distance : quelques grands voiles qui défilent en
   parallaxe, entre le plan des étoiles lointaines et celui du tunnel. */
export const NUEES_V = /* glsl */ `
attribute vec4 aN;
attribute vec4 aC;
uniform mat4 uVP;
uniform vec3 uDroite, uHaut;
uniform float uVol;
varying vec2 vUv;
varying vec3 vCol;
varying float vFondu;
varying vec3 vRel;
void main() {
  float D = 2600.0;
  float k = mod(aN.z + uVol * 0.55, D);
  vec3 centre = vec3(aN.x, aN.y, -D + k);
  float prof = -centre.z;
  vec3 rel = centre + (aC.x * uDroite + aC.y * uHaut) * aN.w;
  vUv = aC.xy;
  float t = aC.z;
  vCol = t < 0.5 ? vec3(0.16, 0.32, 1.0) : (t < 1.5 ? vec3(0.6, 0.16, 0.8) : vec3(0.05, 0.55, 0.7));
  vFondu = smoothstep(150.0, 700.0, prof) * (1.0 - smoothstep(D * 0.7, D, prof)) * (0.6 + 0.4 * aC.w);
  vRel = rel;
  gl_Position = uVP * vec4(rel, 1.0);
}
`;

export const NUEES_F = /* glsl */ `
precision mediump float;
varying vec2 vUv;
varying vec3 vCol;
varying float vFondu;
varying vec3 vRel;
uniform sampler2D uFond;
uniform vec3 uC;
uniform float uR, uNuees;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  vec3 rd = normalize(vRel);
  float b = dot(-uC, rd);
  float hh = b * b - (dot(uC, uC) - uR * uR);
  if (hh > 0.0 && -b - sqrt(hh) > 0.0) discard;
  float motif = texture2D(uFond, vUv * 0.35 + vec2(0.5) + vCol.rg * 0.2).b * 0.25;
  float a = pow(1.0 - r, 2.2) * (0.35 + motif * 2.2) * vFondu * uNuees;
  gl_FragColor = vec4(vCol * a * 0.09, 1.0);
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
  float scint = 0.7 + 0.3 * sin(uTemps * (0.5 + aB.z * 2.6) + aB.z * 61.0);
  vec3 froide = vec3(0.68, 0.8, 1.0);
  vec3 chaude = vec3(1.0, 0.84, 0.66);

  if (type < 0.5) {
    // Plan lointain : à l'infini, aucune parallaxe.
    rel = aA.xyz * 3000.0;
    px = aB.x * uDpr;
    col = mix(froide, chaude, aB.w);
    lum *= scint * uEtoiles;
    if (aB.x > 2.6) { vPic = 1.0; vNet = 30.0; }
  } else if (type < 1.5) {
    // Plan intermédiaire : un tunnel d'étoiles que l'on traverse.
    float D = 1600.0;
    float k = mod(aA.z + uVol, D);
    rel = vec3(aA.x, aA.y, -D + k);
    float prof = -rel.z;
    px = aB.x * uDpr * (1.0 + 160.0 / max(prof, 1.0));
    px = min(px, 5.0 * uDpr);
    lum *= scint * smoothstep(0.0, 120.0, prof) * (1.0 - smoothstep(D * 0.7, D, prof)) * uEtoiles;
    col = mix(froide, chaude, aB.w);
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
    if (type > 3.5) px = max(px, 1.6 * uDpr);
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
  if (vPic > 0.0) px = max(px, 18.0 * uDpr);
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
    a += vPic * (exp(-abs(q.x) * 24.0) * exp(-abs(q.y) * 2.6) + exp(-abs(q.y) * 24.0) * exp(-abs(q.x) * 2.6)) * (1.0 - r2);
  }
  gl_FragColor = vec4(vCol * a, 1.0);
}
`;
