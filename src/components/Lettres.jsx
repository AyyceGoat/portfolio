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
 */
export default function Lettres({ texte, depart = 0 }) {
  let i = depart;

  return (
    <>
      {Array.from(texte).map((caractere, index) => {
        if (caractere === ' ') {
          return (
            <span className="lettre-espace" key={`e${index}`}>
              {'\u00A0'}
            </span>
          );
        }
        const rang = Math.min(i, 40);
        i += 1;
        return (
          <span className="lettre" data-i={rang} key={`${caractere}${index}`}>
            {caractere}
          </span>
        );
      })}
    </>
  );
}
