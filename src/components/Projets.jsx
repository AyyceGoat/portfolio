import { projects } from '../data/projects.js';
import { media } from '../lib/media.js';
import { typo } from '../lib/typo.js';
import { FlecheOblique } from './Icones.jsx';
import Lettres from './Lettres.jsx';

function Cadenas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Schéma d'un système sous confidentialité : ses couches, rien d'autre. */
function Schema({ couches, titre }) {
  return (
    <figure className="schema">
      <ol className="schema__couches" aria-label={`Architecture : ${titre}`}>
        {couches.map((c) => (
          <li className="schema__couche" key={c.couche}>
            <span className="schema__nom mono">{c.couche}</span>
            <span className="schema__titre">{c.titre}</span>
            <span className="schema__detail">{typo(c.detail)}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Le titre du chapitre, qui arrive seul du fond de la scène. */
export function ProjetsTitre() {
  return (
    <section className="plan plan--projets" id="projets" aria-labelledby="titre-projets">
      <div className="plan__corps projets-titre">
        <p className="entete mono">
          <span className="entete__num">02</span> Réalisations
        </p>
        <h2 className="projets-titre__mot" id="titre-projets" aria-label="Projets">
          <span aria-hidden="true">
            <Lettres texte="Projets" />
          </span>
        </h2>
        <p className="projets-titre__sous">Mes réalisations.</p>
      </div>
    </section>
  );
}

export function Projet({ projet, rang, total }) {
  const { shot, links } = projet;
  const numero = String(rang + 1).padStart(2, '0');
  const sur = String(total).padStart(2, '0');

  return (
    <article
      className={`plan plan--projet${rang % 2 ? ' plan--inverse' : ''}`}
      id={`projet-${projet.id}`}
      aria-labelledby={`titre-${projet.id}`}
    >
      <div className="plan__corps">
        <div className="plan__defile projet">
          <div className="projet__visuel">
            <div className="projet__ecran">
              {projet.schema ? (
                <Schema couches={projet.schema} titre={projet.title} />
              ) : (
                <figure className="projet__capture">
                  <img
                    src={media(shot.src)}
                    srcSet={`${media(shot.small)} 700w, ${media(shot.src)} 1400w`}
                    sizes="(min-width: 60rem) 42vw, 86vw"
                    width="1400"
                    height="875"
                    decoding="async"
                    fetchPriority="low"
                    alt={typo(shot.alt)}
                  />
                </figure>
              )}
            </div>
          </div>

          <div className="projet__texte">
            <p className="projet__meta mono">
              <span className="projet__numero">
                {numero}
                <span className="projet__sur"> / {sur}</span>
              </span>
              <span className={projet.schema ? 'projet__tag projet__tag--mission' : 'projet__tag'}>
                {projet.tag}
              </span>
            </p>
            <h3 className="projet__titre" id={`titre-${projet.id}`}>
              {typo(projet.title)}
            </h3>
            <p className="projet__desc">{typo(projet.desc)}</p>
            <ul className="projet__points">
              {projet.points.map((point) => (
                <li key={point.slice(0, 32)}>{typo(point)}</li>
              ))}
            </ul>
            <ul className="projet__pile" aria-label={`Technologies : ${projet.title}`}>
              {projet.stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {projet.sealed ? (
              <p className="projet__scelle">
                <Cadenas />
                <span>{typo(projet.sealed)}</span>
              </p>
            ) : (
              links && (
                <div className="projet__liens">
                  {links.site && (
                    <a className="bouton bouton--clair" href={links.site} target="_blank" rel="noreferrer noopener">
                      Voir le site
                      <FlecheOblique />
                      <span className="visuellement-cache"> {projet.title}, nouvel onglet</span>
                    </a>
                  )}
                  {links.repo && (
                    <a className="bouton bouton--trait" href={links.repo} target="_blank" rel="noreferrer noopener">
                      Code source
                      <FlecheOblique />
                      <span className="visuellement-cache"> de {projet.title} sur GitHub, nouvel onglet</span>
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Projets() {
  return (
    <>
      <ProjetsTitre />
      {projects.map((projet, i) => (
        <Projet projet={projet} rang={i} total={projects.length} key={projet.id} />
      ))}
    </>
  );
}
