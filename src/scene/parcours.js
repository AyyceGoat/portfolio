/**
 * La mise en scène : une seule chronologie GSAP, une navigation par
 * paliers et le monde WebGL.
 *
 * Tout découle de la tête de lecture de la chronologie : marche de
 * l'astronaute, caméra, soleil et contenus. Revenir en arrière rejoue
 * tout à l'envers, exactement.
 *
 * La page ne défile pas : la tête de lecture va de palier en palier, et
 * un geste mène toujours à exactement un palier. Pendant une transition,
 * tout nouveau geste est ignoré ; après elle, un geste n'est accepté
 * qu'une fois l'inertie du précédent retombée.
 *
 * La visite guidée et le retour au départ enchaînent les mêmes paliers,
 * avec une caméra lente (léger travelling avant, panoramique discret).
 *
 * Ne sont animés que `transform` et `opacity`. Avec une préférence de
 * mouvement réduit, ou sans JavaScript, la page reste une page ordinaire.
 */
import { gsap } from 'gsap';

const MARCHE = 120; // mètres parcourus à pied pendant le voyage
const FOULEE = 2.6; // mètres par cycle de marche (deux pas)
const TAILLE = 1.55; // l'astronaute est grandi à l'écran, pour la lisibilité
const SILENCE = 150; // ms sans événement de molette : le geste est terminé
const SEUIL = 18; // px de molette pour reconnaître un geste volontaire

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);

const attendre = (ms) => new Promise((r) => window.setTimeout(r, ms));
const borne = (x, a, b) => Math.min(b, Math.max(a, x));

/** Courbe de Bézier cubique, comme `cubic-bezier()` en CSS. */
function bezier(x1, y1, x2, y2) {
  const coord = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let k = 0; k < 22; k += 1) {
      if (coord(t, x1, x2) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return coord(t, y1, y2);
  };
}

/* D'un palier à l'autre : la transition part sans temps mort et se pose
   longuement. Visite et retour : une courbe symétrique, plus feutrée. */
const posee = bezier(0.25, 0.1, 0.1, 1);
const feutree = bezier(0.65, 0, 0.35, 1);

