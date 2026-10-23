/**
 * La mise en scène : une seule chronologie GSAP, une navigation par
 * paliers, une caméra de cinéma et le monde WebGL.
 *
 * Tout découle de la tête de lecture de la chronologie : marche de
 * l'astronaute, caméra, soleil et contenus. Revenir en arrière rejoue
 * tout à l'envers, exactement.
 *
 * La page ne défile pas : la tête de lecture va de palier en palier. Un
 * geste (cran de molette, glissement sur le pavé tactile, balayage du
 * doigt, flèche du clavier) mène au palier suivant ; le geste inverse
 * ramène au précédent, à tout instant, même en pleine transition.
 * L'inertie des pavés tactiles est reconnue : un geste, un palier.
 *
 * La visite guidée et le retour au départ sont des plans de cinéma : la
 * tête de lecture y est animée avec une caméra (zoom, roulis,
 * panoramiques, traits de vitesse), des cartons et des balises.
 *
 * Ne sont animés que `transform` et `opacity`. Avec une préférence de
 * mouvement réduit, ou sans JavaScript, la page reste une page ordinaire.
 */
import { gsap } from 'gsap';

const MARCHE = 120; // mètres parcourus à pied pendant le voyage
const FOULEE = 2.6; // mètres par cycle de marche (deux pas)
const TAILLE = 1.55; // l'astronaute est grandi à l'écran, pour la lisibilité

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* Hasard déterministe : l'envol des lettres est toujours le même. */
const hasard = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);

const attendre = (ms) => new Promise((r) => window.setTimeout(r, ms));
const doux = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const borne = (x, a, b) => Math.min(b, Math.max(a, x));

/* Transition d'un palier à l'autre : elle part tout de suite (aucun temps
   mort après le geste) et se pose en douceur. */
const elan = (x) => 0.35 * doux(x) + 0.65 * (1 - Math.pow(1 - x, 3));

/** Profil de vitesse en trapèze, adouci : accélère, file, se pose. */
function trapeze(montee, descente) {
  const N = 256;
  const table = new Float32Array(N + 1);
  const lisse = (x) => x * x * (3 - 2 * x);
  let somme = 0;
  for (let k = 1; k <= N; k += 1) {
    const u = (k - 0.5) / N;
    let v = 1;
    if (u < montee) v = lisse(u / montee);
    else if (u > 1 - descente) v = lisse((1 - u) / descente);
    somme += v;
    table[k] = somme;
  }
  for (let k = 1; k <= N; k += 1) table[k] /= somme;
  return (x) => {
    const p = borne(x, 0, 1) * N;
    const k = Math.floor(p);
    if (k >= N) return 1;
    return table[k] + (table[k + 1] - table[k]) * (p - k);
  };
}

/** Interpolation cubique monotone (Fritsch-Carlson) : une courbe lisse
    qui passe par chaque point sans jamais revenir en arrière. */
function monotone(xs, ys) {
  const n = xs.length;
  const pentes = [];
  for (let k = 0; k < n - 1; k += 1) pentes.push((ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]));
  const m = [pentes[0]];
  for (let k = 1; k < n - 1; k += 1) m.push(pentes[k - 1] * pentes[k] <= 0 ? 0 : (pentes[k - 1] + pentes[k]) / 2);
  m.push(pentes[n - 2]);
  for (let k = 0; k < n - 1; k += 1) {
    if (pentes[k] === 0) {
      m[k] = 0;
      m[k + 1] = 0;
      continue;
    }
    const a = m[k] / pentes[k];
    const b = m[k + 1] / pentes[k];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[k] = t * a * pentes[k];
      m[k + 1] = t * b * pentes[k];
    }
  }
  return (x) => {
    let k = 0;
    while (k < n - 2 && x > xs[k + 1]) k += 1;
    const h = xs[k + 1] - xs[k];
    const t = borne((x - xs[k]) / h, 0, 1);
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1]
    );
  };
}

