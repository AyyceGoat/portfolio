import { IDENTITE } from '../data/profil.js';
import { typo } from '../lib/typo.js';
import Lettres from './Lettres.jsx';

/** Scène d'ouverture : le nom, en très grand, au-dessus du chemin. */
export default function Ouverture() {
  return (
    <section className="plan plan--ouverture" id="haut" aria-labelledby="titre-nom">
      <div className="plan__corps ouverture">
        <p className="ouverture__lieu mono">
          <span className="ouverture__point" aria-hidden="true" />
          {typo(IDENTITE.lieu)}
        </p>

        <h1 className="ouverture__nom" id="titre-nom" aria-label={IDENTITE.complet}>
          {IDENTITE.lignes.map((ligne) => (
            <span className="ouverture__ligne" aria-hidden="true" key={ligne}>
              <Lettres texte={ligne} />
            </span>
          ))}
        </h1>

        <p className="ouverture__titre">{typo(IDENTITE.titre)}</p>

        <p className="ouverture__invite mono" aria-hidden="true">
          <span className="ouverture__molette" />
          Défilez pour avancer
        </p>
      </div>
    </section>
  );
}
