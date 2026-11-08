import { typo } from './typo.js';

/**
 * Un texte dont les [[mots-clés]] sont mis en valeur (en bleu clair, ils
 * s'illuminent à l'apparition de leur panneau). La typographie française
 * est posée sur chaque morceau.
 */
export function Riche({ texte }) {
  return texte.split(/\[\[(.+?)\]\]/).map((morceau, i) =>
    i % 2 ? (
      <strong className="cle" key={i}>
        {typo(morceau)}
      </strong>
    ) : (
      typo(morceau)
    )
  );
}

/** Le même texte, sans marques (attributs, textes de remplacement). */
export const sansMarques = (texte) => texte.replace(/\[\[(.+?)\]\]/g, '$1');
