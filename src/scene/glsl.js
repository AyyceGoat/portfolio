/**
 * Shaders du voyage. WebGL 1, aucune extension requise.
 *
 * Le ciel est l'image de référence découpée en plans (public/espace/) :
 * nébuleuses et étoiles d'un côté, planète de l'autre. Il est posé sur une
 * sphère à l'infini : chaque direction de regard y lit sa couleur. Les
 * mêmes fonctions servent au reflet du ciel dans la passerelle.
 */

/* Repère du ciel : l'image couvre 100° de large et 56° de haut, centrée
   droit devant (vers −z) ; au-delà, elle se prolonge en miroir, assombrie.
   La planète y occupe la boîte relevée sur l'image (scripts/plans.py). */
export const CIEL_FN = /* glsl */ `
uniform sampler2D uCiel, uPlanete;
uniform float uTemps, uPlaneteEchelle;
const float LARGEUR_CIEL = 1.74533;
const float HAUTEUR_CIEL = 0.98175;
const vec2 PLANETE_C = vec2(0.79141, 0.37222);
const vec4 PLANETE_BOITE = vec4(0.62734, 0.0875, 0.95547, 0.65694);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec2 uvCiel(vec3 d) {
  float lacet = atan(d.x, -d.z);
  float tangage = asin(clamp(d.y, -1.0, 1.0));
  return vec2(0.5 + lacet / LARGEUR_CIEL, 0.5 - tangage / HAUTEUR_CIEL);
}

vec3 ciel(vec3 d, float flou) {
  vec2 uv = uvCiel(d);
  // Les nébuleuses ondulent, très lentement.
  vec2 w = uv + 0.0011 * vec2(sin(uTemps * 0.045 + uv.y * 7.0), cos(uTemps * 0.037 + uv.x * 5.0));
  // Au-dessus de l'image, on lit son reflet ; plus haut, en fondu, un
  // reflet décalé vers la gauche : le disque comblé sous la planète ne
  // s'y montre jamais.
  vec2 wc = vec2(w.x, abs(w.y));
  vec3 c = texture2D(uCiel, wc, flou).rgb;
  // Scintillement : une étoile est ce qui dépasse nettement son voisinage
  // (l'image floutée, lue dans un niveau de détail inférieur).
  vec3 voisinage = texture2D(uCiel, wc, flou + 3.0).rgb;
  if (w.y < 0.0) {
    float t = smoothstep(0.0, 0.08, -w.y);
    vec2 wd = vec2(w.x - 0.34, -w.y);
    c = mix(c, texture2D(uCiel, wd, flou).rgb, t);
    voisinage = mix(voisinage, texture2D(uCiel, wd, flou + 3.0).rgb, t);
  }
  float etoile = clamp((dot(c - voisinage, vec3(0.333)) - 0.035) * 6.0, 0.0, 1.0);
  float graine = hash(floor(w * vec2(1280.0, 720.0)));
  float sc = 0.55 + 0.45 * sin(uTemps * (0.8 + graine * 2.6) + graine * 50.0);
  // Seul l'éclat de l'étoile varie, jamais en dessous de son voisinage.
  vec3 col = c - max(c - voisinage, 0.0) * etoile * (1.0 - sc);
  // Un voile de nébuleuse, flou, qui glisse lentement par-dessus.
  vec2 derive = vec2(uTemps * 0.0016, sin(uTemps * 0.021) * 0.006);
  vec3 voile = texture2D(uCiel, vec2(wc.x * 0.985 + derive.x, wc.y + derive.y), flou + 4.5).rgb;
  col = col * 0.93 + voile * 0.16;
  // La planète, qui grandit à l'approche.
  vec2 p = PLANETE_C + (uv - PLANETE_C) / uPlaneteEchelle;
  vec2 pu = (p - PLANETE_BOITE.xy) / (PLANETE_BOITE.zw - PLANETE_BOITE.xy);
  if (pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) {
    vec4 pl = texture2D(uPlanete, pu, flou); // alpha prémultiplié
    col = col * (1.0 - pl.a) + pl.rgb;
  }
  // Au-delà de l'image : son reflet, plus sombre.
  float hors = max(max(-uv.x, uv.x - 1.0), max(-uv.y, uv.y - 1.0));
  col *= 1.0 - 0.45 * smoothstep(0.0, 0.1, hors);
  // Retenue : couleurs un peu désaturées, un peu plus sombres.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), col, 0.84) * 0.9;
}
`;

export const PLEIN_ECRAN = /* glsl */ `
attribute vec2 aP;
varying vec2 vP;
void main() { vP = aP; gl_Position = vec4(aP, 0.0, 1.0); }
`;

