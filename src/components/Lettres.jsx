/**
 * Découpe une ligne de texte en lettres animables.
 *
 * Le découpage est purement visuel : l'élément parent porte le texte
 * entier dans aria-label, et les lettres sont masquées aux technologies
 * d'assistance, sans quoi un lecteur d'écran épellerait le titre.
 * Aucun style en ligne : le délai d'apparition de chaque lettre est
 * donné par sa position (nth-child) dans la feuille de style, ce qui
 * garde le HTML compatible avec la politique de sécurité stricte.
 */
export default function Lettres({ texte }) {
  return Array.from(texte).map((caractere, i) =>
    caractere === ' ' ? (
      <span className="lettre lettre--espace" key={i}>
        {' '}
      </span>
    ) : (
      <span className="lettre" key={i}>
        {caractere}
      </span>
    )
  );
}
