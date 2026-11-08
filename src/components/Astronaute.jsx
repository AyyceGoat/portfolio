/**
 * L'astronaute : un cycle de marche tiré d'une vidéo, agrandi et détouré
 * (public/espace/marche/, préparé par scripts/marche.py). La mise en scène
 * (scene/voyage.js) le pose sur la passerelle à l'endroit que calcule le
 * monde et choisit l'image selon la distance parcourue. Son reflet sur le
 * plancher et son ombre de contact le posent sur la passerelle.
 */
export default function Astronaute() {
  return (
    <div className="astronaute" aria-hidden="true">
      <div className="astronaute__pose">
        <div className="astronaute__ombre" />
        <div className="astronaute__reflet">
          <canvas />
        </div>
        <div className="astronaute__corps">
          <canvas />
        </div>
      </div>
    </div>
  );
}