/* Le ciel plein écran, et parfois un météore. */
export const CIEL_F = /* glsl */ `
precision highp float;
varying vec2 vP;
uniform vec3 uDroite, uHaut, uAvant;
uniform vec2 uTan;
uniform vec4 uMeteore; // départ (écran), angle, avancement 0 → 1
uniform float uMeteoreI;
${CIEL_FN}
void main() {
  vec3 d = normalize(uAvant + vP.x * uTan.x * uDroite + vP.y * uTan.y * uHaut);
  vec3 col = ciel(d, 0.0);
  if (uMeteoreI > 0.001) {
    vec2 dir = vec2(cos(uMeteore.z), sin(uMeteore.z));
    vec2 tete = uMeteore.xy + dir * uMeteore.w * 0.55;
    vec2 q = vP * vec2(uTan.x / uTan.y, 1.0) - tete;
    float le = dot(q, -dir);
    float lat = abs(dot(q, vec2(-dir.y, dir.x)));
    float trainee = smoothstep(-0.004, 0.004, le) * exp(-max(le, 0.0) * 6.5);
    trainee *= 1.0 - smoothstep(0.0006, 0.0028 * (1.0 - min(le, 1.0) * 0.6), lat);
    col += vec3(0.82, 0.9, 1.0) * trainee * uMeteoreI * 1.2;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Passerelle et plateforme : un seul maillage, plusieurs matières.
   aType : 0 plancher, 1 tranche, 2 dessous, 3 lisse et montants (métal),
   4 vitre, 5 bandeau lumineux. */
export const PONT_V = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aNormale;
attribute vec2 aMotif;
attribute float aType;
uniform mat4 uVP;
varying vec3 vPos, vN;
varying vec2 vMotif;
varying float vType;
void main() {
  vPos = aPos; vN = aNormale; vMotif = aMotif; vType = aType;
  gl_Position = uVP * vec4(aPos, 1.0);
}
`;

