import { FAITS, PORTRAIT, PRESENTATION } from '../data/profil.js';
import { typo } from '../lib/typo.js';

export default function Profil() {
  return (
    <section className="plan plan--profil" id="profil" aria-labelledby="titre-profil">
      <div className="plan__corps">
        <div className="plan__defile profil">
          <figure className="profil__portrait">
            <img
              src={PORTRAIT.src}
              srcSet={PORTRAIT.srcSet}
              sizes="(min-width: 60rem) 20rem, 11rem"
              width="400"
              height="500"
              decoding="async"
              loading="lazy"
              alt={PORTRAIT.alt}
            />
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
