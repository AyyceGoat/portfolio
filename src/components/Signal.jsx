import { useEffect, useRef, useState } from 'react';

import Lettres from './Lettres.jsx';

const C_KM_S = 299792.458; // vitesse de la lumiere, km/s

// Distances moyennes depuis la Terre, arrondies. Voyager 1 est la sonde
// la plus lointaine jamais lancee ; sa distance grandit chaque jour.
const JALONS = [
  { nom: 'La Lune', detail: '384 400 km', km: 384400 },
  { nom: 'Vénus, au plus près', detail: '38 millions de km', km: 38e6 },
  { nom: 'Le Soleil', detail: '149,6 millions de km', km: 149.6e6 },
  { nom: 'Mars, en moyenne', detail: '225 millions de km', km: 225e6 },
  { nom: 'Jupiter, en moyenne', detail: '778 millions de km', km: 778e6 },
  { nom: 'Voyager 1', detail: 'plus de 25 milliards de km', km: 25.5e9 },
];

function duree(s) {
  if (s < 60) return `${s.toFixed(1).replace('.', ',')} s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return `${m} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`;
  }
  const h = Math.floor(s / 3600);
  return `${h} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
}

function trajet(km) {
  return duree(km / C_KM_S);
}

export default function Signal() {
  const compteurRef = useRef(null);
  const tempsRef = useRef(null);
  const jalonsRef = useRef(null);
  const baliseRef = useRef(null);
  const [heure, setHeure] = useState('--:--');

  /* Heure d'Abidjan (UTC+0, sans heure d'ete). */
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Abidjan',
    });
    const maj = () => setHeure(fmt.format(new Date()));
    maj();
    const id = window.setInterval(maj, 15000);
    return () => window.clearInterval(id);
  }, []);

  /* Le signal part a l'ouverture de la page. On n'ecrit que du texte, dans
     un bloc isole (contain) a chiffres de chasse fixe : aucun recalcul de
     mise en page ne deborde sur le reste du document. */
  useEffect(() => {
    const depart = performance.now();
    const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = jalonsRef.current ? Array.from(jalonsRef.current.children) : [];
    let id = 0;
    let enVue = false;

    const maj = () => {
      const s = (performance.now() - depart) / 1000;
      const km = s * C_KM_S;
      // Separateur de milliers : espace insecable ordinaire. L'espace fine
      // insecable renvoyee par Intl n'existe pas dans toutes les polices.
      const texte = nombre.format(km).replace(/\u202f/g, '\u00a0');
      if (compteurRef.current) compteurRef.current.textContent = `${texte}\u00a0km`;
      if (tempsRef.current) tempsRef.current.textContent = duree(s);
      items.forEach((li, i) => {
        if (km >= JALONS[i].km && !li.classList.contains('is-atteint')) li.classList.add('is-atteint');
      });
    };

    const lancer = () => {
      window.clearInterval(id);
      if (!enVue || document.visibilityState === 'hidden') return;
      maj();
      id = window.setInterval(maj, reduit ? 1000 : 100);
    };

    const obs =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([e]) => {
            enVue = e.isIntersecting;
            if (baliseRef.current) baliseRef.current.classList.toggle('is-en-vue', enVue);
            lancer();
          })
        : null;
    if (obs && baliseRef.current) obs.observe(baliseRef.current.closest('section'));
    else {
      enVue = true;
      lancer();
    }
    document.addEventListener('visibilitychange', lancer);

    return () => {
      window.clearInterval(id);
      if (obs) obs.disconnect();
      document.removeEventListener('visibilitychange', lancer);
    };
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
                  <span className="signal__heure">{heure}</span> <span className="signal__fuseau">UTC+0</span>
                </dd>
              </div>
            </dl>
            <p className="signal__lieu">Abidjan, Côte d’Ivoire</p>
          </div>

          <div className="signal__trajet reveal reveal--d2">
            <p className="signal__intro">
              À l’instant où vous avez ouvert cette page, un signal lumineux est parti d’Abidjan
              vers l’espace. Il a déjà parcouru&nbsp;:
            </p>
            <p className="signal__compteur">
              <span ref={compteurRef}>0 km</span>
            </p>
            <p className="signal__depuis mono">
              en <span ref={tempsRef}>0,0 s</span> — à 299 792 km par seconde
            </p>

            <ol className="signal__jalons" ref={jalonsRef}>
              {JALONS.map((j) => (
                <li key={j.nom}>
                  <span className="signal__repere" aria-hidden="true" />
                  <span className="signal__nom">{j.nom}</span>
                  <span className="signal__distance">{j.detail}</span>
                  <span className="signal__duree mono">{trajet(j.km)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