export const PONT_F = /* glsl */ `
precision highp float;
varying vec3 vPos, vN;
varying vec2 vMotif;
varying float vType;
uniform vec3 uCam, uLumiere;
uniform float uBrume;
${CIEL_FN}
const vec3 CHAUD = vec3(1.0, 0.7, 0.4);

float joint(float x, float pas, float largeur) {
  float f = abs(fract(x / pas + 0.5) - 0.5) * pas;
  return 1.0 - smoothstep(0.0, largeur, f);
}

/* Le plancher : dalles de métal sombre et poli, au léger relief, où se
   reflètent le ciel et les lumières de la passerelle. */
vec3 plancher(vec2 m, float bord, float dist, vec3 v, bool pont) {
  vec2 dalle = floor(m / 1.4);
  float teinte = 0.9 + 0.2 * hash(dalle);
  vec3 base = vec3(0.022, 0.026, 0.042) * teinte;
  // joints : un filet clair et une ombre fine, comme un chanfrein
  float jx = joint(m.x, 1.4, 0.012), jy = joint(m.y, 1.4, 0.012);
  float ombre = max(joint(m.x - 0.02, 1.4, 0.012), joint(m.y - 0.02, 1.4, 0.012));
  base += vec3(0.07, 0.075, 0.09) * max(jx, jy) - vec3(0.012) * ombre;
  vec3 r = reflect(v, vec3(0.0, 1.0, 0.0));
  float fres = 0.28 + 0.66 * pow(1.0 - max(-v.y, 0.0), 3.5);
  float flou = 0.6 + min(dist * 0.045, 3.2);
  vec3 col = base + ciel(r, flou) * fres;
  // éclat de la lumière principale
  col += vec3(0.5, 0.48, 0.45) * pow(max(dot(r, uLumiere), 0.0), 60.0) * 0.4;
  if (pont) {
    // reflets étirés des bandeaux et des lampes des garde-corps
    float lampe = fract(m.x / 3.0);
    float trainee = exp(-(1.0 - lampe) * 1.6);
    col += CHAUD * exp(-pow((bord - 2.74) / 0.3, 2.0)) * 0.5;
    col += CHAUD * exp(-pow((bord - 2.5) / 0.16, 2.0)) * trainee * 0.55;
    // lampes encastrées au bord du plancher
    float point = exp(-(pow(mod(m.x, 1.5) - 0.75, 2.0) + pow(bord - 2.68, 2.0) * 4.0) * 900.0);
    col += vec3(1.0, 0.82, 0.6) * point * 1.6;
    // filets pointillés le long des joints, comme sur la référence
    float tiret = step(0.55, fract(m.x / 0.9)) * exp(-pow((bord - 1.4) / 0.02, 2.0));
    col += vec3(0.75, 0.8, 0.9) * tiret * 0.22;
  }
  return col;
}

void main() {
  vec3 v = normalize(vPos - uCam);
  vec3 n = normalize(vN);
  float dist = length(vPos - uCam);
  vec3 col;
  float alpha = 1.0;
  if (vType < 0.5) {
    col = plancher(vMotif, abs(vMotif.y), dist, v, true);
  } else if (vType < 1.5) {
    // Tranche du plancher : métal, bandeau ambré en haut.
    col = vec3(0.03, 0.033, 0.045) + ciel(reflect(v, n), 2.5) * 0.14;
    col += CHAUD * smoothstep(0.6, 0.9, vMotif.y) * 1.1;
  } else if (vType < 2.5) {
    col = vec3(0.012, 0.014, 0.02);
  } else if (vType < 3.5) {
    // Métal poli : le ciel s'y reflète, les lumières y laissent des éclats.
    vec3 r = reflect(v, n);
    float spec = pow(max(dot(r, uLumiere), 0.0), 50.0);
    col = vec3(0.06, 0.064, 0.074) + ciel(r, 1.2) * 0.55 + vec3(0.95, 0.9, 0.85) * spec * 0.7;
    col += CHAUD * pow(max(-n.y, 0.0), 2.0) * 0.35 + CHAUD * max(n.y, 0.0) * 0.08;
  } else if (vType < 4.5) {
    // Vitre : on voit au travers ; sous un angle rasant, elle reflète.
    float fres = pow(1.0 - abs(dot(v, n)), 3.0);
    col = ciel(reflect(v, n), 1.2) * 0.35 + vec3(0.55, 0.75, 1.0) * 0.025;
    alpha = 0.05 + fres * 0.24;
  } else if (vType < 5.5) {
    col = CHAUD * 1.25;
  } else {
    col = plancher(vMotif, 0.0, dist, v, false);
    col += CHAUD * exp(-pow((length(vMotif) - 6.78) / 0.28, 2.0)) * 0.45;
  }
  // Au loin, la passerelle se fond dans la pénombre.
  col = mix(vec3(0.012, 0.016, 0.035), col, exp(-dist * uBrume));
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/* Astéroïdes : des images de l'atlas, face à la caméra, qui tournent et
   dérivent lentement. */
export const SPRITE_V = /* glsl */ `
attribute vec2 aP;
uniform mat4 uVP;
uniform vec3 uCentre, uDroite, uHaut;
uniform float uTaille, uAngle, uAspect; // largeur / hauteur de l'image
uniform vec4 uRect;
varying vec2 vUV;
void main() {
  float c = cos(uAngle), s = sin(uAngle);
  vec2 e = aP * vec2(sqrt(uAspect), 1.0 / sqrt(uAspect));
  vec2 q = vec2(c * e.x - s * e.y, s * e.x + c * e.y);
  vec3 w = uCentre + (uDroite * q.x + uHaut * q.y) * uTaille * 0.5;
  vUV = uRect.xy + (aP * vec2(0.5, -0.5) + 0.5) * uRect.zw;
  gl_Position = uVP * vec4(w, 1.0);
}
`;
export const SPRITE_F = /* glsl */ `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uAtlas;
uniform float uOpacite;
void main() {
  // Un niveau de détail plus fin que d'ordinaire : des bords nets.
  gl_FragColor = texture2D(uAtlas, vUV, -1.0) * uOpacite; // alpha prémultiplié
}
`;

/* Étoiles proches : elles défilent selon leur distance et scintillent. */
export const POINTS_V = /* glsl */ `
attribute vec4 aA; // position, taille
attribute vec4 aB; // couleur, graine
uniform mat4 uVP;
uniform float uTemps, uDpr;
varying vec3 vCol;
void main() {
  float sc = 0.55 + 0.45 * sin(uTemps * (0.7 + aB.w * 2.4) + aB.w * 40.0);
  vCol = aB.rgb * sc;
  // Tout dérive un peu : invisible pour les étoiles lointaines, sensible
  // pour la poussière proche de la passerelle.
  vec3 derive = vec3(sin(uTemps * 0.11 + aB.w * 31.0), sin(uTemps * 0.083 + aB.w * 17.0) * 0.6, cos(uTemps * 0.07 + aB.w * 23.0)) * 0.9;
  gl_PointSize = aA.w * uDpr;
  gl_Position = uVP * vec4(aA.xyz + derive, 1.0);
}
`;
export const POINTS_F = /* glsl */ `
precision mediump float;
varying vec3 vCol;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = exp(-dot(q, q) * 3.5);
  gl_FragColor = vec4(vCol * a, a);
}
`;
