/* ------------------------------------------------------------------
   Ambiance sonore, entierement synthetisee par la Web Audio API.

   Aucun fichier audio, aucune ressource externe : tout est fabrique a
   la volee. Ce module n'est telecharge qu'au premier clic sur le bouton
   de son — tant que le son est coupe, il ne coute rien.

   Volumes volontairement bas : une nappe grave a peine perceptible, une
   lueur aigue tres lointaine, un souffle. Au survol, une note breve et
   douce ; au passage d'une section, un souffle qui monte et s'eteint.
   ------------------------------------------------------------------ */

let ctx = null;
let maitre = null;
let bruit = null;
let actif = false;
let dernierSurvol = 0;
let coupure = 0;

const NOTES = [1318.5, 1568.0, 1760.0, 1975.5, 2349.3]; // pentatonique, mi majeur

function tamponBruit(c, secondes) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * secondes), c.sampleRate);
  const d = b.getChannelData(0);
  // Bruit rose approche : plus doux a l'oreille que le blanc.
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return b;
}

function lfo(c, freq, profondeur, cible) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  g.gain.value = profondeur;
  o.connect(g).connect(cible);
  o.start();
}

function construireAmbiance(c, sortie) {
  // Nappe grave : trois voix legerement desaccordees, filtrees.
  const filtre = c.createBiquadFilter();
  filtre.type = 'lowpass';
  filtre.frequency.value = 620;
  filtre.Q.value = 0.4;
  lfo(c, 0.031, 260, filtre.frequency);

  const nappe = c.createGain();
  nappe.gain.value = 0.05;
  filtre.connect(nappe).connect(sortie);

  [
    [55.0, 'sine', 0],
    [82.41, 'sine', 4],
    [123.47, 'triangle', -5],
    [164.81, 'sine', 3],
  ].forEach(([f, type, cents], i) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = cents;
    lfo(c, 0.05 + i * 0.013, 6, o.detune);
    const g = c.createGain();
    g.gain.value = i === 3 ? 0.35 : 1 / (i + 1);
    o.connect(g).connect(filtre);
    o.start();
  });

  // Lueur d'etoile : deux sinus aigus, presque inaudibles, qui respirent.
  const lueur = c.createGain();
  lueur.gain.value = 0.0;
  lfo(c, 0.07, 0.0045, lueur.gain);
  lueur.connect(sortie);
  [1318.5, 1975.5].forEach((f) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    o.connect(lueur);
    o.start();
  });

  // Souffle : bruit rose en boucle, filtre en bande.
  const src = c.createBufferSource();
  src.buffer = bruit;
  src.loop = true;
  const bande = c.createBiquadFilter();
  bande.type = 'bandpass';
  bande.frequency.value = 480;
  bande.Q.value = 0.6;
  lfo(c, 0.023, 180, bande.frequency);
  const souffle = c.createGain();
  souffle.gain.value = 0.10;
  src.connect(bande).connect(souffle).connect(sortie);
  src.start();
}

/** Note breve au survol d'un element interactif. */
export function survol() {
  if (!actif || !ctx) return;
  const t = ctx.currentTime;
  if (t - dernierSurvol < 0.07) return;
  dernierSurvol = t;

  const f = NOTES[Math.floor(Math.random() * NOTES.length)];
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 1.006, t + 0.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.03, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g).connect(maitre);
  o.start(t);
  o.stop(t + 0.35);
}

/** Souffle au passage d'une section : la sensation d'un deplacement. */
export function passage() {
  if (!actif || !ctx || !bruit) return;
  const t = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = bruit;
  const bande = ctx.createBiquadFilter();
  bande.type = 'bandpass';
  bande.Q.value = 1.1;
  bande.frequency.setValueAtTime(240, t);
  bande.frequency.exponentialRampToValueAtTime(1900, t + 0.9);
  bande.frequency.exponentialRampToValueAtTime(900, t + 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  src.connect(bande).connect(g).connect(maitre);
  src.start(t, Math.random() * 2);
  src.stop(t + 1.7);

  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(58, t);
  o.frequency.exponentialRampToValueAtTime(73, t + 1.2);
  const go = ctx.createGain();
  go.gain.setValueAtTime(0.0001, t);
  go.gain.exponentialRampToValueAtTime(0.05, t + 0.45);
  go.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  o.connect(go).connect(maitre);
  o.start(t);
  o.stop(t + 1.6);
}

function carillon() {
  const t = ctx.currentTime;
  [1318.5, 1975.5].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.03, t + i * 0.09 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.9);
    o.connect(g).connect(maitre);
    o.start(t + i * 0.09);
    o.stop(t + i * 0.09 + 1);
  });
}

/* --- Ecouteurs, poses seulement quand le son est actif ------------ */

const surSurvol = (e) => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  const cible = e.target.closest && e.target.closest('a, button, .project');
  if (!cible) return;
  if (e.relatedTarget && cible.contains(e.relatedTarget)) return;
  survol();
};
const surPassage = () => passage();
const surVisibilite = () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') ctx.suspend();
  else if (actif) ctx.resume();
};

export async function activer() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!ctx) {
    ctx = new AC({ latencyHint: 'playback' });
    bruit = tamponBruit(ctx, 4);
    maitre = ctx.createGain();
    maitre.gain.value = 0.0001;
    const compresseur = ctx.createDynamicsCompressor();
    compresseur.threshold.value = -24;
    maitre.connect(compresseur).connect(ctx.destination);
    construireAmbiance(ctx, maitre);
  }
  window.clearTimeout(coupure);
  await ctx.resume();
  actif = true;

  const t = ctx.currentTime;
  maitre.gain.cancelScheduledValues(t);
  maitre.gain.setValueAtTime(Math.max(0.0001, maitre.gain.value), t);
  maitre.gain.exponentialRampToValueAtTime(0.7, t + 1.8);
  carillon();

  document.addEventListener('pointerover', surSurvol, { passive: true });
  window.addEventListener('cosmos:passage', surPassage);
  document.addEventListener('visibilitychange', surVisibilite);
  return true;
}

export function couper() {
  actif = false;
  document.removeEventListener('pointerover', surSurvol);
  window.removeEventListener('cosmos:passage', surPassage);
  document.removeEventListener('visibilitychange', surVisibilite);
  if (!ctx) return;
  const t = ctx.currentTime;
  maitre.gain.cancelScheduledValues(t);
  maitre.gain.setValueAtTime(Math.max(0.0001, maitre.gain.value), t);
  maitre.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  // Contexte suspendu : plus aucun calcul audio tant que le son est coupe.
  coupure = window.setTimeout(() => ctx && ctx.suspend(), 450);
}
