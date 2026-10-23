/**
 * Typographie française, appliquée à l'affichage :
 *  - apostrophe droite → apostrophe typographique ;
 *  - espace insécable avant « : ; ! ? » et à l'intérieur des guillemets ;
 *  - espace fine insécable dans les nombres (4 500).
 * Les données restent ainsi faciles à écrire et à relire.
 */
const INSECABLE = ' ';
const FINE = ' ';

export function typo(texte) {
  return texte
    .replace(/'/g, '’')
    .replace(/ :/g, `${INSECABLE}:`)
    .replace(/ ([;!?»])/g, `${FINE}$1`)
    .replace(/« /g, `«${FINE}`)
    .replace(/(\d) (\d{3})\b/g, `$1${FINE}$2`)
    .replace(/ (Ko|Mo|minutes|questions|items|lignes|pays)\b/g, `${INSECABLE}$1`)
    .replace(/ — /g, `${INSECABLE}— `);
}

/** Nombre écrit en toutes lettres, pour les petits effectifs. */
const MOTS = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
export function enLettres(n) {
  return MOTS[n] || String(n);
}
