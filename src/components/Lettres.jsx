/**
 * Decoupe un texte en lettres animables.
 *
 * Accessibilite : le decoupage est purement visuel. L'element qui
 * porte ce composant garde son texte entier via aria-label, et les
 * lettres sont masquees aux technologies d'assistance — sans quoi un
 * lecteur d'ecran epellerait le titre.
 *
 * Performance : chaque lettre ne fait varier que transform et opacity.
 * Le decalage est porte par une variable CSS, donc lu par la feuille
 * de style et non recalcule dans le rendu.
 */
export default function Lettres({ texte, depart = 0 }) {
  let i = depart;

  return (
    <>
      {Array.from(texte).map((caractere, index) => {
        // Les espaces ne sont pas animes : ils ne se voient pas, et les
        // compter fausserait la cadence de la vague.
        if (caractere === ' ') {
          return (
            <span className="lettre-espace" key={`e${index}`}>
              {' '}
            </span>
          );
        }
        const style = { '--i': i };
        i += 1;
        return (
          <span className="lettre" key={`${caractere}${index}`} style={style}>
            {caractere}
          </span>
        );
      })}
    </>
  );
}

/** Nombre de lettres reellement animees, pour enchainer les segments. */
export function compterLettres(texte) {
  return Array.from(texte).filter((c) => c !== ' ').length;
}
