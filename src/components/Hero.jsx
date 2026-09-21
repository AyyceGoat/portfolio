import Lettres from './Lettres.jsx';

const STACK = ['PHP', 'Laravel', 'JavaScript', 'React', 'MySQL', 'Python', 'Git'];

export default function Hero({ innerRef }) {
  return (
    <header className="hero" id="haut" ref={innerRef}>
      <div className="hero__inner">
        <p className="hero__status reveal">
          <span className="hero__dot" aria-hidden="true" />
          <span className="hero__status-text">
            Abidjan, Côte d’Ivoire
            <span className="hero__status-sep" aria-hidden="true"> — </span>
            <span className="hero__status-avail">ouvert à un CDI, un CDD ou un stage</span>
          </span>
        </p>

        {/* Le nom monte lettre par lettre. Le titre reste entier pour
            les lecteurs d'ecran, qui ne doivent surtout pas l'epeler. */}
        <h1
          className="hero__name reveal reveal--lettres"
          aria-label="Ahouet Yann Christ Emmanuel"
        >
          <span className="hero__name-line" aria-hidden="true">
            <Lettres texte="Ahouet Yann" />
          </span>
          <span className="hero__name-line" aria-hidden="true">
            <span className="hero__given">
              <Lettres texte="Christ" depart={10} />
            </span>
            <span className="lettre-espace">{' '}</span>
            <Lettres texte="Emmanuel" depart={16} />
          </span>
        </h1>

        <p className="hero__role reveal reveal--d3">
          <strong>Développeur web.</strong> Je conçois et développe des applications et des
          systèmes d’information complets, de l’analyse du besoin jusqu’au déploiement.
        </p>

        <div className="hero__actions reveal reveal--d4">
          <a className="btn btn--solid" href="#projets">
            Voir les projets
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </a>
          <a className="btn btn--ghost" href="#contact">
            Me contacter
          </a>
        </div>

        <ul className="hero__stack reveal reveal--d4">
          {STACK.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </header>
  );
}
