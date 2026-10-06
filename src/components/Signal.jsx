import { useEffect, useRef, useState } from 'react';

import Lettres from './Lettres.jsx';

/* ------------------------------------------------------------------
   Signal — ce que la position d'Abidjan change concretement pour une
   equipe. Abidjan vit a UTC+0 toute l'annee : l'heure locale de Christ
   est l'heure universelle, ce qui fait de la Cote d'Ivoire un fuseau
   commode pour l'Europe comme pour l'Amerique du Nord.

   Journee de travail retenue : 8 h - 19 h, heure d'Abidjan.
   ------------------------------------------------------------------ */

const MOI = { debut: 8, fin: 19 };

// Les decalages par defaut sont ceux de l'heure d'hiver. Ils servent au
// rendu du serveur et au premier rendu du client — identiques de part et
// d'autre, donc aucune divergence a l'hydratation. Le decalage reel du
// jour est releve juste apres, par Intl.
const VILLES = [
  { nom: 'Paris', zone: 'Europe/Paris', off: 1 },
  { nom: 'Londres', zone: 'Europe/London', off: 0 },
  { nom: 'Montréal', zone: 'America/Toronto', off: -5 },
];

const FAITS = [
  { dt: 'Disponibilité', dd: 'CDI, CDD ou stage — dès maintenant' },
  { dt: 'Modalité', dd: 'Sur place à Abidjan, ou à distance' },
  { dt: 'Langues', dd: 'Français courant, anglais technique' },
  { dt: 'Réponse', dd: 'Sous 24 heures' },
];

/** Decalage horaire reel d'une zone, en heures, releve par Intl. */
function decalage(zone, defaut) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const nom = parts.find((p) => p.type === 'timeZoneName');
    if (!nom) return defaut;
    if (nom.value === 'GMT') return 0;
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(nom.value);
    if (!m) return defaut;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3] || 0) / 60);
  } catch (e) {
    return defaut;
  }
}

/**
 * Heures de travail communes avec une ville, exprimees dans mon horloge.
 * La fenetre de l'autre (9 h - 18 h chez elle) est ramenee a UTC+0, puis
 * decalee d'un tour de cadran si cela donne un meilleur recouvrement.
 */
function commun(off) {
  let meilleur = { debut: MOI.debut, fin: MOI.debut };
  for (const tour of [-24, 0, 24]) {
    const a = Math.max(MOI.debut, 9 - off + tour);
    const b = Math.min(MOI.fin, 18 - off + tour);
    if (b - a > meilleur.fin - meilleur.debut) meilleur = { debut: a, fin: b };
  }
  return meilleur;
}

function horloge(zone) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: zone,
    }).format(new Date());
  } catch (e) {
    return '--:--';
  }
}

export default function Signal() {
  const [villes, setVilles] = useState(() => VILLES.map((v) => ({ ...v, heure: null })));
  const [heure, setHeure] = useState(null);
  const baliseRef = useRef(null);

  /* La balise ne s'anime que pendant qu'on la regarde. */
  useEffect(() => {
    const cible = baliseRef.current;
    if (!cible || typeof IntersectionObserver === 'undefined') {
      if (cible) cible.classList.add('is-en-vue');
      return undefined;
    }
    const obs = new IntersectionObserver(([e]) => {
      cible.classList.toggle('is-en-vue', e.isIntersecting);
    });
    obs.observe(cible.closest('section'));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const maj = () => {
      setHeure(horloge('Africa/Abidjan'));
      setVilles(
        VILLES.map((v) => ({ ...v, off: decalage(v.zone, v.off), heure: horloge(v.zone) }))
      );
    };
    maj();
    const id = window.setInterval(maj, 30000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="section signal" id="signal" aria-labelledby="titre-signal">
      <div className="wrap">
        <div className="section-head reveal reveal--lettres">
          <span className="section-head__num">04</span>
          <h2 className="section-head__title" id="titre-signal" aria-label="Signal">
            <span aria-hidden="true">
              <Lettres texte="Signal" />
            </span>
          </h2>
          <span className="section-head__aside mono">Depuis Abidjan</span>
        </div>

        <div className="signal__grille">
          <div className="signal__origine reveal">
            <div className="signal__balise" ref={baliseRef} aria-hidden="true">
              <span className="signal__faisceau">
                <span className="signal__impulsion" />
              </span>
              <span className="signal__onde" />
              <span className="signal__onde signal__onde--2" />
              <span className="signal__onde signal__onde--3" />
              <span className="signal__point" />
            </div>

            <p className="signal__lieu">
              Abidjan
              <span>Côte d’Ivoire</span>
            </p>

            <dl className="signal__coord">
              <div>
                <dt>Latitude</dt>
                <dd>5° 20′ 42″ N</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>4° 01′ 26″ O</dd>
              </div>
              <div>
                <dt>Heure locale</dt>
                <dd>
                  <span className="signal__heure">{heure || '--:--'}</span>{' '}
                  <span className="signal__fuseau">UTC+0</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="signal__portee reveal reveal--d2">
            <p className="signal__intro">
              Abidjan vit à <strong>UTC+0</strong>, sans changement d’heure. Mes journées
              recouvrent presque entièrement celles de l’Europe et rejoignent encore la
              matinée nord-américaine&nbsp;: travailler depuis ici ne coûte à une équipe
              presque aucune heure décalée.
            </p>

            <ul className="signal__fuseaux">
              {villes.map((v) => {
                const c = commun(v.off);
                const largeur = c.fin - c.debut;
                return (
                  <li key={v.nom}>
                    <span className="signal__ville">{v.nom}</span>
                    <span className="signal__ville-heure mono">{v.heure || '--:--'}</span>
                    <svg
                      className="signal__barre"
                      viewBox="0 0 240 12"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`${v.nom} : ${Math.round(largeur)} heures de travail en commun avec Abidjan`}
                    >
                      <rect className="signal__piste" x="0" y="4.5" width="240" height="3" rx="1.5" />
                      <rect
                        className="signal__plage"
                        x={(MOI.debut * 10).toFixed(1)}
                        y="3.5"
                        width={((MOI.fin - MOI.debut) * 10).toFixed(1)}
                        height="5"
                        rx="2.5"
                      />
                      <rect
                        className="signal__recouvre"
                        x={(c.debut * 10).toFixed(1)}
                        y="1.5"
                        width={(largeur * 10).toFixed(1)}
                        height="9"
                        rx="4.5"
                      />
                    </svg>
                    <span className="signal__commun mono">{Math.round(largeur)} h</span>
                  </li>
                );
              })}
            </ul>

            <p className="signal__echelle mono" aria-hidden="true">
              <span>00 h</span>
              <span>12 h</span>
              <span>24 h</span>
            </p>
            <p className="signal__legende">
              L’échelle est une journée à Abidjan. La bande pâle est ma plage de travail,
              la bande vive les heures communes avec la ville.
            </p>

            <dl className="signal__faits">
              {FAITS.map((f) => (
                <div key={f.dt}>
                  <dt>{f.dt}</dt>
                  <dd>{f.dd}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
