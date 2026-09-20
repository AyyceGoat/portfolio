const FACTS = [
  { label: 'Formation', value: 'Master 1 Informatique validé, Master 2 en préparation — AGITEL Formation, Abidjan' },
  { label: 'Recherche', value: 'CDI, CDD ou stage en développement web' },
  { label: 'Lieu', value: "Abidjan, Côte d'Ivoire — ouvert au travail à distance" },
  { label: 'Langues', value: 'Français courant, anglais technique' },
];

export default function About() {
  return (
    <section className="section" id="profil" aria-labelledby="titre-profil">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="section-head__num">01</span>
          <h2 className="section-head__title" id="titre-profil">
            Profil
          </h2>
          <span className="section-head__aside mono">Qui je suis</span>
        </div>

        <div className="about__grid">
          <figure className="about__portrait reveal">
            <img
              src="/portrait-400.webp"
              srcSet="/portrait-400.webp 400w, /portrait-800.webp 800w"
              sizes="(min-width: 54rem) 17rem, 60vw"
              width="400"
              height="500"
              loading="lazy"
              decoding="async"
              alt="Portrait de Ahouet Yann Christ Emmanuel."
            />
          </figure>

          <div className="about__text reveal reveal--d2">
            <p>
              Je m’appelle <strong>Ahouet Yann Christ Emmanuel</strong>, et l’on m’appelle
              Christ. Je suis développeur web à Abidjan, en Côte d’Ivoire, et j’achève un
              Master en développement d’applications web à AGITEL Formation.
            </p>
            <p>
              Ce qui me caractérise le mieux : j’ai l’habitude de me retrouver seul face à un
              besoin métier réel, et de le mener jusqu’au bout. Sur l’ERP industriel que je
              développe depuis 2025, j’ai traduit le cahier des charges d’un contrôleur de
              gestion en une application déployée et utilisée quotidiennement sur plusieurs
              sites — de l’analyse jusqu’à l’interface que les conducteurs manipulent sur le
              terrain.
            </p>
            <p>
              Je travaille aussi bien côté serveur, en <strong>PHP et Laravel</strong>, que
              côté interface, en <strong>JavaScript et React</strong>. Je conçois mes bases de
              données avant de les écrire — UML et Merise — parce qu’un schéma juste au départ
              coûte toujours moins cher qu’une correction en production.
            </p>

            <dl className="about__facts">
              {FACTS.map((fact) => (
                <div className="about__fact" key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
