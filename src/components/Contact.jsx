import { useEffect, useState } from 'react';
import Lettres from './Lettres.jsx';

/**
 * Adresse stockee a l'envers et en morceaux : la chaine complete
 * n'existe telle quelle ni dans le HTML servi, ni dans le fichier
 * JavaScript livre. Elle n'est reconstituee qu'une fois la page
 * ouverte dans un vrai navigateur, ce qui met en echec les
 * moissonneurs d'adresses qui se contentent de lire les sources.
 */
const PARTS = ['7tsirhcnnaY', 'liamg', 'moc'];
const flip = (s) => s.split('').reverse().join('');

const PHONE_DISPLAY = '+225 01 72 96 97 33';
const PHONE_HREF = 'tel:+2250172969733';

export default function Contact() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    setEmail(`${flip(PARTS[0])}@${flip(PARTS[1])}.${flip(PARTS[2])}`);
  }, []);

  return (
    <section className="section" id="contact" aria-labelledby="titre-contact">
      <div className="wrap">
        <div className="section-head reveal reveal--lettres">
          <span className="section-head__num">05</span>
          <h2 className="section-head__title" id="titre-contact" aria-label="Contact">
            <span aria-hidden="true">
              <Lettres texte="Contact" />
            </span>
          </h2>
          <span className="section-head__aside mono">Parlons-en</span>
        </div>

        <div className="contact__grid">
          <div className="reveal">
            <p className="lede contact__lede">
              Je cherche un CDI, un CDD ou un stage en développement web, à Abidjan ou à
              distance. Écrivez-moi : je réponds à tout message sérieux.
            </p>

            <div className="contact__lines">
              <a
                className="contact__line"
                href={email ? `mailto:${email}` : undefined}
                aria-label="M’écrire par courriel"
              >
                <span className="contact__line-label">E-mail</span>
                <span className="contact__line-value">
                  {email || <span className="mono">chargement…</span>}
                </span>
                <span className="contact__line-arrow" aria-hidden="true">
                  →
                </span>
              </a>

              <a className="contact__line" href={PHONE_HREF}>
                <span className="contact__line-label">Téléphone</span>
                <span className="contact__line-value">{PHONE_DISPLAY}</span>
                <span className="contact__line-arrow" aria-hidden="true">
                  →
                </span>
              </a>

              <a
                className="contact__line"
                href="https://github.com/AyyceGoat"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span className="contact__line-label">GitHub</span>
                <span className="contact__line-value">
                  github.com/AyyceGoat
                  <span className="visually-hidden"> — nouvel onglet</span>
                </span>
                <span className="contact__line-arrow" aria-hidden="true">
                  →
                </span>
              </a>

              <p className="contact__line">
                <span className="contact__line-label">Lieu</span>
                <span className="contact__line-value">Abidjan, Côte d’Ivoire</span>
              </p>
            </div>
          </div>

          <div className="contact__aside reveal reveal--d2">
            <div className="cv-card">
              <p className="cv-card__meta">Curriculum vitæ</p>
              <h3 className="cv-card__title">Le parcours en deux pages</h3>
              <p className="cv-card__text">
                Formation, expériences, réalisations et compétences détaillées, au format PDF.
              </p>
              <a
                className="btn btn--solid"
                href="/CV-Ahouet-Yann-Christ-Emmanuel.pdf"
                download
              >
                Télécharger le CV
                <span className="btn__arrow" aria-hidden="true">
                  ↓
                </span>
              </a>
              <p className="cv-card__meta">PDF · 60 Ko</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
