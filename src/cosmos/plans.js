/**
 * Les six regions du ciel, une par section, photographiees par le
 * telescope spatial James Webb (ESA/Webb, licence CC BY 4.0 : credits en
 * pied de page et dans le README).
 *
 * Chaque image existe en trois cadrages : paysage 1920 et 1280 pour les
 * ecrans larges, portrait pour les telephones. Les requetes media sont
 * les memes que celles du CSS, qui sert l'image du hero sans attendre le
 * moindre script.
 */
export const PLANS = ['haut', 'profil', 'projets', 'competences', 'signal', 'contact'];

const LARGE = '(min-width: 1400px), (min-width: 900px) and (min-resolution: 1.5dppx)';

export function variante() {
  if (window.matchMedia('(orientation: portrait)').matches) return 'portrait';
  return window.matchMedia(LARGE).matches ? '1920' : '1280';
}

export const source = (nom, v) => `/cosmos/webb/${nom}-${v}.webp`;
