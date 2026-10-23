/**
 * La mise en scène : une seule chronologie GSAP, pilotée par le
 * défilement (ScrollTrigger) et amortie par Lenis.
 *
 * Le défilement ne fait qu'une chose : déplacer la tête de lecture de
 * la chronologie. Tout le reste en découle — la marche de l'astronaute,
 * l'avancée de la caméra, la course du soleil, l'arrivée des contenus
 * du fond de la scène. Remonter rejoue exactement la même chose à
 * l'envers. Ne sont animés que `transform` et `opacity`.
 *
 * Sans préférence de mouvement réduit, et avec JavaScript, la page est
 * une scène fixe (voir app.css) ; sinon elle reste une page ordinaire,
 * dont le monde n'est qu'un décor immobile.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/* Une unité de chronologie correspond à 80 % de la hauteur d'écran. */
const UNITE = 80;
const MARCHE = 120; // mètres parcourus à pied pendant le voyage
const FOULEE = 2.4; // mètres par cycle de marche (deux pas)
const TAILLE = 1.5; // l'astronaute est grandi à l'écran, pour la lisibilité

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* Hasard déterministe, pour que l'envol des lettres soit toujours le même. */
const hasard = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const auRepos = (f) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(f, { timeout: 1200 })
    : window.setTimeout(f, 250);

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
    astro: 1,
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
    return () => {
      vivant = false;
      nettoyages.forEach((f) => f());
      if (monde) monde.detruire();
    };
  }

  /* ---------- la scène ---------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, syncTouch: false, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const battre = (t) => lenis.raf(t * 1000);
  gsap.ticker.add(battre);
  gsap.ticker.lagSmoothing(0);

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const chapitres = [];
  const plages = [];
  const cibles = {};

  const marquer = (id, nom, t) => {
    cibles[id] = t;
    chapitres.push({ nom, t });
  };

  /* Décalage vertical pendant la lecture, quand un contenu est plus haut
     que l'écran : il défile alors doucement sous les yeux. */
  const debord = (el) => Math.max(0, (el.offsetHeight - window.innerHeight * 0.8) / 2);

  /** Un contenu arrive du fond, se laisse lire, puis passe derrière nous. */
  function profondeur(plan, t, { approche = 0.85, tenue = 1.6, sortie = 0.55 } = {}) {
    const corps = $('.plan__corps', plan);
    const defile = $('.plan__defile', plan);
    tl.fromTo(corps, { z: -2200 }, { z: -50, duration: approche, ease: 'power3.out' }, t);
    tl.fromTo(corps, { opacity: 0 }, { opacity: 1, duration: approche * 0.6, ease: 'power1.in' }, t);
    tl.fromTo(corps, { z: -50 }, { z: 50, duration: tenue, immediateRender: false }, t + approche);
    if (defile) {
      tl.fromTo(
        defile,
        { y: () => debord(defile) },
        { y: () => -debord(defile), duration: tenue, ease: 'sine.inOut' },
        t + approche
      );
    }
    const fin = t + approche + tenue;
    tl.fromTo(corps, { z: 50 }, { z: 760, duration: sortie, ease: 'power1.in', immediateRender: false }, fin);
    tl.fromTo(corps, { opacity: 1 }, { opacity: 0, duration: sortie * 0.6, ease: 'power1.in', immediateRender: false }, fin);
    plages.push({ plan, de: t + approche * 0.5, a: fin + sortie * 0.3 });
    return { lecture: t + approche, fin: fin + sortie };
  }

  /* --- 1. Ouverture : le nom se disloque et vole vers nous. --- */
  const ouverture = $('.plan--ouverture');
  const lettres = $$('.ouverture__nom .lettre');
  tl.fromTo(
    lettres,
    { z: 0, x: 0, y: 0, rotationX: 0, opacity: 1 },
    {
      z: (i) => 500 + hasard(i) * 700,
      x: (i) => (hasard(i + 7) - 0.5) * 320,
      y: (i) => (hasard(i + 3) - 0.6) * 260,
      rotationX: (i) => (hasard(i + 11) - 0.5) * 80,
      opacity: 0,
      duration: 0.7,
      ease: 'power2.in',
      stagger: { each: 0.012, from: 'center' },
      immediateRender: false,
    },
    0.2
  );
  tl.fromTo(
    ['.ouverture__lieu', '.ouverture__titre', '.ouverture__invite'],
    { z: 0, opacity: 1 },
    { z: 420, opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.05, immediateRender: false },
    0.12
  );
  plages.push({ plan: ouverture, de: -1, a: 0.6 });
  marquer('haut', 'Départ', 0);

  /* --- 2. Profil --- */
  const profil = profondeur($('.plan--profil'), 1.05, { tenue: 1.7, sortie: 0.6 });
  marquer('profil', '01 — Profil', profil.lecture + 0.05);

  /* --- 3. Projets --- */
  const titreProjets = profondeur($('.plan--projets'), profil.fin - 0.25, { approche: 0.8, tenue: 0.6, sortie: 0.5 });
  marquer('projets', '02 — Projets', titreProjets.lecture);

  let t = titreProjets.fin - 0.25;
  let finProjets = t;
  $$('.plan--projet').forEach((article, i) => {
    const sens = i % 2 ? -1 : 1;
    const p = profondeur(article, t, { approche: 0.85, tenue: 1.7, sortie: 0.55 });
    const visuel = $('.projet__visuel', article);
    const lignes = $$(
      '.projet__meta, .projet__titre, .projet__desc, .projet__points li, .projet__pile, .projet__liens, .projet__scelle',
      article
    );
    tl.fromTo(visuel, { rotationY: 30 * sens, x: 90 * sens }, { rotationY: 0, x: 0, duration: 0.95, ease: 'power3.out' }, t);
    tl.fromTo(lignes, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.055 }, t + 0.25);
    tl.fromTo(
      visuel,
      { rotationY: 0 },
      { rotationY: -16 * sens, duration: 0.55, ease: 'power2.in', immediateRender: false },
      p.fin - 0.55
    );
    const titre = $('.projet__titre', article);
    marquer(article.id, `02 — ${titre ? titre.textContent : 'Projet'}`, p.lecture + 0.1);
    finProjets = p.fin;
    t = p.fin - 0.2;
  });

  /* --- Le voyage : marche, approche, course du soleil. --- */
  const arrivee = finProjets - 0.3;
  tl.fromTo(
    etat,
    { pas: 0, vol: 0, approche: 0 },
    { pas: MARCHE, vol: 1500, approche: 1, duration: arrivee },
    0
  );
  tl.fromTo(etat, { soleil: 0 }, { soleil: 0.6, duration: arrivee * 0.82, ease: 'sine.inOut' }, 0);
  tl.fromTo(
    etat,
    { soleil: 0.6 },
    { soleil: 1, duration: arrivee * 0.18 + 0.7, ease: 'sine.out', immediateRender: false },
    arrivee * 0.82
  );

  /* Sans processeur graphique, l'affiche fixe joue le voyage : elle se
     rapproche lentement de la planète, puis plonge. */
  const afficheDepart = $('.monde__affiche--depart');
  const afficheOrbite = $('.monde__affiche--orbite');
  tl.fromTo(afficheDepart, { scale: 1 }, { scale: 1.3, duration: arrivee }, 0);
  tl.fromTo(afficheDepart, { scale: 1.3 }, { scale: 2.4, duration: 2, ease: 'power2.in', immediateRender: false }, arrivee);
  tl.set(afficheOrbite, { opacity: 1 }, arrivee + 2);
  tl.fromTo(afficheOrbite, { scale: 1.08 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, arrivee + 2);

  /* --- 4. L'arrivée : plongée dans l'atmosphère. --- */
  const eclat = $('.eclat');
  tl.fromTo(etat, { plongee: 0, expo: 1.15 }, { plongee: 1, expo: 1.7, duration: 2, ease: 'power1.in' }, arrivee);
  tl.fromTo(etat, { astro: 1 }, { astro: 0, duration: 0.8, ease: 'power1.in' }, arrivee + 0.45);
  tl.fromTo(eclat, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.in' }, arrivee + 1.4);
  tl.set(etat, { orbite: 1, expo: 1.15 }, arrivee + 2);
  tl.fromTo(eclat, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power2.out', immediateRender: false }, arrivee + 2);
  chapitres.push({ nom: 'Entrée dans l’atmosphère', t: arrivee + 0.4 });

  /* --- 5. L'atelier : le développeur et ses compétences. --- */
  const atelier = $('.plan--atelier');
  const corpsAtelier = $('.plan__corps', atelier);
  const tA = arrivee + 2.15;
  tl.fromTo(corpsAtelier, { z: -1500, opacity: 0 }, { z: 0, opacity: 1, duration: 1, ease: 'power3.out' }, tA);
  tl.fromTo(
    $$('.competence', atelier),
    { scale: 0.2, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)', stagger: { each: 0.07, from: 'edges' } },
    tA + 0.45
  );
  tl.fromTo($$('.liaison', atelier), { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.05 }, tA + 0.75);
  marquer('competences', '03 — Compétences', tA + 1.1);

  /* --- 6. Contact : l'atelier recule, le contact s'avance. --- */
  const tC = tA + 2.6;
  tl.fromTo(
    corpsAtelier,
    { z: 0, opacity: 1, yPercent: 0 },
    { z: -900, opacity: 0, yPercent: -6, duration: 0.8, ease: 'power2.in', immediateRender: false },
    tC
  );
  const contact = $('.plan--contact');
  tl.fromTo($('.plan__corps', contact), { z: -1400, opacity: 0 }, { z: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, tC + 0.1);
  const fin = tC + 2;
  plages.push({ plan: atelier, de: tA + 0.5, a: tC + 0.3 });
  plages.push({ plan: contact, de: tC + 0.5, a: fin + 1 });
  marquer('contact', '04 — Contact', fin);

  tl.fromTo(etat, { derive: 0 }, { derive: 1, duration: fin - arrivee - 2 }, arrivee + 2);
  tl.set({}, {}, fin);
  chapitres.sort((a, b) => a.t - b.t);

  /* ---------- le défilement ---------- */
  const parcours = $('.parcours');
  parcours.style.height = `${tl.duration() * UNITE + 100}svh`;

  const hudChapitre = $('.hud__chapitre');
  const hudBarre = $('.hud__barre');
  let chapitreCourant = '';
  let actif = null;

  function surMiseAJour() {
    const temps = tl.time();
    hudBarre.style.transform = `scaleY(${(temps / tl.duration()).toFixed(4)})`;
    let nom = chapitres[0].nom;
    for (const c of chapitres) if (temps >= c.t - 0.45) nom = c.nom;
    if (nom !== chapitreCourant) {
      chapitreCourant = nom;
      hudChapitre.textContent = nom;
    }
    let nouveau = null;
    for (const p of plages) if (temps >= p.de && temps <= p.a) nouveau = p.plan;
    if (nouveau !== actif) {
      if (actif) actif.classList.remove('est-actif');
      if (nouveau) nouveau.classList.add('est-actif');
      actif = nouveau;
    }
  }

  const declencheur = ScrollTrigger.create({
    trigger: parcours,
    start: 'top top',
    end: 'bottom bottom',
    scrub: tactile ? 0.5 : true,
    animation: tl,
    invalidateOnRefresh: true,
    onUpdate: surMiseAJour,
  });
  surMiseAJour();

  /* Navigation : les ancres mènent au bon instant de la chronologie. */
  function aller(temps, rapide) {
    const y = declencheur.start + ((declencheur.end - declencheur.start) * temps) / tl.duration();
    const distance = Math.abs(y - window.scrollY);
    lenis.scrollTo(y, {
      duration: rapide ? 0.6 : Math.min(3.4, 1 + distance / 5000),
      easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    });
  }
  ecouter(document, 'click', (e) => {
    const lien = e.target.closest && e.target.closest('a[href^="#"]');
    if (!lien) return;
    const id = lien.getAttribute('href').slice(1);
    if (!(id in cibles)) return;
    e.preventDefault();
    aller(cibles[id]);
    if (id === 'haut') $('.nav__marque').focus({ preventScroll: true });
  });

  /* Au clavier, un élément qui reçoit le focus amène sa scène à l'écran. */
  ecouter(document, 'focusin', (e) => {
    const plan = e.target.closest && e.target.closest('.plan');
    if (!plan || plan === actif) return;
    const id = plan.id in cibles ? plan.id : null;
    if (id) aller(cibles[id], true);
  });

  /* Le regard suit légèrement la souris. */
  if (!tactile) {
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
  const lisere = $('.astronaute__lisere', astronaute);
  let dernierPas = -1;
  let derniereCle = '';

  function poserAstronaute() {
    const a = monde.astro;
    const opacite = a.visible ? etat.astro : 0;
    const cle = `${a.x.toFixed(1)}|${a.y.toFixed(1)}|${a.echelle.toFixed(3)}|${opacite.toFixed(3)}`;
    if (cle !== derniereCle) {
      derniereCle = cle;
      astronaute.style.transform = `translate3d(${(a.x - 50).toFixed(1)}px, ${(a.y - 176).toFixed(1)}px, 0) scale(${((a.echelle * TAILLE) / 167.5).toFixed(4)})`;
      astronaute.style.opacity = opacite.toFixed(3);
      lisere.style.opacity = (0.55 + 0.45 * Math.min(etat.soleil / 0.6, 1)).toFixed(3);
    }
    if (etat.pas === dernierPas) return;
    dernierPas = etat.pas;
    const phi = (etat.pas / FOULEE) * Math.PI * 2;
    const s = Math.sin(phi);
    const levG = Math.max(0, s);
    const levD = Math.max(0, -s);
    const jambe = (lev) => {
      const k = 1 - lev * 0.12;
      return `translate(0 ${(104 * (1 - k) - lev * 6).toFixed(2)}) scale(1 ${k.toFixed(3)})`;
    };
    jambeG.setAttribute('transform', jambe(levG));
    jambeD.setAttribute('transform', jambe(levD));
    brasG.setAttribute('transform', `rotate(${(-s * 7).toFixed(2)} 30 52)`);
    brasD.setAttribute('transform', `rotate(${(-s * 7).toFixed(2)} 70 52)`);
    corps.setAttribute('transform', `translate(0 ${(-Math.abs(Math.cos(phi)) * 1.6).toFixed(2)}) rotate(${(s * 1.4).toFixed(2)} 50 176)`);
  }

  /* Une seule boucle d'images : Lenis, puis la chronologie, puis le monde. */
  const dessiner = (temps) => {
    if (!monde) return;
    monde.rendre(temps);
    poserAstronaute();
  };
  gsap.ticker.add(dessiner);

  ecouter(window, 'resize', () => {
    if (monde) monde.redimensionner();
  });

  return () => {
    vivant = false;
    nettoyages.forEach((f) => f());
    gsap.ticker.remove(dessiner);
    gsap.ticker.remove(battre);
    declencheur.kill();
    tl.kill();
    lenis.destroy();
    if (monde) monde.detruire();
  };
}
