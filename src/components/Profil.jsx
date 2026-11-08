import { FAITS, IDENTITE, PORTRAIT, PRESENTATION } from '../data/profil.js';
import { media } from '../lib/media.js';
import { Riche } from '../lib/riche.jsx';
import { typo } from '../lib/typo.js';
import { Bordure, Diplome } from './Icones.jsx';

const fait = (label) => (FAITS.find((f) => f.label === label) || {}).value;

/** Deuxième étape du voyage : la photo, la présentation et le parcours. */
export default function Profil() {
  return (
    <section className="identite" id="profil" aria-labelledby="titre-profil">
      <div className="verre identite__carte">
        <Bordure />
        <p className="etiquette">Présentation</p>
        <div className="identite__tete">
          <span className="identite__photo">
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
          </span>
          <div className="identite__noms">
            <h2 className="identite__nom degrade" id="titre-profil">
              {IDENTITE.complet.split(' ').map((mot, i) => (
                <span key={mot}>
                  {i > 0 && ' '}
                  <span className="mot">{mot}</span>
                </span>
              ))}
            </h2>
            <p className="identite__titre">{typo(IDENTITE.titre)}</p>
          </div>
        </div>

        <div className="identite__texte">
          {PRESENTATION.map((paragraphe) => (
            <p className="identite__paragraphe" key={paragraphe.slice(0, 24)}>
              <Riche texte={paragraphe} />
            </p>
          ))}
        </div>

        <div className="identite__parcours">
          <h3 className="etiquette etiquette--icone">
            <Diplome />
            Parcours
          </h3>
          <p className="identite__fait">{typo(fait('Formation'))}</p>
        </div>
      </div>
    </section>
  );
}
