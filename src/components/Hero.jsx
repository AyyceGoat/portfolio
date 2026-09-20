const STACK = ['PHP', 'Laravel', 'JavaScript', 'React', 'MySQL', 'Python', 'Git'];

export default function Hero() {
  return (
    <header className="hero" id="haut">
      <div className="hero__inner">
        <p className="hero__status reveal">
          <span className="hero__dot" aria-hidden="true" />
          <span className="hero__status-text">
            Abidjan, Côte d’Ivoire
            <span className="hero__status-sep" aria-hidden="true"> — </span>
            <span className="hero__status-avail">ouvert à un CDI, un CDD ou un stage</span>
          </span>
        </p>

        <h1 className="hero__name reveal reveal--d1">
          <span className="hero__name-line">Ahouet Yann</span>
          <span className="hero__name-line">
            <span className="hero__given">Christ</span> Emmanuel
          </span>
        </h1>

        <p className="hero__role reveal reveal--d2">
          <strong>Développeur web.</strong> Je conçois et développe des applications et des
          systèmes d’information complets, de l’analyse du besoin jusqu’au déploiement.
        </p>

        <div className="hero__actions reveal reveal--d3">
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
