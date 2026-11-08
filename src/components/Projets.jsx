import { useEffect, useRef, useState } from 'react';
import { projects } from '../data/projects.js';
import { media } from '../lib/media.js';
import { typo } from '../lib/typo.js';
import { FlecheOblique } from './Icones.jsx';

function Cadenas() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Schéma d'un système sous confidentialité : ses couches, rien d'autre. */
function Schema({ couches, titre, detaille = false }) {
  return (
    <ol className={`schema${detaille ? ' schema--detaille' : ''}`} aria-label={`Architecture : ${titre}`}>
      {couches.map((c) => (
        <li className="schema__couche" key={c.couche}>
          <span className="schema__nom mono">{c.couche}</span>
          <span className="schema__titre">{c.titre}</span>
          {detaille && <span className="schema__detail">{typo(c.detail)}</span>}
        </li>
      ))}
    </ol>
  );
}

function Visuel({ projet, sizes, detaille = false }) {
  if (projet.schema) return <Schema couches={projet.schema} titre={projet.title} detaille={detaille} />;
  const { shot } = projet;
  return (
    <img
      src={media(shot.src)}
      srcSet={`${media(shot.small)} 700w, ${media(shot.src)} 1400w`}
      sizes={sizes}
      width="1400"
      height="875"
      loading="lazy"
      decoding="async"
      alt={typo(shot.alt)}
    />
  );
}

/** Le lien principal d'un projet : le site s'il existe, sinon le code. */
function LienPrincipal({ projet }) {
  const { links } = projet;
  if (!links) return null;
  const href = links.site || links.repo;
  if (!href) return null;
  return (
    <a className="lien-fin" href={href} target="_blank" rel="noreferrer noopener">
      {links.site ? 'Voir le site' : 'Code source'}
      <FlecheOblique />
      <span className="visuellement-cache"> de {projet.title}, nouvel onglet</span>
    </a>
  );
}

/** Un panneau du voyage : nom, aperçu, une phrase, technologies, lien. */
function Panneau({ projet, rang, ouvrir }) {
  const resume = projet.resume || projet.desc.split('. ')[0];
  const surClic = (e) => {
    if (e.target.closest('a, button')) return;
    ouvrir(rang);
  };
  return (
    // Le clic sur le panneau n'est qu'un raccourci : le bouton « Détails »
    // reste la commande accessible au clavier.
    <article
      className={`panneau panneau--${rang % 2 ? 'droite' : 'gauche'}`}
      id={`projet-${projet.id}`}
      aria-labelledby={`titre-${projet.id}`}
      onClick={surClic}
    >
      <div className="panneau__visuel">
        <Visuel projet={projet} sizes="(min-width: 48rem) min(40rem, 46vw), 30vw" />
      </div>
      <div className="panneau__texte">
        <p className="panneau__tag mono">{projet.tag}</p>
        <h3 className="panneau__titre" id={`titre-${projet.id}`}>
          {typo(projet.title)}
        </h3>
        <p className="panneau__resume">{typo(resume)}</p>
        <ul className="pile" aria-label={`Technologies : ${projet.title}`}>
          {projet.stack.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="panneau__actions">
          <button type="button" className="bouton-fin" onClick={() => ouvrir(rang)} aria-haspopup="dialog">
            Détails<span className="visuellement-cache"> du projet {projet.title}</span>
          </button>
          <LienPrincipal projet={projet} />
        </div>
      </div>
    </article>
  );
}

/** La présentation détaillée, dans une fenêtre au-dessus du voyage. */
function Fiche({ projet, fermer }) {
  const { links } = projet;
  return (
    <div className="fiche__corps">
      <button type="button" className="fiche__fermer" onClick={fermer}>
        <span className="visuellement-cache">Fermer la présentation</span>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
          <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div className="fiche__visuel">
        <Visuel projet={projet} sizes="(min-width: 60rem) 52rem, 92vw" detaille />
      </div>
      <p className="panneau__tag mono">{projet.tag}</p>
      <h3 className="fiche__titre" id="fiche-titre">
        {typo(projet.title)}
      </h3>
      <p className="fiche__desc">{typo(projet.desc)}</p>
      <ul className="fiche__points">
        {projet.points.map((point) => (
          <li key={point.slice(0, 32)}>{typo(point)}</li>
        ))}
      </ul>
      <ul className="pile" aria-label={`Technologies : ${projet.title}`}>
        {projet.stack.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {projet.sealed ? (
        <p className="fiche__scelle">
          <Cadenas />
          <span>{typo(projet.sealed)}</span>
        </p>
      ) : (
        links && (
          <div className="fiche__liens">
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
  );
}

export default function Projets() {
  const [ouvert, setOuvert] = useState(null);
  const dialogue = useRef(null);

  // La fenêtre est modale (focus retenu, Échap la ferme) ; la mise en
  // scène suspend le défilement tant qu'elle est ouverte.
  useEffect(() => {
    const d = dialogue.current;
    if (!d || ouvert === null) return;
    if (!d.open) d.showModal();
    document.dispatchEvent(new CustomEvent('fiche', { detail: true }));
  }, [ouvert]);

  const fermer = () => {
    const d = dialogue.current;
    if (d && d.open) d.close();
  };

  return (
    <section className="projets" id="projets" aria-labelledby="titre-projets">
      <header className="projets__entete">
        <p className="rubrique mono">Projets</p>
        <h2 className="projets__titre" id="titre-projets">
          Mes réalisations
        </h2>
      </header>
      {projects.map((projet, i) => (
        <Panneau projet={projet} rang={i} ouvrir={setOuvert} key={projet.id} />
      ))}
      <dialog
        className="fiche"
        ref={dialogue}
        data-lenis-prevent=""
        aria-labelledby="fiche-titre"
        onClose={() => {
          setOuvert(null);
          document.dispatchEvent(new CustomEvent('fiche', { detail: false }));
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) fermer();
        }}
      >
        {ouvert !== null && <Fiche projet={projects[ouvert]} fermer={fermer} />}
      </dialog>
    </section>
  );
}
