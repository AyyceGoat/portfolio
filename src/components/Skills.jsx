import Lettres from './Lettres.jsx';

const GROUPS = [
  {
    num: '01',
    title: 'Back-end',
    items: ['PHP', 'Laravel', 'Node.js', 'API REST', 'MVC', 'Google Apps Script'],
  },
  {
    num: '02',
    title: 'Front-end',
    items: ['JavaScript', 'React', 'Vite', 'TypeScript', 'HTML5', 'CSS3'],
  },
  {
    num: '03',
    title: 'Données',
    items: ['MySQL', 'SQL Server', 'Sequelize', 'Redis', 'Google Sheets'],
  },
  {
    num: '04',
    title: 'Conception',
    items: ['UML', 'Merise', 'Modélisation', 'Rôles et permissions', 'JWT'],
  },
  {
    num: '05',
    title: 'Outils',
    items: ['Git', 'GitHub', 'Docker', 'Nginx', 'Netlify', 'Composer'],
  },
  {
    num: '06',
    title: 'Python et IA',
    items: ['Python', 'FastAPI', 'Automatisation', 'Intégration d’API d’IA'],
  },
];

export default function Skills() {
  return (
    <section className="section" id="competences" aria-labelledby="titre-competences">
      <div className="wrap">
        <div className="section-head reveal reveal--lettres">
          <span className="section-head__num">03</span>
          <h2 className="section-head__title" id="titre-competences" aria-label="Compétences">
            <span aria-hidden="true">
              <Lettres texte="Compétences" />
            </span>
          </h2>
          <span className="section-head__aside mono">Ce que je pratique</span>
        </div>

        <div className="skills">
          {GROUPS.map((group) => (
            <div className="skill reveal" key={group.num}>
              <div className="skill__head">
                <span className="skill__num">{group.num}</span>
                <h3 className="skill__title">{group.title}</h3>
              </div>
              <ul className="skill__list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
