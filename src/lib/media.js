/**
 * Adresse d'un fichier de public/.
 *
 * Les données écrivent les chemins sans barre initiale
 * (« captures/nexus.webp »). Le préfixe vaut « / » en production et
 * « ./ » pour l'aperçu hébergé dans un sous-dossier : il est fixé au
 * build (vite.config.js), identique côté serveur et côté navigateur.
 */
/* global __BASE_MEDIA__ */
const BASE = typeof __BASE_MEDIA__ === 'string' ? __BASE_MEDIA__ : '/';

export function media(chemin) {
  return BASE + String(chemin).replace(/^\.?\//, '');
}
