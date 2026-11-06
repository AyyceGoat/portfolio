import { EXPERTISE, FAITS, IDENTITE, PORTRAIT, PRESENTATION } from '../data/profil.js';
import { media } from '../lib/media.js';
import { typo } from '../lib/typo.js';

const fait = (label) => (FAITS.find((f) => f.label === label) || {}).value;

/** À l'arrivée : l'identité, le parcours, l'expertise et les ambitions. */
export default function Profil() {
  return (
    <section className="section identite" id="profil" aria-labelledby="titre-profil">
      <div className="carte identite__carte">
        <div className="identite__tete">
          <img
            className="identite__portrait"
            src={media(PORTRAIT.src)}
            srcSet={`${media(PORTRAIT.src)} 400w, ${media(PORTRAIT.grand)} 800w`}
            sizes="8rem"
            width="400"
            height="500"
            loading="lazy"
            decoding="async"
            alt={PORTRAIT.alt}
          />
          <div>
            <h2 className="identite__nom" id="titre-profil">
              {IDENTITE.complet}
            </h2>
            <p className="identite__titre">{typo(IDENTITE.titre)}</p>
            <p className="identite__sous-titre mono">{IDENTITE.sousTitre}</p>
          </div>
        </div>

        <div className="identite__colonnes">
          <div className="identite__colonne">
            <h3 className="rubrique mono">Présentation</h3>
            {PRESENTATION.map((paragraphe) => (
              <p className="identite__paragraphe" key={paragraphe.slice(0, 24)}>
                {typo(paragraphe)}
              </p>
            ))}
          </div>

          <div className="identite__colonne">
            <h3 className="rubrique mono">Parcours académique</h3>
            <p className="identite__fait">{typo(fait('Formation'))}</p>

            <h3 className="rubrique mono">Domaines d&apos;expertise</h3>
            <ul className="expertise">
              {EXPERTISE.map((d) => (
                <li key={d.titre}>
                  <span className="expertise__titre">{typo(d.titre)}</span>
                  <span className="expertise__detail">{typo(d.detail)}</span>
                </li>
              ))}
            </ul>

            <h3 className="rubrique mono">Ambitions</h3>
            <p className="identite__fait">
              {typo("Disponible pour un CDI, un CDD ou un stage en développement d'applications, à Abidjan ou à distance.")}
            </p>
            <p className="identite__fait identite__fait--discret">{typo(fait('Langues'))}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
