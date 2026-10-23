// Construit une version du site servie depuis un sous-dossier (aperçu
// hébergé) : base relative « ./ », rendu serveur injecté, page sans
// en-tête HTML (l'hébergeur fournit le squelette du document).
//
//   npm run apercu      →  apercu/site/ (page : apercu/site/apercu.html)
import { build } from 'vite';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.BASE_MEDIA = './';
const racine = resolve(import.meta.dirname, '..');
const site = resolve(racine, 'apercu/site');
const serveur = resolve(racine, 'apercu/serveur');

await build({ root: racine, base: './', logLevel: 'warn', build: { outDir: site, emptyOutDir: true } });
await build({
  root: racine,
  base: './',
  logLevel: 'warn',
  build: { ssr: resolve(racine, 'src/entry-server.jsx'), outDir: serveur, emptyOutDir: true },
});

const { rendre } = await import(pathToFileURL(resolve(serveur, 'entry-server.js')).href);
const html = readFileSync(resolve(site, 'index.html'), 'utf8');
const feuilles = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const scripts = [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
const titre = /<title>([^<]*)<\/title>/.exec(html)[1];

const page = [
  `<title>${titre}</title>`,
  '<meta name="description" content="Portfolio de Ahouet Yao Yann Christ Emmanuel, développeur d’applications full-stack.">',
  ...feuilles.map((h) => `<link rel="stylesheet" href="${h.replace(/^\.\//, '')}">`),
  `<div id="root">${rendre()}</div>`,
  ...scripts.map((s) => `<script type="module" src="${s.replace(/^\.\//, '')}"></script>`),
  '',
].join('\n');

const absolu = /(src|href|srcSet|srcset)="\/(?!\/)[^"]*"/.exec(page);
if (absolu) throw new Error(`Chemin absolu dans la page d’aperçu : ${absolu[0]}`);
writeFileSync(resolve(site, 'apercu.html'), page);
rmSync(resolve(site, 'index.html'));
rmSync(serveur, { recursive: true, force: true });
console.log(`aperçu : ${Math.round(page.length / 1024)} Ko, page apercu/site/apercu.html`);
