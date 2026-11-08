import { FAITS, IDENTITE, PORTRAIT, PRESENTATION } from '../data/profil.js';
import { media } from '../lib/media.js';
import { typo } from '../lib/typo.js';

const fait = (label) => (FAITS.find((f) => f.label === label) || {}).value;

/** Deuxième étape du voyage : la photo, la présentation et le parcours. */
export default function Profil() {
  return (
    <section className="identite" id="profil" aria-labelledby="titre-profil">
      <div className="carte identite__carte">
        <div className="identite__tete">
          <img
            className="identite__portrait"
            src={media(PORTRAIT.src)}
            srcSet={`${media(PORTRAIT.src)} 400w, ${media(PORTRAIT.grand)} 800w`}
            sizes="7rem"
            width="400"
            height="500"
            loading="lazy"
            decoding="async"
            alt={PORTRAIT.alt}
          />
          <div>
            <p className="rubrique mono">Présentation</p>
            <h2 className="identite__nom" id="titre-profil">
              {IDENTITE.complet}
            </h2>
            <p className="identite__titre">{typo(IDENTITE.titre)}</p>
          </div>
        </div>

        <div className="identite__texte">
          {PRESENTATION.map((paragraphe) => (
            <p className="identite__paragraphe" key={paragraphe.slice(0, 24)}>
              {typo(paragraphe)}
            </p>
          ))}
        </div>

        <div className="identite__parcours">
          <h3 className="rubrique mono">Parcours</h3>
          <p className="identite__fait">{typo(fait('Formation'))}</p>
        </div>
      </div>
    </section>
  );
}
