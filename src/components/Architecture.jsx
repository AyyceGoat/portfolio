import { useEffect, useRef } from 'react';

/**
 * Schema d'architecture du projet sous confidentialite.
 *
 * Contraintes tenues ici : aucun nom de client, aucune donnee
 * d'exploitation, aucune capture. Le schema ne montre que la forme
 * du systeme — trois couches et les sens de lecture et d'ecriture.
 *
 * Deux rendus pour une seule information : le trace SVG au-dela de
 * 48rem, une version empilee en dessous, ou les libelles d'un schema
 * large deviendraient illisibles. Un seul des deux est present dans
 * l'arbre d'accessibilite a la fois.
 */

const LAYERS = [
  {
    id: 'terrain',
    kicker: 'Couche 1 — terrain',
    title: 'Interface conducteur',
    sub: 'Téléphone, pensée pour être lue en plein soleil',
    items: ['Scan de QR code', 'Authentification par code PIN', 'Saisie des opérations'],
  },
  {
    id: 'pilotage',
    kicker: 'Couche 1 — pilotage',
    title: 'Tableau de bord administrateur',
    sub: 'React et Recharts, lit les mêmes données',
    items: ['Indicateurs de performance', 'Visualisations', 'Export CSV et rapports'],
  },
  {
    id: 'backend',
    kicker: 'Couche 2 — traitement',
    title: 'Backend Google Apps Script',
    sub: 'Règles métier et contrôle des accès',
    items: [
      'Vérification des PIN et des rôles',
      'Règles de gestion et validations',
      'Comptabilité analytique par centres de coûts',
      'Rédaction de rapports assistée par IA',
    ],
  },
  {
    id: 'donnees',
    kicker: 'Couche 3 — données',
    title: 'Google Sheets',
    sub: 'Source unique de données, tables générées au déploiement',
    items: ['Production et suivi terrain', 'Référentiels et rôles', 'Historique et journaux'],
  },
];

