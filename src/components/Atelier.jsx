import { useEffect, useState } from 'react';
import { COMPETENCES } from '../data/profil.js';
import { LOGOS } from '../data/logos.js';
import Personnage from './Personnage.jsx';

/*
 * Liaisons entre chaque compétence et le bureau, en coudes, comme sur un
 * schéma de câblage. Deux tracés : paysage (repère 1000 × 625) et
 * portrait (repère 1000 × 1300). Ils ne se croisent jamais, et aboutissent
 * aux deux extrémités du plateau, où ils s'allument.
 * L'ordre suit COMPETENCES ; les positions des pastilles sont dans la
 * feuille de style (rubrique « Atelier »), avec les mêmes nombres.
 */
const TRACES = {
  paysage: {
    vue: [1000, 625],
    lignes: [
      [[173, 110], [262, 110], [262, 264], [318, 264]],
      [[113, 240], [244, 240], [244, 270], [318, 270]],
      [[128, 380], [244, 380], [244, 276], [318, 276]],
      [[208, 510], [262, 510], [262, 282], [318, 282]],
      [[827, 110], [738, 110], [738, 264], [682, 264]],
      [[887, 240], [756, 240], [756, 270], [682, 270]],
      [[872, 380], [756, 380], [756, 276], [682, 276]],
      [[792, 510], [738, 510], [738, 282], [682, 282]],
    ],
  },
  portrait: {
    vue: [1000, 1300],
    lignes: [
      [[155, 240], [190, 240], [190, 537], [224, 537]],
      [[155, 480], [175, 480], [175, 543], [224, 543]],
      [[155, 740], [175, 740], [175, 555], [224, 555]],
      [[155, 980], [190, 980], [190, 561], [224, 561]],
      [[845, 240], [810, 240], [810, 537], [776, 537]],
      [[845, 480], [825, 480], [825, 543], [776, 543]],
      [[845, 740], [825, 740], [825, 555], [776, 555]],
      [[845, 980], [810, 980], [810, 561], [776, 561]],
    ],
  },
};

const chemin = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

