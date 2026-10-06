/**
 * Choisit le niveau de rendu du ciel selon l'appareil.
 *
 *  - 'complet' : poste de travail, champ d'etoiles dense, parallaxe
 *    au curseur et au defilement.
 *  - 'mobile'  : trois fois moins d'etoiles, resolution plafonnee, rendu
 *    suspendu des que la page est immobile.
 *  - 'fixe'    : aucune animation, aucun WebGL. Le ciel reste peint en
 *    CSS. C'est la version servie en mouvement reduit, sans WebGL, en
 *    mode economie de donnees, ou sur un appareil tres modeste.
 *
 * Le moteur peut encore redescendre d'un cran en cours de route s'il
 * mesure qu'il ne tient pas la cadence : voir champ.js.
 */
export function choisirNiveau() {
  if (typeof window === 'undefined') return 'fixe';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'fixe';

  const nav = window.navigator || {};
  if (nav.connection && nav.connection.saveData) return 'fixe';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 1) return 'fixe';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return 'fixe';

  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl')) return 'fixe';
  } catch (e) {
    return 'fixe';
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const etroit = window.innerWidth < 820;
  const modeste =
    (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) ||
    (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4);

  return coarse || etroit || modeste ? 'mobile' : 'complet';
}

export const REGLAGES = {
  complet: {
    etoiles: 5200,
    dpr: 1.75,
    repos: 33,
    sommeil: 50,
    arret: 0,
    // Les nebuleuses sont peintes bien en dessous de la resolution de
    // l'ecran : ce sont des nuages, le flou ne se voit pas, et le cout
    // du fragment shader s'effondre.
    nuees: { facteur: 0.5, max: 1280 },
  },
  mobile: {
    etoiles: 1700,
    dpr: 1.25,
    repos: 33,
    sommeil: 66,
    arret: 7000,
    nuees: { facteur: 0.36, max: 760 },
  },
};
