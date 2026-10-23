import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';
import Lettres from './Lettres.jsx';

/**
 * Scène d'ouverture : le nom, en capitales étendues, comme gravé dans la
 * lumière de la planète.
 *
 * Chaque ligne superpose trois couches du même texte : une lueur bleue
 * floutée (fixe, peinte une fois), les lettres elles-mêmes (dégradé
 * métallique, éclatées au premier défilement) et un reflet qui balaie le
 * métal (une fenêtre et son contenu qui glissent en sens inverse :
 * transformations seules, animées par le compositeur).
 */
export default function Ouverture() {
  return (
    <section className="plan plan--ouverture" id="haut" aria-labelledby="titre-nom">
      <div className="plan__corps ouverture">
        <p className="ouverture__lieu mono">
          <span className="ouverture__point" aria-hidden="true" />
          {typo(IDENTITE.lieu)}
          <span className="ouverture__coordonnees" aria-hidden="true">
            {IDENTITE.coordonnees}
          </span>
        </p>

        <h1 className="nom" id="titre-nom" aria-label={IDENTITE.complet}>
          {IDENTITE.lignes.map((ligne) => (
            <span className="nom__ligne" aria-hidden="true" key={ligne}>
              <span className="nom__lueur">
                <Lettres texte={ligne} />
              </span>
              <span className="nom__texte">
                <Lettres texte={ligne} />
              </span>
              <span className="nom__reflet">
                <span className="nom__reflet-fenetre">
                  <span className="nom__reflet-texte">
                    <Lettres texte={ligne} />
                  </span>
                </span>
              </span>
            </span>
          ))}
        </h1>
        <span className="nom__trait" aria-hidden="true" />

        <p className="ouverture__titre">{typo(IDENTITE.titre)}</p>
        <p className="ouverture__sous-titre mono">{IDENTITE.sousTitre}</p>

        <div className="ouverture__actions">
          <button type="button" className="visite-bouton" data-visite>
            <span className="visite-bouton__cadran" aria-hidden="true">
              <span className="visite-bouton__orbite">
                <svg viewBox="0 0 48 48" focusable="false">
                  <circle className="visite-bouton__arc" cx="24" cy="24" r="22.5" pathLength="100" />
                </svg>
              </span>
              <svg className="visite-bouton__lecture" viewBox="0 0 48 48" focusable="false">
                <circle className="visite-bouton__piste" cx="24" cy="24" r="22.5" />
                <path d="M20 16.6 L31.4 24 L20 31.4 Z" />
              </svg>
            </span>
            <span className="visite-bouton__texte">
              <span className="visite-bouton__label">Visite guidée</span>
              <span className="visite-bouton__info mono" aria-hidden="true" data-visite-duree />
            </span>
            <span className="visite-bouton__reflet" aria-hidden="true" />
          </button>
          <p className="ouverture__invite mono" aria-hidden="true">
            <span className="ouverture__molette" />
            Défilez pour avancer
          </p>
        </div>
      </div>
    </section>
  );
}
