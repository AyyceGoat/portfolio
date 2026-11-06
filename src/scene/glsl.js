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
  float graine = hash(floor(w * vec2(640.0, 360.0)));
  float sc = 0.72 + 0.28 * sin(uTemps * (0.9 + graine * 2.2) + graine * 50.0);
  vec3 col = c * (1.0 - etoile * (1.0 - sc));
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
    float trainee = smoothstep(0.0, 0.01, le) * exp(-max(le, 0.0) * 9.0) * step(lat, 0.004);
    trainee *= 1.0 - smoothstep(0.001, 0.004, lat);
    col += vec3(0.85, 0.9, 1.0) * trainee * uMeteoreI;
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
const vec3 CHAUD = vec3(1.0, 0.72, 0.42);

float joint(float x, float pas, float largeur) {
  float f = abs(fract(x / pas + 0.5) - 0.5) * pas;
  return 1.0 - smoothstep(0.0, largeur, f);
}

void main() {
  vec3 v = normalize(vPos - uCam);
  vec3 n = normalize(vN);
  float dist = length(vPos - uCam);
  vec3 col;
  float alpha = 1.0;
  if (vType < 0.5) {
    // Plancher : dalles de métal sombre, joints fins, reflet du ciel.
    vec3 base = vec3(0.028, 0.032, 0.05);
    float j = max(joint(vMotif.x, 1.4, 0.018), joint(vMotif.y, 1.4, 0.018));
    base += vec3(0.05, 0.055, 0.07) * j;
    vec3 r = reflect(v, vec3(0.0, 1.0, 0.0));
    float fres = 0.18 + 0.62 * pow(1.0 - max(-v.y, 0.0), 4.0);
    float flou = 1.5 + min(dist * 0.06, 3.0);
    col = base + ciel(r, flou) * fres * 0.8;
    // Reflets des bandeaux lumineux des bords, étirés vers nous.
    float bord = abs(vMotif.y);
    col += CHAUD * exp(-pow((bord - 2.72) / 0.28, 2.0)) * 0.42;
    float montant = fract(vMotif.x / 3.0);
    col += CHAUD * exp(-pow((bord - 2.62) / 0.09, 2.0)) * exp(-(1.0 - montant) * 2.2) * 0.22;
  } else if (vType < 1.5) {
    // Tranche du plancher : métal, bandeau ambré en haut.
    col = vec3(0.03, 0.033, 0.045) + ciel(reflect(v, n), 3.0) * 0.12;
    col += CHAUD * smoothstep(0.62, 0.92, vMotif.y) * 0.9;
  } else if (vType < 2.5) {
    col = vec3(0.012, 0.014, 0.02);
  } else if (vType < 3.5) {
    // Métal poli : le ciel s'y reflète, la lumière y laisse un éclat.
    vec3 r = reflect(v, n);
    float spec = pow(max(dot(r, uLumiere), 0.0), 40.0);
    col = vec3(0.07, 0.075, 0.085) + ciel(r, 2.0) * 0.42 + vec3(0.9, 0.85, 0.8) * spec * 0.55;
    col += CHAUD * max(n.y, 0.0) * 0.06;
  } else if (vType < 4.5) {
    // Vitre : presque invisible, sauf sous un angle rasant.
    float fres = pow(1.0 - abs(dot(v, n)), 3.0);
    col = ciel(reflect(v, n), 1.5) * 0.3 + vec3(0.6, 0.75, 1.0) * 0.02;
    alpha = 0.05 + fres * 0.22;
  } else if (vType < 5.5) {
    col = CHAUD * 1.15;
  } else {
    // Plateforme : mêmes dalles, en carré autour du centre.
    vec3 base = vec3(0.028, 0.032, 0.05);
    float j = max(joint(vMotif.x, 1.4, 0.018), joint(vMotif.y, 1.4, 0.018));
    base += vec3(0.05, 0.055, 0.07) * j;
    vec3 r = reflect(v, vec3(0.0, 1.0, 0.0));
    float fres = 0.18 + 0.62 * pow(1.0 - max(-v.y, 0.0), 4.0);
    col = base + ciel(r, 1.5 + min(dist * 0.06, 3.0)) * fres * 0.55;
    col += CHAUD * exp(-pow((length(vMotif) - 6.8) / 0.25, 2.0)) * 0.3;
  }
  // Au loin, la passerelle se fond dans la pénombre.
  col = mix(vec3(0.012, 0.016, 0.035), col, exp(-dist * uBrume));
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/* L'astronaute : des volumes simples (capsules, ellipsoïdes), chacun
   avec sa matrice, éclairés comme la scène. Le reflet dans le plancher
   est le même dessin, retourné et estompé. */
export const ASTRO_V = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aNormale;
uniform mat4 uVP, uModele;
uniform mat3 uNormales;
varying vec3 vPos, vN, vLocal;
void main() {
  vec4 w = uModele * vec4(aPos, 1.0);
  vPos = w.xyz;
  vN = uNormales * aNormale;
  vLocal = aPos;
  gl_Position = uVP * w;
}
`;

export const ASTRO_F = /* glsl */ `
precision highp float;
varying vec3 vPos, vN, vLocal;
uniform vec3 uCam, uLumiere, uContre;
uniform vec3 uCouleur;
uniform float uBrillance, uMatiere, uReflet, uOpacite;

float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float bruit(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float ligne(float x, float l) { return 1.0 - smoothstep(0.0, l, abs(x)); }

void main() {
  vec3 n = normalize(vN);
  if (uReflet > 0.5) n.y = -n.y;
  vec3 v = normalize(uCam - vPos);
  vec3 alb = uCouleur;
  if (uMatiere < 0.5 || uMatiere > 1.5) {
    // Toile épaisse : un grain doux et quelques plis.
    alb *= 0.93 + 0.07 * bruit(vLocal * 38.0) - 0.05 * bruit(vLocal * vec3(6.0, 22.0, 6.0));
  }
  if (uMatiere > 0.5 && uMatiere < 1.5) {
    // Sac dorsal : un panneau gris, deux fentes, un fin anneau bleu.
    float dos = step(0.0, vLocal.z);
    vec2 q = vLocal.xy;
    float panneau = step(abs(q.x), 0.13) * step(abs(q.y + 0.02), 0.17) * dos;
    alb = mix(alb, vec3(0.5, 0.52, 0.55), panneau * 0.6);
    alb *= 1.0 - 0.45 * dos * (ligne(abs(q.x) - 0.13, 0.004) * step(abs(q.y + 0.02), 0.17) + ligne(abs(q.y + 0.02) - 0.17, 0.004) * step(abs(q.x), 0.13));
    alb *= 1.0 - 0.5 * dos * step(abs(q.x), 0.07) * (ligne(q.y + 0.12, 0.006) + ligne(q.y + 0.16, 0.006));
    float anneau = abs(length(q - vec2(0.0, 0.07)) - 0.042);
    alb = mix(alb, vec3(0.3, 0.52, 0.95), (1.0 - smoothstep(0.004, 0.008, anneau)) * dos * 0.85);
  }
  if (uMatiere > 1.5) {
    // Torse : coutures à la taille et sur la poitrine.
    alb *= 1.0 - 0.18 * (ligne(vLocal.y + 0.17, 0.006) + ligne(vLocal.y - 0.09, 0.005));
  }
  // Éclairage : lumière principale (enveloppante, comme sur un tissu
  // épais), lumière froide de la planète sur le côté, ciel au-dessus,
  // rebond chaud des bandeaux de la passerelle en dessous.
  float diff = max(dot(n, uLumiere) * 0.8 + 0.2, 0.0);
  float planete = max(dot(n, uContre), 0.0);
  float bord = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 ambiant = mix(vec3(0.1, 0.085, 0.07), vec3(0.085, 0.09, 0.11), n.y * 0.5 + 0.5);
  vec3 h = normalize(uLumiere + v);
  float spec = pow(max(dot(n, h), 0.0), uBrillance) * (uBrillance > 20.0 ? 0.45 : 0.12);
  // Les faces tournées vers le bas reçoivent moins de lumière.
  float creux = 0.72 + 0.28 * smoothstep(-0.8, 0.4, n.y);
  vec3 col = alb * creux * (ambiant + vec3(1.0, 0.97, 0.92) * diff * 1.05 + vec3(0.32, 0.42, 0.65) * planete * 0.25)
           + vec3(spec) + vec3(0.4, 0.55, 0.9) * bord * planete * 0.25;
  float a = uOpacite;
  if (uReflet > 0.5) a *= 0.2 * exp(vPos.y * 1.6);
  gl_FragColor = vec4(col * a, a);
}
`;

/* Ombre de contact sous l'astronaute : une tache douce, posée au sol. */
export const OMBRE_V = /* glsl */ `
attribute vec2 aP;
uniform mat4 uVP;
uniform vec3 uCentre;
uniform vec2 uTaille;
varying vec2 vP;
void main() {
  vP = aP;
  gl_Position = uVP * vec4(uCentre + vec3(aP.x * uTaille.x, 0.004, aP.y * uTaille.y), 1.0);
}
`;
export const OMBRE_F = /* glsl */ `
precision mediump float;
varying vec2 vP;
uniform float uForce;
void main() {
  float a = (1.0 - smoothstep(0.2, 1.0, length(vP))) * uForce;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
`;

/* Astéroïdes : des images de l'atlas, face à la caméra, qui tournent et
   dérivent lentement. */
export const SPRITE_V = /* glsl */ `
attribute vec2 aP;
uniform mat4 uVP;
uniform vec3 uCentre, uDroite, uHaut;
uniform float uTaille, uAngle;
uniform vec4 uRect;
varying vec2 vUV;
void main() {
  float c = cos(uAngle), s = sin(uAngle);
  vec2 q = vec2(c * aP.x - s * aP.y, s * aP.x + c * aP.y);
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
  gl_FragColor = texture2D(uAtlas, vUV) * uOpacite; // alpha prémultiplié
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
  float sc = 0.65 + 0.35 * sin(uTemps * (0.7 + aB.w * 2.4) + aB.w * 40.0);
  vCol = aB.rgb * sc;
  gl_PointSize = aA.w * uDpr;
  gl_Position = uVP * vec4(aA.xyz, 1.0);
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
