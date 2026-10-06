import { Fragment } from 'react';

/**
 * Decoupe un texte en lettres animables.
 *
 * Accessibilite : le decoupage est purement visuel. L'element qui
 * porte ce composant garde son texte entier via aria-label, et les
 * lettres sont masquees aux technologies d'assistance — sans quoi un
 * lecteur d'ecran epellerait le titre.
 *
 * Le rang de chaque lettre passe par un attribut data-i, traduit en
 * delai par la feuille de style. Pas de style en ligne : le HTML rendu
 * au serveur reste compatible avec la politique de securite stricte.
 *
 * Les lettres d'un meme mot sont regroupees dans une boite insecable :
 * sans cela le navigateur voit une suite de boites independantes et
 * coupe le mot n'importe ou en fin de ligne. L'espace entre deux mots
 * reste, lui, un point de coupure normal.
 */
export default function Lettres({ texte, depart = 0 }) {
  let i = depart;
  const mots = texte.split(' ');

  return (
    <>
      {mots.map((mot, rangMot) => (
        <Fragment key={`m${rangMot}`}>
          {rangMot > 0 ? ' ' : null}
          <span className="lettre-mot">
            {Array.from(mot).map((caractere, index) => {
              const rang = Math.min(i, 40);
              i += 1;
              return (
                <span className="lettre" data-i={rang} key={`${caractere}${index}`}>
                  {caractere}
                </span>
              );
            })}
          </span>
        </Fragment>
      ))}
    </>
  );
}
