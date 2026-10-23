/**
 * Le développeur à son poste, à partir de son illustration.
 *
 * Calques superposés de la même image (voir scripts/preparer-personnage.py
 * et la feuille de style, rubrique « Personnage ») :
 *   - bas : jambes et fauteuil, immobiles ;
 *   - le bureau noir mat, dessiné ici en SVG, posé entre les deux ;
 *   - haut : le buste, qui respire ;
 *       · une version éclairée par l'écran, dont l'opacité varie ;
 *       · une copie de la tête, masquée au-dessus du col, qui bouge
 *         légèrement, avec ses paupières (fragments de peau prélevés
 *         au-dessus de l'œil et rabattus pour cligner) ;
 *       · une copie de la main droite, qui frappe au clavier.
 * Tout est animé en `transform` et `opacity`, uniquement quand l'atelier
 * est à l'écran.
 *
 * Repère : celui de l'illustration source, 1024 × 1536.
 */
function Calques() {
  return (
    <>
      <span className="perso__image" />
      <span className="perso__image perso__image--eclairee" />
    </>
  );
}

export default function Personnage() {
  return (
    <div className="perso" aria-hidden="true">
      <span className="perso__bas" />

      <svg className="perso__bureau" viewBox="0 0 1024 1536" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bu-plateau" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#232833" />
            <stop offset="1" stopColor="#0b0d12" />
          </linearGradient>
          <linearGradient id="bu-led" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ea8ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#6ea8ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#6ea8ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bu-pied" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#15181f" />
            <stop offset="1" stopColor="#07080b" />
          </linearGradient>
          <radialGradient id="bu-lueur" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#9cc7ff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#9cc7ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Pieds : deux lames fines, inclinées vers l'extérieur. */}
        <path d="M84 702 L100 702 L60 1492 L44 1492 Z" fill="url(#bu-pied)" />
        <path d="M940 702 L924 702 L964 1492 L980 1492 Z" fill="url(#bu-pied)" />
        <path d="M99 704 L59 1490" stroke="#8fb4f0" strokeWidth="2" opacity="0.35" />
        <path d="M925 704 L965 1490" stroke="#8fb4f0" strokeWidth="2" opacity="0.5" />
        <rect x="34" y="1488" width="40" height="8" rx="4" fill="#0b0d12" />
        <rect x="950" y="1488" width="40" height="8" rx="4" fill="#0b0d12" />
        {/* Voile de pudeur rainuré. */}
        <path d="M76 700 L948 700 L938 764 L86 764 Z" fill="#0c0f15" />
        <path d="M86 764 L938 764" stroke="#6ea8ff" strokeWidth="1.5" opacity="0.25" />
        <g stroke="#1b202b" strokeWidth="2">
          <path d="M200 706 V758 M330 706 V758 M460 706 V758 M590 706 V758 M720 706 V758 M850 706 V758" />
        </g>
        {/* Plateau noir mat et chant lumineux. */}
        <path d="M36 661 L988 661 L1000 690 L24 690 Z" fill="url(#bu-plateau)" />
        <path d="M36 661 L988 661" stroke="#a9c4f2" strokeWidth="2" opacity="0.4" />
        <ellipse cx="350" cy="676" rx="210" ry="16" fill="url(#bu-lueur)" />
        <rect x="24" y="690" width="976" height="12" fill="#06070a" />
        <rect x="24" y="690" width="976" height="16" fill="url(#bu-led)" className="perso__led" />
        <path d="M44 697 L980 697" stroke="#9cc7ff" strokeWidth="2" className="perso__led" />
      </svg>

      <div className="perso__haut">
        <div className="perso__buste">
          <Calques />
        </div>
        <div className="perso__tete">
          <Calques />
          <span className="perso__paupiere perso__paupiere--g">
            <span className="perso__peau" />
          </span>
          <span className="perso__paupiere perso__paupiere--d">
            <span className="perso__peau" />
          </span>
        </div>
        <div className="perso__main">
          <Calques />
        </div>
      </div>
    </div>
  );
}
