import { FAITS, PORTRAIT, PRESENTATION } from '../data/profil.js';
import { media } from '../lib/media.js';
import { typo } from '../lib/typo.js';

export default function Profil() {
  return (
    <section className="plan plan--profil" id="profil" aria-labelledby="titre-profil">
      <div className="plan__corps">
        <div className="plan__defile profil">
          <figure className="profil__portrait">
            <span className="profil__cadre">
              <span className="profil__anneau" aria-hidden="true" />
              <img
              src={media(PORTRAIT.src)}
              srcSet={`${media(PORTRAIT.src)} 400w, ${media(PORTRAIT.grand)} 800w`}
              sizes="(min-width: 60rem) 19rem, 9rem"
              width="400"
              height="500"
              decoding="async"
              fetchPriority="low"
              alt={PORTRAIT.alt}
              />
            </span>
            <figcaption className="profil__legende mono" aria-hidden="true">
              <span>Abidjan</span>
              <span>UTC+0</span>
            </figcaption>
          </figure>

          <div className="profil__texte">
            <p className="entete mono">
              <span className="entete__num">01</span> Profil
            </p>
            <h2 className="profil__titre" id="titre-profil">
              {typo("De l'analyse du besoin au déploiement.")}
            </h2>
            {PRESENTATION.map((paragraphe) => (
              <p className="profil__paragraphe" key={paragraphe.slice(0, 24)}>
                {typo(paragraphe)}
              </p>
            ))}

            <dl className="faits">
              {FAITS.map((fait) => (
                <div className="faits__ligne" key={fait.label}>
                  <dt className="mono">{fait.label}</dt>
                  <dd>{typo(fait.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