export function lancer() {
  const doc = document.documentElement;
  const cinema = window.matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference)').matches;
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
    // La caméra de la visite guidée, ajoutée au parcours (voir monde.js).
    zoom: 1,
    lacet: 0,
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

  /** Un contenu arrive du fond, se laisse lire, puis s'efface vers nous. */
  function profondeur(plan, t, { approche = 0.85, tenue = 1.4, sortie = 0.55 } = {}) {
    const corps = $('.plan__corps', plan);
    tl.fromTo(corps, { z: -520 }, { z: 0, duration: approche, ease: 'power2.out' }, t);
    tl.fromTo(corps, { opacity: 0 }, { opacity: 1, duration: approche * 0.7, ease: 'power1.out' }, t);
    tl.fromTo(corps, { z: 0 }, { z: 24, duration: tenue, immediateRender: false }, t + approche);
    const fin = t + approche + tenue;
    tl.fromTo(corps, { z: 24 }, { z: 280, duration: sortie, ease: 'power1.in', immediateRender: false }, fin);
    tl.fromTo(corps, { opacity: 1 }, { opacity: 0, duration: sortie * 0.7, ease: 'power1.in', immediateRender: false }, fin);
    return { lecture: t + approche, milieu: t + approche + tenue * 0.45, fin: fin + sortie };
  }

  /** Les lignes d'un contenu montent l'une après l'autre. */
  const lignes = (cibles, t, { each = 0.04, duree = 0.45 } = {}) =>
    tl.fromTo(cibles, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: duree, ease: 'power2.out', stagger: each }, t);

  /* --- 1. Ouverture : le nom s'efface, d'un seul bloc. --- */
  const ouverture = $('.plan--ouverture');
  tl.fromTo(
    $('.plan__corps', ouverture),
    { z: 0, opacity: 1 },
    { z: 280, opacity: 0, duration: 0.6, ease: 'power1.in', immediateRender: false },
    0.1
  );
  chapitre('haut', 'Départ', 0, ouverture);

  /* --- 2. Profil --- */
  const planProfil = $('.plan--profil');
  const profil = profondeur(planProfil, 0.7, { tenue: 1.3 });
  lignes($$('.profil__texte > *', planProfil), 0.85);
  chapitre('profil', '01 — Profil', profil.milieu, planProfil);

  /* --- 3. Projets --- */
  const planTitre = $('.plan--projets');
  const titre = profondeur(planTitre, profil.fin - 0.2, { approche: 0.8, tenue: 0.7, sortie: 0.5 });
  lignes($$('.projets-titre > *', planTitre), profil.fin - 0.1, { each: 0.07, duree: 0.55 });
  chapitre('projets', '02 — Projets', titre.milieu, planTitre);

  let t = titre.fin - 0.2;
  let finProjets = t;
  $$('.plan--projet').forEach((article) => {
    const p = profondeur(article, t, { approche: 0.85, tenue: 1.4, sortie: 0.55 });
    tl.fromTo($('.projet__ecran', article), { y: 24 }, { y: 0, duration: 0.9, ease: 'power3.out' }, t);
    lignes(
      $$('.projet__meta, .projet__titre, .projet__desc, .projet__points li, .projet__pile, .projet__liens, .projet__scelle', article),
      t + 0.12,
      { each: 0.035, duree: 0.4 }
    );
    const nom = $('.projet__titre', article);
    // Le palier se pose une fois toutes les lignes arrivées.
    chapitre(article.id, `02 — ${nom ? nom.textContent : 'Projet'}`, t + 1.15, article);
    finProjets = p.fin;
    t = p.fin - 0.2;
  });

  /* --- Le voyage : marche, approche, course du soleil. --- */
  const arrivee = finProjets - 0.1;
  tl.fromTo(etat, { pas: 0, vol: 0, approche: 0 }, { pas: MARCHE, vol: 500, approche: 1, duration: arrivee + 0.6 }, 0);
  tl.fromTo(etat, { soleil: 0 }, { soleil: 0.6, duration: arrivee * 0.8, ease: 'sine.inOut' }, 0);
  tl.fromTo(etat, { soleil: 0.6 }, { soleil: 1, duration: arrivee * 0.2 + 0.6, ease: 'sine.out', immediateRender: false }, arrivee * 0.8);
  chapitre('arrivee', 'Arrivée — la planète', arrivee + 0.6, null);

  /* Sans processeur graphique, l'affiche fixe joue le voyage : elle se
     rapproche lentement de la planète, puis plonge. */
  const afficheDepart = $('.monde__affiche--depart');
  const afficheOrbite = $('.monde__affiche--orbite');
  tl.fromTo(afficheDepart, { scale: 1 }, { scale: 1.3, duration: arrivee + 0.6 }, 0);
  tl.fromTo(afficheDepart, { scale: 1.3 }, { scale: 2.6, duration: 1.8, ease: 'power2.in', immediateRender: false }, arrivee + 0.7);

  /* --- 4. L'entrée dans la planète : la caméra descend, traverse les
     nuages, et la lumière du jour fond l'image vers l'atelier. --- */
  const plonge = arrivee + 0.7;
  const eclat = $('.eclat');
  tl.fromTo(etat, { plongee: 0, expo: 1.15 }, { plongee: 1, expo: 1.6, duration: 1.8, ease: 'power1.in' }, plonge);
  tl.fromTo(etat, { astro: 1 }, { astro: 0, duration: 0.6, ease: 'power1.in' }, plonge + 0.2);
  tl.fromTo(eclat, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.in' }, plonge + 1.3);
  // En orbite, l'horizon reste doux : l'exposition baisse.
  tl.set(etat, { orbite: 1, expo: 0.8 }, plonge + 1.8);
  tl.set(afficheOrbite, { opacity: 1 }, plonge + 1.8);
  tl.fromTo(afficheOrbite, { scale: 1.06 }, { scale: 1, duration: 2.2, ease: 'power2.out' }, plonge + 1.8);
  tl.fromTo(eclat, { opacity: 1 }, { opacity: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, plonge + 1.8);

  /* --- 5. L'atelier : le développeur et ses compétences. --- */
  const atelier = $('.plan--atelier');
  const corpsAtelier = $('.plan__corps', atelier);
  const tA = plonge + 1.95;
  tl.fromTo(corpsAtelier, { z: -520 }, { z: 0, duration: 1, ease: 'power2.out' }, tA);
  tl.fromTo(corpsAtelier, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, tA);
  tl.fromTo($('.perso', atelier), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tA + 0.15);
  tl.fromTo($$('.liaison', atelier), { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.03 }, tA + 0.45);
  tl.fromTo(
    $$('.competence', atelier),
    { y: 10, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.05 },
    tA + 0.55
  );
  chapitre('competences', '03 — Compétences', tA + 1.35, atelier);

  /* --- 6. Contact : l'atelier s'éloigne, le regard se lève vers les
     étoiles (l'horizon descend), le contact s'avance. --- */
  const tC = tA + 1.9;
  tl.fromTo(corpsAtelier, { z: 0, opacity: 1 }, { z: -400, opacity: 0, duration: 0.8, ease: 'power2.in', immediateRender: false }, tC);
  tl.fromTo(etat, { regard: 0 }, { regard: 14, duration: 1.1, ease: 'power2.inOut' }, tC);
  const contact = $('.plan--contact');
  const corpsContact = $('.plan__corps', contact);
  tl.fromTo(corpsContact, { z: -520 }, { z: 0, duration: 0.9, ease: 'power2.out' }, tC + 0.35);
  tl.fromTo(corpsContact, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out' }, tC + 0.35);
  lignes($$('.contact > *', contact), tC + 0.5, { each: 0.05, duree: 0.4 });
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

  /** Le palier affiché : celui dont l'instant est le plus proche. */
  function chapitreA(temps) {
    let k = 0;
    for (let i = 1; i < chapitres.length; i += 1) {
      if (temps >= (chapitres[i - 1].t + chapitres[i].t) / 2) k = i;
    }
    return k;
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

  let course = null; // la transition en cours
  let cible = 0; // le palier visé
  let film = null; // visite guidée ou retour au départ en cours

  function allerA(index, { duree = null, facon = posee } = {}) {
    ajusterUneFois();
    const i = borne(index, 0, dernierIndex);
    const but = chapitres[i].t;
    const ecart = Math.abs(but - tl.time());
    if (course) course.kill();
    course = null;
    cible = i;
    if (ecart < 0.001) {
      surMiseAJour();
      return Promise.resolve();
    }
    const d = duree ?? borne(0.8 + ecart * 0.06, 0.85, 1);
    return new Promise((fini) => {
      course = lire(but, {
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

  /** Un geste : exactement un palier, jamais pendant une transition. */
  function pas(sens) {
    if (course || film) return;
    const i = chapitreA(tl.time()) + sens;
    if (i < 0 || i > dernierIndex) return;
    allerA(i);
  }

  /* ---------- la caméra, côté page ----------
     Le monde WebGL lit le zoom et le panoramique dans `etat` ; les
     contenus suivent le même mouvement, en une transformation. */
  let cleCamera = '';
  function poserCamera() {
    const { zoom, lacet } = etat;
    const neutre = Math.abs(zoom - 1) < 1e-4 && Math.abs(lacet) < 1e-3;
    const cle = neutre ? 'neutre' : `${zoom.toFixed(4)}|${lacet.toFixed(3)}`;
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
    scene.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) scale(${(1 / zoom).toFixed(4)})`;
    // Sans WebGL, l'affiche suit le travelling.
    if (fixe) decor.style.transform = `scale(${(1 / zoom).toFixed(4)})`;
  }

  const NEUTRE = { zoom: 1, lacet: 0 };
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
  function ajusterUneFois() {
    if (ajuste || !vivant) return;
    ajuste = true;
    ajuster();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => vivant && ajuster());
  }
  auRepos(ajusterUneFois);

  /* ---------- les gestes ---------- */

  /* Molette et pavé tactile. Un geste est une suite d'événements sans
     silence de plus de 150 ms. Il déclenche un palier, une seule fois,
     quelle que soit sa force ; un geste commencé pendant une transition
     est ignoré jusqu'à son dernier événement d'inertie. */
  const molette = { dernier: -Infinity, cumul: 0, consomme: true };
  ecouter(
    window,
    'wheel',
    (e) => {
      if (e.ctrlKey) return; // zoom du navigateur
      e.preventDefault();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      const quand = e.timeStamp || performance.now();
      const m = molette;
      if (quand - m.dernier >= SILENCE) {
        m.cumul = 0;
        m.consomme = false;
      }
      m.dernier = quand;
      if (m.consomme) return;
      if (film) {
        m.consomme = true;
        arreterFilm({ recaler: true });
        return;
      }
      if (course) {
        m.consomme = true;
        return;
      }
      if (Math.abs(e.deltaX) > Math.abs(dy)) return; // geste horizontal
      m.cumul += dy;
      if (Math.abs(m.cumul) < SEUIL) return;
      m.consomme = true;
      pas(Math.sign(m.cumul));
    },
    { passive: false }
  );

  /* Le doigt : un balayage vertical franc, un palier. */
  let doigt = null;
  const balayer = (dy) => {
    if (film) arreterFilm({ recaler: true });
    else pas(Math.sign(dy));
  };
  ecouter(
    window,
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) {
        doigt = null;
        return;
      }
      const t0 = e.touches[0];
      // Un balayage commencé pendant une transition ne compte pas.
      doigt = { x: t0.clientX, y: t0.clientY, quand: e.timeStamp, parti: Boolean(course) };
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
      if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      doigt.parti = true;
      balayer(dy);
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
      if (Math.abs(dy) >= 20 && Math.abs(dy) > Math.abs(dx) * 1.2 && e.timeStamp - d.quand < 250) balayer(dy);
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
      arreterFilm();
      volerVers(dernierIndex);
      return;
    }
    if (!sens) return;
    e.preventDefault();
    // Une touche maintenue n'est qu'un seul geste.
    if (e.repeat) return;
    if (film) arreterFilm({ recaler: true });
    else pas(sens);
  });

  /* Les liens du menu : la transition part au clic, sans temps mort. */
  function volerVers(i) {
    const ecart = Math.abs(chapitres[i].t - tl.time());
    return allerA(i, { duree: borne(0.85 + ecart * 0.05, 0.9, 1.4) });
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
    arreterFilm();
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
  const legende = $('.visite__titre');

  function arreterFilm({ recaler = false } = {}) {
    if (!film) return;
    film.kill();
    film = null;
    doc.classList.remove('en-visite', 'en-retour', 'en-film');
    neutraliser();
    if (recaler) allerA(chapitreA(tl.time()), { duree: 0.9 });
  }

  function commencerFilm(classe) {
    arreterFilm();
    if (course) course.kill();
    course = null;
    gsap.killTweensOf(etat, 'zoom,lacet');
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

  /* Le temps de lecture de chaque palier pendant la visite. */
  const TENUES = { profil: 4, projets: 1.6, arrivee: 1.6, competences: 3.8, contact: 3 };
  const TENUE_PROJET = 3.4;

  function lancerVisite() {
    if (doc.classList.contains('en-visite')) return;
    const f = commencerFilm('en-visite');
    let t = 0;
    if (tl.time() > 0.01) {
      legende.textContent = 'Retour au départ';
      const d = borne(1.2 + tl.time() * 0.035, 1.3, 1.9);
      f.add(lire(0, { duration: d, ease: feutree }), 0);
      t = d + 0.3;
    }
    f.call(() => (legende.textContent = chapitres[0].nom), null, t);
    // Travelling avant très lent sur l'accueil.
    f.to(etat, { zoom: 0.975, duration: 2, ease: 'sine.inOut' }, t);
    t += 1.8;
    let cote = 1;
    for (let i = 1; i < chapitres.length; i += 1) {
      const c = chapitres[i];
      const d = borne(1.3 + (c.t - chapitres[i - 1].t) * 0.18, 1.5, 2.2);
      cote = -cote;
      f.call(() => (legende.textContent = c.nom), null, t);
      // Le déplacement : la caméra revient à sa place pendant le trajet.
      f.add(lire(c.t, { duration: d, ease: feutree }), t);
      f.to(etat, { ...NEUTRE, duration: d * 0.7, ease: 'sine.inOut' }, t);
      t += d;
      // La tenue : travelling avant et panoramique, à peine perceptibles.
      const tenue = TENUES[c.id] ?? TENUE_PROJET;
      f.to(etat, { zoom: 0.975, lacet: 0.4 * cote, duration: tenue, ease: 'sine.inOut' }, t);
      t += tenue;
    }
    f.to(etat, { ...NEUTRE, duration: 0.9, ease: 'power2.inOut' }, t);
  }

  /* Revenir au départ : les paliers défilent en sens inverse, d'un seul
     mouvement, jusqu'à l'accueil. */
  function retourAuDepart() {
    const depart = tl.time();
    if (depart < 0.01) {
      arreterFilm();
      allerA(0);
      return;
    }
    const f = commencerFilm('en-retour');
    legende.textContent = 'Retour au départ';
    const d = borne(1.2 + depart * 0.035, 1.3, 1.9);
    f.add(lire(0, { duration: d, ease: feutree }), 0);
    f.call(
      () => {
        const marque = $('.nav__marque');
        if (marque) marque.focus({ preventScroll: true });
      },
      null,
      d
    );
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

  /* ---------- le regard suit très légèrement la souris ---------- */
  if (!window.matchMedia('(pointer: coarse)').matches) {
    ecouter(
      window,
      'pointermove',
      (e) => {
        if (monde) monde.orienterSouris((e.clientX / window.innerWidth - 0.5) * 2, -(e.clientY / window.innerHeight - 0.5) * 2);
      },
      { passive: true }
    );
  }

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
    poserCamera();
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (ajuste) ajuster();
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
