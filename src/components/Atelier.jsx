import { COMPETENCES } from '../data/profil.js';
import { LOGOS } from '../data/logos.js';
import Developpeur from './Developpeur.jsx';

/*
 * Les liaisons entre chaque compétence et l'ordinateur, en coudes,
 * comme sur un schéma de câblage. Deux tracés : paysage (repère
 * 1000 × 625) et portrait (repère 1000 × 1400). Ils passent derrière
 * le personnage et ne se croisent jamais.
 */
const LIAISONS_PAYSAGE = [
  'M168 120 H350 V325 H440',
  'M108 265 H330 V340 H440',
  'M148 410 H330 V355 H440',
  'M268 540 H350 V370 H440',
  'M832 120 H650 V325 H560',
  'M892 265 H670 V340 H560',
  'M852 410 H670 V355 H560',
  'M732 540 H650 V370 H560',
];
const LIAISONS_PORTRAIT = [
  'M155 330 H235 V685 H425',
  'M155 540 H215 V705 H425',
  'M155 750 H215 V730 H425',
  'M155 960 H235 V755 H425',
  'M845 330 H765 V685 H575',
  'M845 540 H785 V705 H575',
  'M845 750 H785 V730 H575',
  'M845 960 H765 V755 H575',
];

function Liaisons({ traces, vue, classe }) {
  return (
    <svg className={`atelier__liaisons ${classe}`} viewBox={vue} preserveAspectRatio="none" aria-hidden="true">
      {traces.map((d, i) => (
        <path d={d} className={`liaison liaison--${i}`} vectorEffect="non-scaling-stroke" key={d} />
      ))}
    </svg>
  );
}

export default function Atelier() {
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
          <Liaisons traces={LIAISONS_PAYSAGE} vue="0 0 1000 625" classe="atelier__liaisons--paysage" />
          <Liaisons traces={LIAISONS_PORTRAIT} vue="0 0 1000 1400" classe="atelier__liaisons--portrait" />
          <div className="atelier__personnage">
            <Developpeur />
          </div>
          <ul className="atelier__competences" aria-label="Compétences principales">
            {COMPETENCES.map((c, i) => (
              <li className={`competence competence--${i}`} key={c.id}>
                <span className="competence__flotte">
                  <span className="competence__tuile">
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