export default function Architecture() {
  const archiRef = useRef(null);

  /* Le flux ne circule que pendant qu'on regarde le schema : hors champ,
     le decalage des pointilles repeindrait le trace pour personne. */
  useEffect(() => {
    const cible = archiRef.current;
    if (!cible || typeof IntersectionObserver === 'undefined') {
      if (cible) cible.classList.add('is-en-vue');
      return undefined;
    }
    const obs = new IntersectionObserver(([e]) => {
      cible.classList.toggle('is-en-vue', e.isIntersecting);
    });
    obs.observe(cible);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="archi" ref={archiRef}>
      {/* ---------- Trace, ecrans larges ---------- */}
      <svg
        className="archi__svg"
        viewBox="0 0 920 570"
        role="img"
        aria-labelledby="archi-titre archi-desc"
      >
        <title id="archi-titre">Architecture applicative de l’ERP industriel multi-sites</title>
        <desc id="archi-desc">
          Trois couches. En haut, deux clients : une interface conducteur sur téléphone, avec
          scan de QR code et authentification par code PIN, et un tableau de bord administrateur
          en React qui lit les mêmes données. Au centre, un backend Google Apps Script qui
          porte les règles métier, le contrôle des accès, la comptabilité analytique et la
          génération de rapports. En bas, Google Sheets, source unique de données. Le terrain
          écrit vers le backend, le backend enregistre dans les données, et le tableau de bord
          les relit par le même backend.
        </desc>

        <defs>
          <marker
            id="tete-fleche"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--c-accent)" />
          </marker>
        </defs>

        {/* ----- Couche 3 : donnees (plan le plus lointain) ----- */}
        <g className="archi__layer archi__layer--far">
          <rect
            x="40" y="424" width="840" height="122" rx="8"
            fill="var(--c-surface)" stroke="var(--c-line)"
          />
          <text x="64" y="452" className="archi__kicker">COUCHE 3 — DONNÉES</text>
          <text x="64" y="480" className="archi__title">Google Sheets</text>
          <text x="64" y="502" className="archi__sub">
            Source unique de données · tables générées au déploiement
          </text>

          {/* Evocation de tables, sans aucun contenu reel */}
          <g stroke="var(--c-line)" fill="none">
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(${612 + i * 84}, 446)`}>
                <rect width="64" height="78" rx="4" fill="var(--c-bg)" />
                <line x1="0" y1="18" x2="64" y2="18" />
                <line x1="10" y1="32" x2="54" y2="32" stroke="var(--c-line)" />
                <line x1="10" y1="46" x2="54" y2="46" stroke="var(--c-line)" />
                <line x1="10" y1="60" x2="40" y2="60" stroke="var(--c-line)" />
              </g>
            ))}
          </g>
        </g>

        {/* ----- Liaisons ----- */}
        <g
          className="archi__links"
          stroke="var(--c-accent)"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#tete-fleche)"
        >
          {/* terrain -> backend */}
          <line className="archi__flux" x1="205" y1="176" x2="205" y2="240" />
          {/* backend -> donnees */}
          <line className="archi__flux" x1="205" y1="360" x2="205" y2="418" />
          {/* donnees -> backend */}
          <line className="archi__flux" x1="715" y1="418" x2="715" y2="360" />
          {/* backend -> pilotage */}
          <line className="archi__flux" x1="715" y1="240" x2="715" y2="176" />
        </g>

        <g className="archi__edge">
          <text x="218" y="212">ÉCRITURE</text>
          <text x="218" y="396">ENREGISTRE</text>
          <text x="728" y="396" textAnchor="start">RELIT</text>
          <text x="728" y="212" textAnchor="start">RESTITUE</text>
        </g>

        {/* ----- Couche 2 : traitement ----- */}
        <g className="archi__layer archi__layer--mid">
          <rect
            x="40" y="242" width="840" height="118" rx="8"
            fill="var(--c-surface)" stroke="var(--c-line)"
          />
          <text x="64" y="270" className="archi__kicker">COUCHE 2 — TRAITEMENT</text>
          <text x="64" y="298" className="archi__title">Backend Google Apps Script</text>

          <g>
            {[
              'Codes PIN et rôles',
              'Règles de gestion',
              'Comptabilité analytique',
              'Rapports par IA',
            ].map((label, i) => (
              <g key={label} transform={`translate(${64 + i * 200}, 314)`}>
                <rect width="184" height="30" rx="4" fill="var(--c-bg)" stroke="var(--c-line)" />
                <text x="14" y="20" className="archi__chip">{label}</text>
              </g>
            ))}
          </g>
        </g>

        {/* ----- Couche 1 : clients (plan le plus proche) ----- */}
        <g className="archi__layer archi__layer--near">
          {/* Interface conducteur */}
          <rect
            x="40" y="36" width="330" height="140" rx="8"
            fill="var(--c-surface)" stroke="var(--c-line)"
          />
          <text x="64" y="64" className="archi__kicker">COUCHE 1 — TERRAIN</text>
          <text x="64" y="92" className="archi__title">Interface conducteur</text>
          <text x="64" y="114" className="archi__sub">Mobile · lisible en plein soleil</text>
          <g className="archi__chip">
            <text x="64" y="140">▸ Scan de QR code</text>
            <text x="64" y="158">▸ Authentification par code PIN</text>
          </g>

          {/* Tableau de bord administrateur */}
          <rect
            x="550" y="36" width="330" height="140" rx="8"
            fill="var(--c-surface)" stroke="var(--c-accent-line)"
          />
          <text x="574" y="64" className="archi__kicker">COUCHE 1 — PILOTAGE</text>
          <text x="574" y="92" className="archi__title">Tableau de bord admin.</text>
          <text x="574" y="114" className="archi__sub">React · Recharts</text>
          <g className="archi__chip">
            <text x="574" y="140">▸ Indicateurs et visualisations</text>
            <text x="574" y="158">▸ Export CSV et rapports</text>
          </g>
        </g>
      </svg>

      {/* ---------- Version empilee, petits ecrans ---------- */}
      <ol className="archi__stack">
        {LAYERS.map((layer) => (
          <li key={layer.id} className="archi__block">
            <p className="archi__block-kicker">{layer.kicker}</p>
            <h4 className="archi__block-title">{layer.title}</h4>
            <p className="archi__block-sub">{layer.sub}</p>
            <ul className="archi__block-items">
              {layer.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
