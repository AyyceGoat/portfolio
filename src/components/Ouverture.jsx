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
          <button type="button" className="bouton bouton--visite" data-visite>
            <svg className="icone" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
              <path d="M3 1.8 L10 6 L3 10.2 Z" fill="currentColor" />
            </svg>
            Visite guidée
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
