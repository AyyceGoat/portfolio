/* ------------------------------------------------------------------
   Shaders GLSL du globe. Ecrits a la main, sans bibliotheque de globe.

   Regle de performance tenue ici : tout ce qui bouge est calcule sur
   le GPU, par sommet. Le CPU ne fait qu'envoyer quelques uniformes
   par image — jamais de reconstruction de geometrie.
   ------------------------------------------------------------------ */

/* --- Points des terres emergees ---------------------------------- */

export const POINTS_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uDissolve;   // 0 = globe intact, 1 = entierement disperse
  uniform float uFade;       // attenuation globale au defilement

  attribute float aSeed;     // aleatoire fige, propre a chaque point
  attribute float aCity;     // 1.0 pour Abidjan, 0.0 partout ailleurs

  varying float vCity;
  varying float vAlpha;

  void main() {
    vCity = aCity;

    vec3 pos = position;
    vec3 dir = normalize(position);

    // Dissolution : chaque point s'echappe vers l'exterieur, avec une
    // derive propre tiree de sa graine. Le mouvement est entierement
    // analytique : rien n'est recalcule cote processeur.
    if (uDissolve > 0.0001) {
      float s = aSeed;
      vec3 drift = vec3(
        sin(s * 41.7 + uTime * 0.18),
        cos(s * 27.3 + uTime * 0.14),
        sin(s * 13.9 + uTime * 0.11)
      );
      float push = uDissolve * (14.0 + s * 46.0);
      pos += dir * push + drift * uDissolve * 11.0;
    }

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // Abidjan respire lentement : seule la ville marquee est concernee.
    float pulse = 1.0 + aCity * 0.35 * sin(uTime * 1.25);
    float size = uSize * (1.0 + aCity * 1.6) * pulse;

    // Attenuation par la distance a la camera
    gl_PointSize = size * uPixelRatio * (520.0 / max(-mv.z, 1.0));

    // La face cachee du globe s'estompe : c'est ce qui donne le
    // volume, sans aucune sphere opaque ni test de profondeur.
    vec3 nrm = normalize(mat3(modelViewMatrix) * dir);
    float facing = smoothstep(-0.55, 0.15, nrm.z);

    // Une fois disperses, les points perdent cette notion de face.
    facing = mix(facing, 0.75, uDissolve);

    vAlpha = facing * uFade * mix(0.72, 1.0, aCity);
  }
`;

export const POINTS_FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;
  uniform vec3 uAccent;

  varying float vCity;
  varying float vAlpha;

  void main() {
    // Point circulaire, bord adouci. Le carre par defaut est rejete.
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);
    if (d2 > 0.25) discard;

    float edge = smoothstep(0.25, 0.06, d2);
    vec3 col = mix(uColor, uAccent, vCity);

    gl_FragColor = vec4(col, edge * vAlpha);
  }
`;

/* --- Halo pulsant d'Abidjan --------------------------------------- */

export const HALO_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uFade;
  uniform float uDissolve;

  attribute float aPhase;    // decale les ondes les unes des autres

  varying float vRing;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    // Onde de 0 a 1, relancee en boucle
    float t = fract(uTime * 0.32 + aPhase);
    vRing = t;

    // Le halo grandit pendant que son opacite retombe.
    gl_PointSize = (10.0 + t * 46.0) * uPixelRatio * (520.0 / max(-mv.z, 1.0));

    // Masque la face arriere : l'onde ne traverse pas la Terre.
    vec3 nrm = normalize(mat3(modelViewMatrix) * normalize(position));
    float facing = smoothstep(-0.05, 0.35, nrm.z);

    vAlpha = (1.0 - t) * facing * uFade * (1.0 - uDissolve);
  }
`;

export const HALO_FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uAccent;

  varying float vRing;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    // Anneau fin : plein au centre du trait, vide de part et d'autre.
    float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.30, 0.40, d);

    gl_FragColor = vec4(uAccent, ring * vAlpha * 0.55);
  }
`;

/* --- Arcs de lumiere ---------------------------------------------- */

export const ARCS_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uDissolve;

  attribute float aT;        // position le long de l'arc, de 0 a 1
  attribute float aPhase;    // decalage temporel propre a chaque arc

  varying float vAlpha;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    // Chaque arc parcourt son cycle a son propre rythme.
    float t = fract(uTime * 0.17 + aPhase);

    // La tete depasse 1.0 pour que la trainee finisse de sortir.
    float head = t * 1.45;
    float d = head - aT;

    // Trainee : montee franche derriere la tete, extinction plus lente.
    float trail = smoothstep(0.0, 0.05, d) * (1.0 - smoothstep(0.05, 0.34, d));

    // L'arc entier s'allume puis se dissipe sur la duree du cycle.
    float life = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.72, 1.0, t));

    vAlpha = trail * life * uFade * (1.0 - uDissolve);
  }
`;

export const ARCS_FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uAccent;

  varying float vAlpha;

  void main() {
    if (vAlpha < 0.002) discard;
    gl_FragColor = vec4(uAccent, vAlpha);
  }
`;
