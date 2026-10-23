import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';
import Lettres from './Lettres.jsx';

/**
 * Scène d'ouverture : le nom, en capitales étendues, d'un seul trait plein.
 * Les lettres sont découpées pour monter une à une au premier affichage.
 */
export default function Ouverture() {
  return (
    <section className="plan plan--ouverture" id="haut" aria-labelledby="titre-nom">
      <div className="plan__corps ouverture">
        <p className="ouverture__lieu mono">{typo(IDENTITE.lieu)}</p>

        <h1 className="nom" id="titre-nom" aria-label={IDENTITE.complet}>
          {IDENTITE.lignes.map((ligne) => (
            <span className="nom__ligne" aria-hidden="true" key={ligne}>
              <Lettres texte={ligne} />
            </span>
          ))}
        </h1>
        <span className="nom__trait" aria-hidden="true" />

        <p className="ouverture__titre">{typo(IDENTITE.titre)}</p>
        <p className="ouverture__sous-titre mono">{IDENTITE.sousTitre}</p>

        <div className="ouverture__actions">
          <button type="button" className="bouton-fin" data-visite>
            <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true" focusable="false">
              <path d="M1 1.2 L8 5 L1 8.8 Z" fill="currentColor" />
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