function Liaisons({ forme }) {
  const { vue, lignes } = TRACES[forme];
  return (
    <svg
      className={`atelier__liaisons atelier__liaisons--${forme}`}
      viewBox={`0 0 ${vue[0]} ${vue[1]}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lignes.map((pts) => (
        <path key={chemin(pts)} d={chemin(pts)} className="liaison" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/**
 * Impulsions lumineuses qui courent le long des liaisons, de la
 * compétence vers le bureau. Chaque segment est une boîte qui contient une
 * comète : la comète glisse en `transform`, la boîte la découpe. Les
 * positions sont données en style calculé, donc rendues côté navigateur
 * seulement (le HTML servi ne contient aucun attribut `style`).
 */
function Flux({ forme }) {
  const { vue, lignes } = TRACES[forme];
  const [W, H] = vue;
  return (
    <div className={`atelier__flux atelier__flux--${forme}`} aria-hidden="true">
      {lignes.flatMap((pts, i) =>
        pts.slice(1).map(([x2, y2], k) => {
          const [x1, y1] = pts[k];
          const horizontal = y1 === y2;
          const sens = horizontal ? (x2 > x1 ? 'droite' : 'gauche') : y2 > y1 ? 'bas' : 'haut';
          const style = horizontal
            ? { left: `${(Math.min(x1, x2) / W) * 100}%`, top: `${(y1 / H) * 100}%`, width: `${(Math.abs(x2 - x1) / W) * 100}%` }
            : { left: `${(x1 / W) * 100}%`, top: `${(Math.min(y1, y2) / H) * 100}%`, height: `${(Math.abs(y2 - y1) / H) * 100}%` };
          return (
            <span
              key={`${i}-${k}`}
              className={`flux flux--${horizontal ? 'horizontal' : 'vertical'} flux--vers-${sens}`}
              style={style}
            >
              <span className="flux__comete" style={{ animationDelay: `${(i * 0.31 + k * 0.8).toFixed(2)}s` }} />
            </span>
          );
        })
      )}
    </div>
  );
}

function Plateforme() {
  return (
    <svg className="plateforme" viewBox="0 0 600 90" aria-hidden="true">
      <defs>
        <radialGradient id="pf-dessus" cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#1b2740" />
          <stop offset="0.75" stopColor="#0b111f" />
          <stop offset="1" stopColor="#05080f" />
        </radialGradient>
        <radialGradient id="pf-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor="#6ea8ff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#6ea8ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#6ea8ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pf-ombre" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.75" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="300" cy="46" rx="300" ry="44" fill="url(#pf-halo)" />
      <path d="M22 40 Q300 92 578 40 L572 52 Q300 104 28 52 Z" fill="#0a0f1a" />
      <ellipse cx="300" cy="40" rx="278" ry="34" fill="url(#pf-dessus)" />
      <ellipse cx="300" cy="40" rx="278" ry="34" fill="none" stroke="#8fbcff" strokeWidth="1.4" className="plateforme__anneau" />
      <ellipse cx="300" cy="40" rx="214" ry="25" fill="none" stroke="#6ea8ff" strokeWidth="0.8" opacity="0.35" />
      <ellipse cx="300" cy="40" rx="150" ry="17" fill="none" stroke="#6ea8ff" strokeWidth="0.8" opacity="0.25" />
      <g stroke="#6ea8ff" strokeWidth="0.6" opacity="0.18">
        <path d="M300 6 V74 M22 40 H578 M104 16 L496 64 M496 16 L104 64" />
      </g>
      <ellipse cx="300" cy="42" rx="140" ry="14" fill="url(#pf-ombre)" />
    </svg>
  );
}

/** Le décor derrière le développeur : un contre-jour bleuté, deux faisceaux
    venus d'en haut et un anneau gradué qui tourne lentement. */
function Decor() {
  return (
    <div className="decor" aria-hidden="true">
      <span className="decor__contre-jour" />
      <span className="decor__faisceau decor__faisceau--g" />
      <span className="decor__faisceau decor__faisceau--d" />
      <span className="decor__anneau">
        <svg viewBox="0 0 200 200" focusable="false">
          <circle cx="100" cy="100" r="98" className="decor__trait" />
          <circle cx="100" cy="100" r="91" className="decor__graduation" pathLength="360" />
          <circle cx="100" cy="100" r="84" className="decor__trait decor__trait--fin" />
        </svg>
        <span className="decor__rotor">
          <svg viewBox="0 0 200 200" focusable="false">
            <circle cx="100" cy="100" r="98" className="decor__arc" pathLength="100" />
          </svg>
        </span>
      </span>
    </div>
  );
}

export default function Atelier() {
  const [client, setClient] = useState(false);
  useEffect(() => setClient(true), []);

  return (
    <section className="plan plan--atelier" id="competences" aria-labelledby="titre-competences">
      <div className="plan__corps atelier">
        <header className="atelier__entete">
          <p className="entete mono">
            <span className="entete__num">03</span> Compétences
          </p>
          <h2 className="atelier__titre" id="titre-competences">
            Le poste de travail
          </h2>
        </header>

        <div className="atelier__scene">
          <Decor />
          <Liaisons forme="paysage" />
          <Liaisons forme="portrait" />
          {client && <Flux forme="paysage" />}
          {client && <Flux forme="portrait" />}
          <Plateforme />
          <Personnage />
          <ul className="atelier__competences" aria-label="Compétences principales">
            {COMPETENCES.map((c, i) => (
              <li className={`competence competence--${i}`} key={c.id}>
                <span className="competence__flotte">
                  <span className="competence__orbe">
                    <span className="competence__anneau" aria-hidden="true" />
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d={LOGOS[c.id].trace} fill={LOGOS[c.id].couleur} />
                    </svg>
                  </span>
                  <span className="competence__nom">{c.nom}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
