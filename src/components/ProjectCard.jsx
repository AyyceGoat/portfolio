import { useTilt } from '../hooks/useTilt.js';
import Architecture from './Architecture.jsx';

function Arrow() {
  return (
    <span className="btn__arrow" aria-hidden="true">
      →
    </span>
  );
}

function Lock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function ProjectCard({ project, flip }) {
  const tilt = useTilt();
  const { shot, links } = project;

  return (
    <div className="project-frame reveal">
      <article
        ref={tilt.ref}
        onMouseMove={tilt.onMouseMove}
        onMouseLeave={tilt.onMouseLeave}
        className={`project${flip ? ' project--flip' : ''}`}
        aria-labelledby={`projet-${project.id}`}
      >
        <span className="project__gleam" aria-hidden="true" />

        <div
          className={`project__visual${project.mission ? ' project__visual--schema' : ''}`}
        >
          {project.mission ? (
            <Architecture />
          ) : (
            <div className="project__shot-wrap">
              <img
                className="project__shot"
                src={shot.src}
                srcSet={`${shot.small} 700w, ${shot.src} 1400w`}
                sizes="(min-width: 62rem) 46vw, 92vw"
                width="1400"
                height="875"
                loading="lazy"
                decoding="async"
                alt={shot.alt}
              />
            </div>
          )}
        </div>

        <div className="project__body">
          <div className="project__meta">
            <span className="project__index">{project.index}</span>
            <span
              className={`project__tag${project.mission ? ' project__tag--mission' : ''}`}
            >
              {project.tag}
            </span>
          </div>

          <h3 className="project__title" id={`projet-${project.id}`}>
            {project.title}
          </h3>

          <p className="project__desc">{project.desc}</p>

          <ul className="project__points">
            {project.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <ul className="project__stack" aria-label={`Technologies : ${project.title}`}>
            {project.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {project.mission ? (
            <p className="project__sealed">
              <Lock />
              <span>{project.sealed}</span>
            </p>
          ) : (
            <div className="project__links">
              {links.site && (
                <a
                  className="btn btn--ghost"
                  href={links.site}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Voir le site
                  <Arrow />
                  <span className="visually-hidden"> — {project.title}, nouvel onglet</span>
                </a>
              )}
              {links.repo && (
                <a
                  className="btn btn--ghost"
                  href={links.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Dépôt
                  <span className="visually-hidden"> GitHub du projet {project.title}, nouvel onglet</span>
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
