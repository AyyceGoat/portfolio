import { COMPETENCES } from '../data/profil.js';
import { LOGOS } from '../data/logos.js';
import Personnage from './Personnage.jsx';

/*
 * Liaisons entre chaque compétence et le bureau, en coudes, comme sur un
 * schéma de câblage. Deux tracés : paysage (repère 1000 × 625) et
 * portrait (repère 1000 × 1300). Ils ne se croisent jamais, partent du
 * bord de chaque icône et aboutissent aux deux extrémités du plateau.
 * L'ordre suit COMPETENCES ; les positions des icônes sont dans la
 * feuille de style (rubrique « Atelier »), avec les mêmes nombres.
 */
const TRACES = {
  paysage: {
    vue: [1000, 625],
    lignes: [
      [[172.5, 110], [262, 110], [262, 264], [318, 264]],
      [[112.5, 240], [244, 240], [244, 270], [318, 270]],
      [[127.5, 380], [244, 380], [244, 276], [318, 276]],
      [[207.5, 510], [262, 510], [262, 282], [318, 282]],
      [[827.5, 110], [738, 110], [738, 264], [682, 264]],
      [[887.5, 240], [756, 240], [756, 270], [682, 270]],
      [[872.5, 380], [756, 380], [756, 276], [682, 276]],
      [[792.5, 510], [738, 510], [738, 282], [682, 282]],
    ],
  },
  portrait: {
    vue: [1000, 1300],
    lignes: [
      [[160, 240], [190, 240], [190, 537], [224, 537]],
      [[160, 480], [175, 480], [175, 543], [224, 543]],
      [[160, 740], [175, 740], [175, 555], [224, 555]],
      [[160, 980], [190, 980], [190, 561], [224, 561]],
      [[840, 240], [810, 240], [810, 537], [776, 537]],
      [[840, 480], [825, 480], [825, 543], [776, 543]],
      [[840, 740], [825, 740], [825, 555], [776, 555]],
      [[840, 980], [810, 980], [810, 561], [776, 561]],
    ],
  },
};

// Chaque filet est tracé depuis le bureau vers sa compétence.
const chemin = (pts) =>
  [...pts]
    .reverse()
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
    .join(' ');

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
        <path key={chemin(pts)} d={chemin(pts)} className="liaison" pathLength="1" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Un logo, dans ses couleurs officielles (un ou plusieurs tracés). */
function Logo({ id }) {
  const logo = LOGOS[id];
  const traces = logo.traces || [{ couleur: logo.couleur, trace: logo.trace }];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {traces.map((t) => (
        <path key={t.couleur} d={t.trace} fill={t.couleur} />
      ))}
    </svg>
  );
}

/**
 * Le poste de travail, posé sur la plateforme d'arrivée. La scène reste
 * immobile le temps de la lecture (elle est collée à l'écran) ; le monde
 * WebGL cadre la plateforme derrière elle.
 */
export default function Atelier() {
  return (
    <section className="section atelier" id="competences" aria-labelledby="titre-competences">
      <div className="atelier__scene-fixe">
        <header className="atelier__entete">
          <p className="etiquette">Le poste de travail</p>
          <h2 className="atelier__titre" id="titre-competences">
            Compétences
          </h2>
        </header>

        <div className="atelier__scene">
          <Liaisons forme="paysage" />
          <Liaisons forme="portrait" />
          <Personnage />
          <ul className="atelier__competences" aria-label="Compétences principales">
            {COMPETENCES.map((c, i) => (
              <li className={`competence competence--${i}`} key={c.id}>
                <span className="competence__icone">
                  <Logo id={c.id} />
                </span>
                <span className="competence__nom">{c.nom}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