export function lancer() {
  const doc = document.documentElement;
  const cinema = window.matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference)').matches;
  const tactile = window.matchMedia('(pointer: coarse)').matches;
  const toile = $('.monde__toile');

  const etat = {
    pas: 0,
    vol: 0,
    approche: 0,
    soleil: 0,
    plongee: 0,
    orbite: 0,
    derive: 0,
    chemin: 1,
    expo: 1.15,
    regard: 0,
    astro: 1,
    // La caméra de cinéma, ajoutée au parcours (voir monde.js).
    zoom: 1,
    roulis: 0,
    lacet: 0,
    tangage: 0,
    vitesse: 0,
  };

  let monde = null;
  let vivant = true;
  const nettoyages = [];
  const ecouter = (cible, type, f, opts) => {
    cible.addEventListener(type, f, opts);
    nettoyages.push(() => cible.removeEventListener(type, f, opts));
  };

  /* Le monde WebGL naît quand le navigateur souffle : jamais avant le
     premier affichage, jamais en concurrence avec lui. */
  const naissance = new Promise((resoudre) => {
    auRepos(() => {
      import('./monde.js')
        .then(({ creerMonde, choisirQualite }) => {
          if (!vivant || !toile) return resoudre(null);
          try {
            const params = new URLSearchParams(window.location.search);
            monde = creerMonde(toile, {
              qualite: params.get('qualite') || choisirQualite(),
              adaptatif: params.get('adaptatif') !== 'non',
              // Réservé aux captures de l'affiche, rendues sans GPU.
              logiciel: params.get('logiciel') === 'oui',
              etat,
              surPret: () => doc.classList.add('monde-pret'),
            });
          } catch (err) {
            monde = null;
          }
          if (!monde) doc.classList.add('monde-fixe');
          return resoudre(monde);
        })
        .catch(() => resoudre(null));
    });
  });

  /* Les calques du personnage de l'atelier, une fois la page chargée. */
  const preparerAtelier = () => auRepos(() => doc.classList.add('atelier-pret'));
  if (document.readyState === 'complete') preparerAtelier();
  else ecouter(window, 'load', preparerAtelier, { once: true });

  /* ---------- page ordinaire : le monde n'est qu'un décor ---------- */
  if (!cinema) {
    const peindre = () => {
      if (!monde) return;
      monde.preparer();
      monde.redimensionner();
      monde.rendre(12);
    };
    naissance.then(peindre);
    ecouter(window, 'resize', peindre);

    // Visite guidée sans mouvement : on passe de section en section.
    let visite = 0;
    ecouter(document, 'click', async (e) => {
      if (!e.target.closest || !e.target.closest('[data-visite]')) return;
      const jeton = (visite += 1);
      for (const s of $$('.plan')) {
        if (jeton !== visite) return;
        s.scrollIntoView({ behavior: 'auto', block: 'start' });
        await attendre(2600);
      }
    });
    ecouter(window, 'wheel', () => (visite += 1), { passive: true });
    ecouter(window, 'keydown', () => (visite += 1));
    return () => {
      vivant = false;
      nettoyages.forEach((f) => f());
      if (monde) monde.detruire();
    };
  }

  /* ---------- la scène ---------- */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const chapitres = [];
  const chapitre = (id, nom, t, plan) => chapitres.push({ id, nom, t, plan });

  /** Un contenu arrive du fond, se laisse lire, puis passe derrière nous. */
  function profondeur(plan, t, { approche = 0.85, tenue = 1.4, sortie = 0.55 } = {}) {
    const corps = $('.plan__corps', plan);
    tl.fromTo(corps, { z: -2200, rotationX: 8 }, { z: -40, rotationX: 0, duration: approche, ease: 'power3.out' }, t);
    tl.fromTo(corps, { opacity: 0 }, { opacity: 1, duration: approche * 0.55, ease: 'power1.in' }, t);
    tl.fromTo(corps, { z: -40 }, { z: 40, duration: tenue, immediateRender: false }, t + approche);
    const fin = t + approche + tenue;
    tl.fromTo(corps, { z: 40, rotationX: 0 }, { z: 760, rotationX: -6, duration: sortie, ease: 'power1.in', immediateRender: false }, fin);
    tl.fromTo(corps, { opacity: 1 }, { opacity: 0, duration: sortie * 0.6, ease: 'power1.in', immediateRender: false }, fin);
    return { lecture: t + approche, milieu: t + approche + tenue * 0.45, fin: fin + sortie };
  }

  /* --- 1. Ouverture : le nom se disloque et vole vers nous. --- */
  const ouverture = $('.plan--ouverture');
  const lettres = $$('.nom__texte .lettre', ouverture);
  tl.fromTo(
    lettres,
    { z: 0, x: 0, y: 0, rotationX: 0, rotationY: 0, opacity: 1 },
    {
      z: (i) => 500 + hasard(i) * 800,
      x: (i) => (hasard(i + 7) - 0.5) * 360,
      y: (i) => (hasard(i + 3) - 0.6) * 280,
      rotationX: (i) => (hasard(i + 11) - 0.5) * 90,
      rotationY: (i) => (hasard(i + 5) - 0.5) * 60,
      opacity: 0,
      duration: 0.75,
      ease: 'power2.in',
      stagger: { each: 0.01, from: 'center' },
      immediateRender: false,
    },
    0.12
  );
  tl.fromTo(
    $$('.nom__lueur, .nom__reflet', ouverture),
    { opacity: 1 },
    { opacity: 0, duration: 0.3, immediateRender: false },
    0.1
  );
  tl.fromTo(
    ['.ouverture__lieu', '.ouverture__titre', '.ouverture__sous-titre', '.ouverture__actions', '.nom__trait'],
    { z: 0, opacity: 1 },
    { z: 420, opacity: 0, duration: 0.55, ease: 'power2.in', stagger: 0.04, immediateRender: false },
    0.08
  );
  chapitre('haut', 'Départ', 0, ouverture);

  /* --- 2. Profil --- */
  const planProfil = $('.plan--profil');
  const profil = profondeur(planProfil, 0.7, { tenue: 1.3 });
  tl.fromTo($('.profil__cadre', planProfil), { z: -260, rotationY: 18 }, { z: 0, rotationY: 0, duration: 1, ease: 'power3.out' }, 0.7);
  tl.fromTo(
    $$('.profil__texte > *', planProfil),
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', stagger: 0.05 },
    0.85
  );
  chapitre('profil', '01 — Profil', profil.milieu, planProfil);

  /* --- 3. Projets --- */
  const planTitre = $('.plan--projets');
  const titre = profondeur(planTitre, profil.fin - 0.2, { approche: 0.8, tenue: 0.7, sortie: 0.5 });
  tl.fromTo(
    $$('.projets-titre__mot .lettre', planTitre),
    { z: -600, opacity: 0, rotationY: -50 },
    { z: 0, opacity: 1, rotationY: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 },
    profil.fin - 0.1
  );
  chapitre('projets', '02 — Projets', titre.milieu, planTitre);

  let t = titre.fin - 0.2;
  let finProjets = t;
  $$('.plan--projet').forEach((article, i) => {
    const sens = i % 2 ? -1 : 1;
    const p = profondeur(article, t, { approche: 0.85, tenue: 1.4, sortie: 0.55 });
    const ecran = $('.projet__ecran', article);
    const cadre = $$('.projet__coin', article);
    const lignes = $$(
      '.projet__meta, .projet__titre, .projet__desc, .projet__points li, .projet__pile li, .projet__liens > *, .projet__scelle',
      article
    );
    tl.fromTo(ecran, { rotationY: 34 * sens, z: -200, x: 120 * sens }, { rotationY: 9 * sens, z: 0, x: 0, duration: 1, ease: 'power3.out' }, t);
    tl.fromTo(cadre, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: 0.05 }, t + 0.3);
    tl.fromTo($('.projet__balayage', article), { xPercent: -130 }, { xPercent: 270, duration: 0.9, ease: 'power2.inOut' }, t + 0.45);
    tl.fromTo(lignes, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38, ease: 'power2.out', stagger: 0.035 }, t + 0.15);
    tl.fromTo(ecran, { rotationY: 9 * sens }, { rotationY: -18 * sens, duration: 0.55, ease: 'power2.in', immediateRender: false }, p.fin - 0.55);
    const nom = $('.projet__titre', article);
    // Le chapitre se pose une fois toutes les lignes arrivées.
    chapitre(article.id, `02 — ${nom ? nom.textContent : 'Projet'}`, t + 1.15, article);
    finProjets = p.fin;
    t = p.fin - 0.2;
  });

  /* --- Le voyage : marche, approche, course du soleil. --- */
  const arrivee = finProjets - 0.1;
  tl.fromTo(etat, { pas: 0, vol: 0, approche: 0 }, { pas: MARCHE, vol: 1500, approche: 1, duration: arrivee + 0.6 }, 0);
  tl.fromTo(etat, { soleil: 0 }, { soleil: 0.6, duration: arrivee * 0.8, ease: 'sine.inOut' }, 0);
  tl.fromTo(etat, { soleil: 0.6 }, { soleil: 1, duration: arrivee * 0.2 + 0.6, ease: 'sine.out', immediateRender: false }, arrivee * 0.8);
  chapitre('arrivee', 'Arrivée — la planète', arrivee + 0.6, null);

  /* Sans processeur graphique, l'affiche fixe joue le voyage : elle se
     rapproche lentement de la planète, puis plonge. */
  const afficheDepart = $('.monde__affiche--depart');
  const afficheOrbite = $('.monde__affiche--orbite');
  tl.fromTo(afficheDepart, { scale: 1 }, { scale: 1.3, duration: arrivee + 0.6 }, 0);
  tl.fromTo(afficheDepart, { scale: 1.3 }, { scale: 2.6, duration: 1.8, ease: 'power2.in', immediateRender: false }, arrivee + 0.7);

  /* --- 4. L'entrée dans la planète. --- */
  const plonge = arrivee + 0.7;
  const eclat = $('.eclat');
  const onde = $('.onde');
  tl.fromTo(etat, { plongee: 0, expo: 1.15 }, { plongee: 1, expo: 1.75, duration: 1.8, ease: 'power1.in' }, plonge);
  tl.fromTo(etat, { astro: 1 }, { astro: 0, duration: 0.6, ease: 'power1.in' }, plonge + 0.2);
  tl.fromTo(eclat, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.in' }, plonge + 1.35);
  tl.set(etat, { orbite: 1, expo: 1.15 }, plonge + 1.8);
  tl.set(afficheOrbite, { opacity: 1 }, plonge + 1.8);
  tl.fromTo(afficheOrbite, { scale: 1.12 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, plonge + 1.8);
  tl.fromTo(eclat, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, plonge + 1.8);
  tl.fromTo(onde, { opacity: 0 }, { opacity: 0.9, duration: 0.02 }, plonge + 1.8);
  tl.fromTo(onde, { scale: 0.05, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 1.1, ease: 'power2.out', immediateRender: false }, plonge + 1.82);

  /* --- 5. L'atelier : le développeur et ses compétences. --- */
  const atelier = $('.plan--atelier');
  const corpsAtelier = $('.plan__corps', atelier);
  const tA = plonge + 1.95;
  tl.fromTo(corpsAtelier, { z: -1300, opacity: 0 }, { z: 0, opacity: 1, duration: 1, ease: 'power3.out' }, tA);
  tl.fromTo($('.plateforme', atelier), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }, tA + 0.1);
  tl.fromTo($('.perso', atelier), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tA + 0.2);
  tl.fromTo(
    $$('.competence', atelier),
    { scale: 0.3, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', stagger: { each: 0.06, from: 'edges' } },
    tA + 0.45
  );
  tl.fromTo($$('.liaison', atelier), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.04 }, tA + 0.75);
  chapitre('competences', '03 — Compétences', tA + 1.35, atelier);

  /* --- 6. Contact : l'atelier s'efface, le regard se lève vers les
     étoiles (l'horizon descend), le contact s'avance. --- */
  const tC = tA + 1.9;
  tl.fromTo(corpsAtelier, { z: 0, opacity: 1 }, { z: -900, opacity: 0, duration: 0.8, ease: 'power2.in', immediateRender: false }, tC);
  tl.fromTo(etat, { regard: 0 }, { regard: 14, duration: 1.1, ease: 'power2.inOut' }, tC);
  const contact = $('.plan--contact');
  tl.fromTo($('.plan__corps', contact), { z: -1400, opacity: 0 }, { z: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tC + 0.35);
  tl.fromTo(
    $$('.contact > *', contact),
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out', stagger: 0.05 },
    tC + 0.5
  );
  const fin = tC + 1.6;
  chapitre('contact', '04 — Contact', fin, contact);
  tl.fromTo(etat, { derive: 0 }, { derive: 1, duration: fin - plonge - 1.8 }, plonge + 1.8);
  tl.set({}, {}, fin);

  /* ---------- la tête de lecture ---------- */
  const scene = $('.scene');
  const decor = $('.monde');
  const hudChapitre = $('.hud__chapitre');
  const hudBarre = $('.hud__barre');
  const dernierIndex = chapitres.length - 1;
  let actif = -1;

  /** Le chapitre affiché : celui dont l'instant est le plus proche. */
  function chapitreA(temps) {
    let k = 0;
    for (let i = 1; i < chapitres.length; i += 1) {
      if (temps >= (chapitres[i - 1].t + chapitres[i].t) / 2) k = i;
    }
    return k;
  }

  /** Le palier suivant (sens > 0) ou précédent (sens < 0) d'un instant. */
  function voisin(temps, sens) {
    if (sens > 0) {
      for (let i = 0; i < chapitres.length; i += 1) if (chapitres[i].t > temps + 0.02) return i;
      return dernierIndex;
    }
    for (let i = dernierIndex; i >= 0; i -= 1) if (chapitres[i].t < temps - 0.02) return i;
    return 0;
  }

  function surMiseAJour() {
    const temps = tl.time();
    hudBarre.style.transform = `scaleY(${(temps / tl.duration()).toFixed(4)})`;
    const k = chapitreA(temps);
    if (k !== actif) {
      const avant = chapitres[actif];
      if (avant && avant.plan) avant.plan.classList.remove('est-actif');
      actif = k;
      const c = chapitres[k];
      if (c.plan) c.plan.classList.add('est-actif');
      hudChapitre.textContent = c.nom;
      doc.dataset.chapitre = c.id;
    }
  }

  /** Anime la tête de lecture : la chronologie entière suit. */
  const lire = (temps, vars) => gsap.to(tl, { time: temps, ease: 'none', ...vars, onUpdate: surMiseAJour });

  let course = null; // la transition en cours entre deux paliers
  let cible = 0; // le palier visé

  function allerA(index, { duree = null, facon = elan } = {}) {
    ajusterUneFois();
    const i = borne(index, 0, dernierIndex);
    const arrivee = chapitres[i].t;
    const ecart = Math.abs(arrivee - tl.time());
    if (course) course.kill();
    course = null;
    cible = i;
    if (ecart < 0.001) {
      surMiseAJour();
      return Promise.resolve();
    }
    const d = duree ?? borne(0.8 + ecart * 0.32, 1.05, 2.2);
    return new Promise((fini) => {
      course = lire(arrivee, {
        duration: d,
        ease: facon,
        onComplete: () => {
          course = null;
          fini();
        },
        onInterrupt: fini,
      });
    });
  }

  /** Un geste : un palier, dans son sens. `franc` : geste nettement
      distinct du précédent (et non la suite d'une même rafale). */
  function pas(sens, franc = true) {
    const temps = tl.time();
    if (course) {
      const enAvant = chapitres[cible].t > temps;
      if (sens > 0 === enAvant) {
        // Même sens : un nouveau geste franc prolonge le voyage d'un palier ;
        // la suite d'une même rafale ou d'une inertie est ignorée.
        if (!franc || cible + sens < 0 || cible + sens > dernierIndex) return;
        allerA(cible + sens);
        return;
      }
      // Sens inverse : demi-tour immédiat vers le palier qu'on quittait.
      allerA(voisin(temps, sens));
      return;
    }
    allerA(voisin(temps, sens));
  }

  /* ---------- la caméra de cinéma, côté page ----------
     Le monde WebGL lit zoom, roulis et panoramiques dans `etat` ; les
     contenus suivent le même mouvement, en une transformation. */
  let cleCamera = '';
  function poserCamera() {
    const { zoom, roulis, lacet, tangage } = etat;
    const neutre = Math.abs(zoom - 1) < 1e-4 && Math.abs(roulis) < 1e-3 && Math.abs(lacet) < 1e-3 && Math.abs(tangage) < 1e-3;
    const cle = neutre ? 'neutre' : `${zoom.toFixed(4)}|${roulis.toFixed(3)}|${lacet.toFixed(3)}|${tangage.toFixed(3)}`;
    if (cle === cleCamera) return;
    cleCamera = cle;
    const fixe = !monde;
    if (neutre) {
      scene.style.transform = '';
      if (fixe) decor.style.transform = '';
      return;
    }
    const portrait = window.innerWidth < window.innerHeight;
    const focale = window.innerHeight / 2 / Math.tan(((portrait ? 64 : 50) * Math.PI) / 360);
    const x = (-Math.tan((lacet * Math.PI) / 180) * focale) / zoom;
    const y = (Math.tan((tangage * Math.PI) / 180) * focale) / zoom;
    const t = `rotate(${roulis.toFixed(3)}deg) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(1 / zoom).toFixed(4)})`;
    scene.style.transform = t;
    // Sans WebGL, l'affiche suit aussi, assez grande pour ne rien découvrir.
    if (fixe) decor.style.transform = `rotate(${roulis.toFixed(3)}deg) scale(${(1.08 / zoom).toFixed(4)})`;
  }

  const NEUTRE = { zoom: 1, roulis: 0, lacet: 0, tangage: 0, vitesse: 0 };
  const neutraliser = (duree = 0.8) => gsap.to(etat, { ...NEUTRE, duration: duree, ease: 'power2.out', overwrite: 'auto' });

  /* ---------- les cartes tiennent à l'écran ----------
     Aucun défilement intérieur : une carte trop haute pour l'écran est
     réduite juste assez pour y tenir. */
  const cartes = $$('.plan__defile');
  function ajuster() {
    for (const carte of cartes) {
      const plan = carte.closest('.plan');
      carte.style.transform = '';
      const cs = window.getComputedStyle(plan);
      const haut = parseFloat(cs.paddingTop);
      const dispo = plan.clientHeight - haut - parseFloat(cs.paddingBottom);
      const h = carte.offsetHeight;
      if (h <= dispo) continue;
      const k = Math.max(0.55, dispo / h);
      let y = 0;
      for (let n = carte; n && n !== plan; n = n.offsetParent) y += n.offsetTop;
      const decalage = haut + (dispo - h * k) / 2 - y;
      carte.style.transformOrigin = '50% 0';
      carte.style.transform = `translate3d(0, ${decalage.toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    }
  }
  // Mesuré au repos, ou au premier déplacement s'il vient avant.
  let ajuste = false;
  const ajusterUneFois = () => {
    if (ajuste || !vivant) return;
    ajuste = true;
    ajuster();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => vivant && ajuster());
  };
  auRepos(ajusterUneFois);

  /* ---------- les gestes ---------- */
  let film = null; // visite guidée ou retour au départ en cours

  /** Le visiteur reprend la main : le film s'arrête là où il en est. */
  function reprendre() {
    if (!film) return;
    arreterFilm();
  }

  /* Molette et pavé tactile. Un geste commence après un silence, quand le
     sens change, ou quand le mouvement réaccélère franchement au milieu
     de l'inertie (un nouveau glissement par-dessus l'ancien). Chaque geste
     déclenche un palier, une seule fois : l'inertie qui suit n'a aucun
     effet, et rien ne reste jamais verrouillé. */
  const molette = { dernier: -1e9, signe: 0, pic: 0, creux: 0, cumul: 0, parti: false, franc: true, quand: 0 };
  ecouter(
    window,
    'wheel',
    (e) => {
      if (e.ctrlKey) return; // zoom du navigateur
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      const a = Math.abs(dy);
      const quand = e.timeStamp || performance.now();
      const signe = Math.sign(dy);
      const m = molette;
      const silence = quand - m.dernier;
      const relance = m.creux < m.pic * 0.5 && a >= Math.max(12, m.creux * 3);
      const nouveau = silence > 140 || (signe !== 0 && signe !== m.signe && a > 2) || relance;
      // Un geste franc : après un vrai silence, ou une relance nette.
      const franc = silence > 250 || relance;
      m.dernier = quand;
      if (Math.abs(e.deltaX) > a) return; // geste horizontal
      if (nouveau) {
        m.franc = franc;
        m.signe = signe;
        m.pic = a;
        m.creux = a;
        m.cumul = 0;
        m.parti = false;
      } else if (a > m.pic) {
        m.pic = a;
        m.creux = a;
      } else {
        m.creux = Math.min(m.creux, a);
      }
      m.cumul += dy;
      if (!m.parti) {
        if (Math.abs(m.cumul) < 20) return;
        m.parti = true;
        m.quand = quand;
        reprendre();
        pas(Math.sign(m.cumul), m.franc);
        return;
      }
      // Une molette qu'on continue de tourner : un palier de plus, une fois
      // le précédent atteint. (L'inertie d'un pavé tactile, elle, retombe.)
      if (!course && !film && a >= 40 && a >= m.pic * 0.6 && quand - m.quand > 300) {
        m.quand = quand;
        pas(m.signe);
      }
    },
    { passive: false }
  );

  /* Le doigt : un balayage vertical, un palier, dès qu'il est franc. */
  let doigt = null;
  ecouter(
    window,
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) {
        doigt = null;
        return;
      }
      const t0 = e.touches[0];
      doigt = { x: t0.clientX, y: t0.clientY, quand: e.timeStamp, parti: false };
    },
    { passive: true }
  );
  ecouter(
    window,
    'touchmove',
    (e) => {
      if (!doigt || doigt.parti || e.touches.length !== 1) return;
      const dx = doigt.x - e.touches[0].clientX;
      const dy = doigt.y - e.touches[0].clientY;
      if (Math.abs(dy) < 30 || Math.abs(dy) < Math.abs(dx) * 1.1) return;
      doigt.parti = true;
      reprendre();
      pas(Math.sign(dy));
    },
    { passive: true }
  );
  ecouter(
    window,
    'touchend',
    (e) => {
      if (!doigt) return;
      const d = doigt;
      doigt = null;
      if (d.parti) return;
      // Un petit coup sec compte aussi.
      const dx = d.x - e.changedTouches[0].clientX;
      const dy = d.y - e.changedTouches[0].clientY;
      if (Math.abs(dy) >= 14 && Math.abs(dy) > Math.abs(dx) * 1.1 && e.timeStamp - d.quand < 260) {
        reprendre();
        pas(Math.sign(dy));
      }
    },
    { passive: true }
  );
  ecouter(window, 'touchcancel', () => (doigt = null), { passive: true });

  ecouter(window, 'keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const champ = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
    if (champ) return;
    const bouton = e.target.closest && e.target.closest('a, button');
    let sens = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey && !bouton)) sens = 1;
    if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey && !bouton)) sens = -1;
    if (e.key === 'Escape' && film) {
      e.preventDefault();
      arreterFilm({ recaler: true });
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      retourAuDepart();
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      reprendre();
      volerVers(dernierIndex);
      return;
    }
    if (!sens) return;
    e.preventDefault();
    // Touche maintenue : un palier à la fois, sans file d'attente.
    if (e.repeat && course) return;
    reprendre();
    pas(sens);
  });

  /* Les liens du menu : la transition part au clic, sans temps mort. */
  function volerVers(i) {
    const depuis = tl.time();
    const ecart = Math.abs(chapitres[i].t - depuis);
    if (ecart < 0.001) return allerA(i);
    const d = borne(0.95 + ecart * 0.16, 1.15, 2.4);
    const sens = chapitres[i].t > depuis ? 1 : -1;
    // Au-delà d'un palier, la caméra prend de la vitesse : champ resserré
    // en avant, ouvert en arrière, traits de vitesse.
    if (ecart > 2.2) {
      const force = Math.min(1, ecart / 9);
      gsap.to(etat, {
        keyframes: [
          { zoom: 1 - 0.1 * force * sens, vitesse: 0.75 * force * sens, roulis: 1.2 * force * sens, duration: d * 0.35, ease: 'power2.out' },
          { ...NEUTRE, duration: d * 0.65, ease: 'power2.inOut' },
        ],
        overwrite: 'auto',
      });
    }
    return allerA(i, { duree: d });
  }

  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    const i = chapitres.findIndex((c) => c.id === id);
    if (i < 0) return;
    e.preventDefault();
    if (id === 'haut') {
      retourAuDepart();
      return;
    }
    reprendre();
    volerVers(i);
  });

  /* Au clavier, un élément qui reçoit le focus amène sa scène à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const plan = e.target.closest && e.target.closest('.plan');
    if (!plan || film) return;
    const i = chapitres.findIndex((c) => c.plan === plan);
    if (i >= 0 && i !== cible) allerA(i, { duree: 0.9 });
  });
  // Le conteneur de la scène ne défile jamais, même sur un focus.
  ecouter(scene, 'scroll', () => {
    scene.scrollTop = 0;
    scene.scrollLeft = 0;
  });

  /* ---------- visite guidée et retour au départ ---------- */
  const visite = $('.visite');
  const legende = $('.visite__titre');
  const voile = $('.visite__voile');
  const flash = $('.visite__flash');

  /* Les cartons de la bande-annonce, un par grand chapitre (le titre des
     projets est déjà un carton, dans la scène elle-même). */
  const CARTONS = {
    profil: ['01', 'Profil'],
    arrivee: ['—', 'La planète'],
    competences: ['03', 'Compétences'],
    contact: ['04', 'Contact'],
  };
  const cartons = {};
  for (const [id, [num, mot]] of Object.entries(CARTONS)) {
    const carton = document.createElement('div');
    carton.className = 'carton';
    carton.setAttribute('aria-hidden', 'true');
    const n = document.createElement('span');
    n.className = 'carton__num mono';
    n.textContent = num === '—' ? 'Arrivée' : `Chapitre ${num}`;
    const titreCarton = document.createElement('span');
    titreCarton.className = 'carton__titre';
    for (const ch of mot) {
      const l = document.createElement('span');
      l.className = ch === ' ' ? 'carton__lettre carton__lettre--espace' : 'carton__lettre';
      l.textContent = ch === ' ' ? ' ' : ch;
      titreCarton.appendChild(l);
    }
    const trait = document.createElement('span');
    trait.className = 'carton__trait';
    carton.append(n, titreCarton, trait);
    visite.appendChild(carton);
    cartons[id] = carton;
  }

  /* Les balises que la caméra croise en repartant en arrière. */
  const BALISES = [
    ['competences', 'Poste de travail'],
    ['arrivee', 'La planète'],
    ['chemin', 'Le chemin'],
    ['projets', 'Projets'],
    ['profil', 'Profil'],
  ];
  const tempsDe = (id) => {
    if (id === 'chemin') {
      const a = chapitres.find((c) => c.id === 'arrivee');
      const dernierProjet = chapitres[chapitres.indexOf(a) - 1];
      return (a.t + dernierProjet.t) / 2;
    }
    const c = chapitres.find((x) => x.id === id);
    return c ? c.t : 0;
  };
  const balises = BALISES.map(([id, mot]) => {
    const b = document.createElement('span');
    b.className = 'balise';
    b.setAttribute('aria-hidden', 'true');
    b.textContent = mot;
    visite.appendChild(b);
    return { el: b, t: tempsDe(id) };
  });

  function arreterFilm({ recaler = false } = {}) {
    if (!film) return;
    film.kill();
    film = null;
    doc.classList.remove('en-visite', 'en-retour', 'en-film');
    neutraliser();
    gsap.to([voile, flash, ...Object.values(cartons), ...balises.map((b) => b.el)], {
      opacity: 0,
      duration: 0.35,
      overwrite: 'auto',
    });
    if (recaler) allerA(chapitreA(tl.time()), { duree: 0.9 });
  }

  function commencerFilm(classe) {
    arreterFilm();
    if (course) course.kill();
    course = null;
    gsap.killTweensOf(etat, 'zoom,roulis,lacet,tangage,vitesse');
    doc.classList.add(classe, 'en-film');
    // Reste posé après la fin, le temps que la légende s'efface.
    doc.dataset.film = classe === 'en-retour' ? 'retour' : 'visite';
    film = gsap.timeline({
      onComplete: () => {
        film = null;
        doc.classList.remove(classe, 'en-film');
        cible = chapitreA(tl.time());
      },
    });
    return film;
  }

  /** Un carton : le titre du chapitre arrive du fond, puis passe derrière la caméra. */
  function carton(f, t, id) {
    const c = cartons[id];
    if (!c) return;
    const lettresCarton = $$('.carton__lettre', c);
    f.set(c, { opacity: 1, scale: 1 }, t);
    f.fromTo(voile, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t);
    f.fromTo($('.carton__num', c), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, t + 0.05);
    f.fromTo(
      lettresCarton,
      { opacity: 0, z: -520, rotationX: -40 },
      { opacity: 1, z: 0, rotationX: 0, duration: 0.6, ease: 'power3.out', stagger: { each: 0.035, from: 'center' } },
      t
    );
    f.fromTo($('.carton__trait', c), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, t + 0.1);
    f.to(c, { scale: 1.9, opacity: 0, duration: 0.5, ease: 'power2.in' }, t + 1.05);
    f.to(voile, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, t + 1.1);
    f.fromTo(flash, { opacity: 0 }, { opacity: 0.32, duration: 0.12, ease: 'power2.in' }, t + 1.38);
    f.to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' }, t + 1.5);
  }

  /* Le tempo de la bande-annonce : le temps de lecture de chaque plan. */
  const TENUES = { profil: 3.4, projets: 1.3, arrivee: 1.1, competences: 3.6, contact: 2.6 };
  const TENUE_PROJET = 2.9;

  function construireVisite(f) {
    let t = 0;
    if (tl.time() > 0.01) {
      // On remonte d'abord au départ, en arrière, à vive allure.
      legende.textContent = 'Retour au départ';
      const d = borne(1.2 + tl.time() * 0.06, 1.4, 2.2);
      f.add(lire(0, { duration: d, ease: 'power3.inOut' }), 0);
      f.to(etat, { keyframes: [{ zoom: 1.12, vitesse: -0.8, duration: d * 0.45, ease: 'power2.in' }, { zoom: 1, vitesse: 0, duration: d * 0.55, ease: 'power3.out' }] }, 0);
      t = d + 0.2;
    }
    // Ouverture : la caméra s'avance lentement vers le nom.
    f.call(() => (legende.textContent = chapitres[0].nom), null, t);
    f.to(etat, { zoom: 0.93, lacet: -1.1, tangage: 0.3, duration: 2.2, ease: 'sine.inOut' }, t);
    t += 1.7;
    let cote = 1;
    for (let i = 1; i < chapitres.length; i += 1) {
      const c = chapitres[i];
      const ecart = c.t - chapitres[i - 1].t;
      const majeur = Boolean(cartons[c.id]) || c.id === 'projets';
      cote = -cote;
      if (majeur) carton(f, t, c.id);
      const depart = t + (majeur ? 0.3 : 0);
      const d = majeur ? borne(1.4 + ecart * 0.34, 1.9, 2.8) : borne(1.1 + ecart * 0.28, 1.5, 2.1);
      f.call(() => (legende.textContent = c.nom), null, depart);
      // Le plan : la tête de lecture file vers le chapitre ; la caméra
      // fond en avant, roule et balaie, puis se pose.
      f.add(lire(c.t, { duration: d, ease: majeur ? 'power3.inOut' : 'power2.inOut' }), depart);
      f.to(
        etat,
        {
          keyframes: [
            {
              zoom: majeur ? 0.84 : 0.9,
              vitesse: majeur ? 0.85 : 0.3,
              roulis: (majeur ? 2.6 : 1.4) * cote,
              lacet: (majeur ? 1.8 : 1.1) * cote,
              tangage: 0,
              duration: d * 0.48,
              ease: 'power2.in',
            },
            { zoom: 1.03, vitesse: 0, roulis: 0, lacet: -0.4 * cote, duration: d * 0.52, ease: 'power3.out' },
          ],
        },
        depart
      );
      t = depart + d;
      // La tenue : travelling avant très lent, léger panoramique.
      const tenue = TENUES[c.id] ?? TENUE_PROJET;
      f.to(etat, { zoom: 0.955, lacet: 0.7 * cote, tangage: 0.35, duration: tenue, ease: 'sine.inOut' }, t);
      t += tenue;
    }
    // Générique : la caméra revient à sa place, les bandeaux s'ouvrent.
    f.to(etat, { ...NEUTRE, duration: 1.1, ease: 'power2.inOut' }, t);
    return t + 1.1;
  }

  function lancerVisite() {
    if (doc.classList.contains('en-visite')) return;
    const f = commencerFilm('en-visite');
    construireVisite(f);
  }

  /* Durée annoncée sur le bouton, calculée sur la visite elle-même. */
  const duree = $('[data-visite-duree]');
  auRepos(() => {
    if (!duree || !vivant || film) return;
    const essai = gsap.timeline({ paused: true });
    const depuis = tl.time();
    const fin2 = construireVisite(essai);
    essai.kill();
    tl.time(depuis);
    gsap.set(etat, NEUTRE);
    gsap.set([voile, flash, ...Object.values(cartons)], { opacity: 0 });
    duree.textContent = `Le parcours en ${Math.round(fin2 / 5) * 5} s`;
  });

  /* Revenir au départ : la caméra repart en arrière à travers les scènes
     du parcours, jusqu'à l'accueil. */
  const trajet = trapeze(0.16, 0.3);
  const nom = $('.nom', ouverture);

  function retourAuDepart() {
    const depart = tl.time();
    if (depart < 0.01) {
      arreterFilm();
      allerA(0);
      return;
    }
    const f = commencerFilm('en-retour');
    legende.textContent = 'Retour au départ';

    // Le trajet passe chaque scène à intervalles réguliers : la tête de
    // lecture est réglée sur les balises, pas sur la longueur des scènes.
    const reperes = balises.filter((b) => b.t < depart - 0.05);
    const temps = [depart, ...reperes.map((b) => b.t), 0];
    const durees = [];
    for (let k = 1; k < temps.length; k += 1) durees.push(borne(0.42 + (temps[k - 1] - temps[k]) * 0.09, 0.5, 0.9));
    const total = durees.reduce((a, b) => a + b, 0);
    const jalons = [0];
    durees.forEach((x, k) => jalons.push(jalons[k] + x / total));
    const position = monotone(jalons, temps);
    const d = total + 0.9; // la mise en vitesse et l'arrivée en douceur
    const t0 = 0.3;
    const curseur = { p: 0 };

    // Prise d'élan : la caméra s'avance d'un rien, puis s'arrache en arrière.
    f.to(etat, { zoom: 0.95, roulis: -0.8, duration: 0.35, ease: 'power2.out' }, 0);
    f.to(
      curseur,
      {
        p: 1,
        duration: d,
        ease: trajet,
        onUpdate: () => {
          tl.time(position(curseur.p));
          surMiseAJour();
        },
      },
      t0
    );
    f.to(etat, { zoom: 1.2, vitesse: -0.85, roulis: 2, lacet: -0.8, duration: d * 0.3, ease: 'power2.inOut' }, t0 + 0.05);
    f.to(etat, { roulis: -1.5, lacet: 0.9, duration: d * 0.34, ease: 'sine.inOut' }, t0 + d * 0.32);
    f.to(etat, { zoom: 1, vitesse: 0, roulis: 0, lacet: 0, duration: d * 0.42, ease: 'power3.out' }, t0 + d * 0.6);

    // Chaque scène croisée : son nom passe, du dos de la caméra vers le fond.
    reperes.forEach((b, k) => {
      const cible2 = jalons[k + 1];
      let lo = 0;
      let hi = 1;
      for (let n = 0; n < 24; n += 1) {
        const mi = (lo + hi) / 2;
        if (trajet(mi) < cible2) lo = mi;
        else hi = mi;
      }
      const quand = t0 + lo * d;
      const fenetre = Math.min(durees[k], durees[k + 1] ?? durees[k]) * 0.95;
      f.fromTo(
        b.el,
        { opacity: 0, scale: 1.9 },
        {
          keyframes: [
            { opacity: 1, scale: 1.15, duration: fenetre * 0.4, ease: 'power2.out' },
            { opacity: 0, scale: 0.55, duration: fenetre * 0.6, ease: 'power2.in' },
          ],
        },
        Math.max(0.05, quand - fenetre * 0.4)
      );
    });

    // L'arrivée : le nom reprend sa place, d'un léger rebond.
    f.fromTo(nom, { scale: 0.94 }, { scale: 1, duration: 1.1, ease: 'back.out(1.6)', immediateRender: false }, t0 + d - 0.35);
    f.call(() => {
      const marque = $('.nav__marque');
      if (marque) marque.focus({ preventScroll: true });
    }, null, t0 + d + 0.6);
  }

  ecouter(document, 'click', (e) => {
    if (e.target.closest && e.target.closest('[data-visite]')) {
      e.preventDefault();
      lancerVisite();
    }
    if (e.target.closest && e.target.closest('[data-arreter-visite]')) {
      e.preventDefault();
      arreterFilm({ recaler: true });
    }
  });

  /* ---------- le regard suit légèrement la souris ---------- */
  const souris = { x: 0, y: 0, cx: 0, cy: 0 };
  if (!tactile) {
    ecouter(
      window,
      'pointermove',
      (e) => {
        souris.x = (e.clientX / window.innerWidth - 0.5) * 2;
        souris.y = -(e.clientY / window.innerHeight - 0.5) * 2;
        if (monde) monde.orienterSouris(souris.x, souris.y);
      },
      { passive: true }
    );
  }
  const lignesNom = $$('.nom__ligne', ouverture);

  /* ---------- l'astronaute ---------- */
  const astronaute = $('.astronaute');
  const corps = $('.astronaute__corps', astronaute);
  const [jambeG, jambeD] = $$('.astronaute__jambe', astronaute);
  const [brasG, brasD] = $$('.astronaute__bras', astronaute);
  const [semelleG, semelleD] = $$('.astronaute__semelle', astronaute);
  const lisere = $('.astronaute__lisere', astronaute);
  let dernierPas = -1;
  let derniereCle = '';

  function poserAstronaute() {
    const a = monde.astro;
    const opacite = a.visible ? etat.astro : 0;
    const cle = `${a.x.toFixed(1)}|${a.y.toFixed(1)}|${a.echelle.toFixed(3)}|${opacite.toFixed(3)}`;
    if (cle !== derniereCle) {
      derniereCle = cle;
      astronaute.style.transform = `translate3d(${(a.x - 60).toFixed(1)}px, ${(a.y - 196).toFixed(1)}px, 0) scale(${((a.echelle * TAILLE) / 186).toFixed(4)})`;
      astronaute.style.opacity = opacite.toFixed(3);
      lisere.setAttribute('opacity', (0.55 + 0.45 * Math.min(etat.soleil / 0.6, 1)).toFixed(3));
    }
    // Pendant le retour au départ, il glisse avec la caméra : on ne le
    // fait pas marcher à reculons.
    if (etat.pas === dernierPas || doc.classList.contains('en-retour')) return;
    dernierPas = etat.pas;
    // Cycle de marche vu de dos : la jambe qui avance se raccourcit et se
    // soulève, celle qui pousse découvre sa semelle ; les bras balancent à
    // contretemps, le buste se balance au-dessus de la jambe d'appui.
    const phi = (etat.pas / FOULEE) * Math.PI * 2;
    const s = Math.sin(phi);
    const c = Math.cos(phi);
    const jambe = (lev) => {
      const k = 1 - lev * 0.17;
      return `translate(0 ${(116 * (1 - k) - lev * 8).toFixed(2)}) scale(1 ${k.toFixed(3)})`;
    };
    jambeG.setAttribute('transform', jambe(Math.max(0, s)));
    jambeD.setAttribute('transform', jambe(Math.max(0, -s)));
    semelleG.setAttribute('opacity', (Math.max(0, -s) * Math.max(0, c) * 1.6).toFixed(2));
    semelleD.setAttribute('opacity', (Math.max(0, s) * Math.max(0, -c) * 1.6).toFixed(2));
    brasG.setAttribute('transform', `rotate(${(-s * 6).toFixed(2)} 33 56) translate(0 ${(Math.max(0, -s) * -2).toFixed(2)})`);
    brasD.setAttribute('transform', `rotate(${(-s * 6).toFixed(2)} 87 56) translate(0 ${(Math.max(0, s) * -2).toFixed(2)})`);
    corps.setAttribute(
      'transform',
      `translate(${(s * 1.3).toFixed(2)} ${(-(1 - Math.abs(s)) * 2).toFixed(2)}) rotate(${(s * 1.2).toFixed(2)} 60 196)`
    );
  }

  /* Une seule boucle d'images : la chronologie (GSAP), puis la caméra,
     puis le monde. */
  const dessiner = (temps) => {
    souris.cx += (souris.x - souris.cx) * 0.06;
    souris.cy += (souris.y - souris.cy) * 0.06;
    if (actif === 0 && lignesNom.length) {
      for (let i = 0; i < lignesNom.length; i += 1) {
        const p = 1 + i * 0.6;
        lignesNom[i].style.transform = `translate3d(${(souris.cx * 7 * p).toFixed(2)}px, ${(-souris.cy * 4 * p).toFixed(2)}px, 0)`;
      }
    }
    poserCamera();
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    ajuster();
    cleCamera = '';
    if (monde) monde.redimensionner();
  });

  /* Un lien direct vers un chapitre (#projets…) y mène dès l'arrivée. */
  const ancre = window.location.hash.slice(1);
  const iAncre = chapitres.findIndex((c) => c.id === ancre);
  surMiseAJour();
  if (iAncre > 0) window.setTimeout(() => vivant && volerVers(iAncre), 500);

  return () => {
    vivant = false;
    arreterFilm();
    if (course) course.kill();
    nettoyages.forEach((f) => f());
    gsap.ticker.remove(dessiner);
    tl.kill();
    if (monde) monde.detruire();
  };
}
