import { projects } from '../data/projects.js';
import ProjectCard from './ProjectCard.jsx';
import Lettres from './Lettres.jsx';

export default function Projects() {
  return (
    <section className="section" id="projets" aria-labelledby="titre-projets">
      <div className="wrap">
        <div className="section-head reveal reveal--lettres">
          <span className="section-head__num">02</span>
          <h2 className="section-head__title" id="titre-projets" aria-label="Projets">
            <span aria-hidden="true">
              <Lettres texte="Projets" />
            </span>
          </h2>
          <span className="section-head__aside mono">Quatre réalisations</span>
        </div>

        <div className="projects">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
