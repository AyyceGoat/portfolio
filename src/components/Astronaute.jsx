/**
 * L'astronaute : huit positions de marche, tirées d'une même planche
 * (public/espace/astronaute-*.webp, préparée par scripts/astronaute.py).
 * La mise en scène (scene/voyage.js) le pose sur la passerelle à l'endroit
 * que calcule le monde, choisit la position selon la distance parcourue,
 * et lui donne un léger mouvement vertical à chaque pas. Son reflet sur le
 * plancher et son ombre de contact le posent sur la passerelle.
 */
export default function Astronaute() {
  return (
    <div className="astronaute" aria-hidden="true">
      <div className="astronaute__pose">
        <div className="astronaute__ombre" />
        <div className="astronaute__reflet">
          <div className="astronaute__bande" />
        </div>
        <div className="astronaute__corps">
          <div className="astronaute__bande" />
        </div>
      </div>
    </div>
  );
}
