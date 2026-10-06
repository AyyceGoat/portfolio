// Injecte le rendu serveur dans dist/index.html.
// La page est ainsi lisible des le premier octet, avant tout JavaScript.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const { rendre } = await import(pathToFileURL(resolve(racine, 'dist-serveur/entry-server.js')).href);

const fichier = resolve(racine, 'dist/index.html');
const html = readFileSync(fichier, 'utf8');
const marque = '<div id="root"></div>';
if (!html.includes(marque)) throw new Error('Point d\'injection introuvable dans dist/index.html');

const corps = rendre();
if (/\sstyle="/.test(corps)) {
  // Un attribut style serait bloque par la politique de securite stricte.
  throw new Error('Le rendu serveur contient un attribut style : interdit par la CSP.');
}

writeFileSync(fichier, html.replace(marque, `<div id="root">${corps}</div>`));
rmSync(resolve(racine, 'dist-serveur'), { recursive: true, force: true });
console.log(`prerendu : ${Math.round(corps.length / 1024)} Ko de HTML injectes`);
