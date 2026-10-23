/**
 * L'astronaute, vu de dos, qui marche vers la planète.
 *
 * Combinaison extravéhiculaire dessinée en SVG : casque à lampes
 * latérales, sac de survie (panneau, évents, voyant, tuyaux), joints
 * d'épaule et de taille, gants, bottes à semelle crantée. Éclairé comme
 * la scène : à contre-jour (la planète est devant lui), un liseré sur
 * les contours, et la lueur chaude du chemin qui remonte sur les jambes.
 * Son ombre s'allonge vers nous.
 *
 * Repère : 120 × 200, pieds en (60, 196), 186 unités pour 1,80 m.
 * La marche est pilotée par le défilement (voir parcours.js) : seuls les
 * attributs `transform` et `opacity` des membres changent.
 */

function Jambe({ cote }) {
  // La jambe gauche est dessinée, la droite en est le miroir.
  const miroir = cote === 'd' ? 'translate(120 0) scale(-1 1)' : undefined;
  return (
    <g className="astronaute__jambe" data-cote={cote}>
      <g transform={miroir}>
        <path d="M41 115 Q38 136 41 153 L57 153 Q59 136 59 117 Z" fill="url(#as-combi)" />
        <path d="M41 151 Q49 156 57 151" stroke="#4d5566" strokeWidth="1.3" fill="none" />
        <path d="M43 140 Q50 142 56 139" stroke="#4d5566" strokeWidth="0.8" fill="none" opacity="0.6" />
        <path d="M41 153 Q40 166 42 176 L57 176 Q58 166 57 153 Z" fill="url(#as-combi)" />
        <rect x="40.5" y="172" width="17" height="4.5" rx="2" fill="#7b7568" />
        <g className="astronaute__botte">
          <path
            d="M38 177 Q38 171.5 43.5 171.5 L55 171.5 Q61 171.5 61 178 L61 190 Q61 196 55 196 L44 196 Q38 196 38 190 Z"
            fill="url(#as-botte)"
          />
          <path d="M39 184 L60 184" stroke="#8d8270" strokeWidth="0.8" opacity="0.7" />
          <path
            className="astronaute__semelle"
            d="M38 189 L61 189 L61 196 Q61 199 57 199 L42 199 Q38 199 38 196 Z"
            fill="#1d222d"
            opacity="0"
          />
        </g>
        <path d="M57.5 120 Q59 140 57.6 172" stroke="#d9e6ff" strokeWidth="0.9" fill="none" opacity="0.55" />
      </g>
    </g>
  );
}

function Bras({ cote }) {
  const miroir = cote === 'd' ? 'translate(120 0) scale(-1 1)' : undefined;
  return (
    <g className="astronaute__bras" data-cote={cote}>
      <g transform={miroir}>
        <circle cx="33" cy="56" r="7.5" fill="#5f6778" />
        <path d="M27 57 Q20 70 21.5 85 L33 85 Q35 71 38 61 Z" fill="url(#as-combi)" />
        <path d="M21.5 84 Q27 87 33 84" stroke="#4d5566" strokeWidth="1.1" fill="none" />
        <path d="M21.5 85 Q20.5 97 23 107 L33.5 107 Q34 97 33 85 Z" fill="url(#as-combi)" />
        <rect x="22" y="103.5" width="12" height="4" rx="1.8" fill="#757060" />
        <path
          d="M21.5 107 Q19.5 116 25 120.5 Q32 122 35 115 L34 107 Z"
          fill="url(#as-gant)"
        />
        <path d="M24 114 L25 119 M27.5 115 L28.5 120.5 M31 114.5 L31.5 119.5" stroke="#6b665d" strokeWidth="0.7" />
      </g>
    </g>
  );
}

export default function Astronaute() {
  return (
    <div className="astronaute" aria-hidden="true">
      <svg className="astronaute__svg" viewBox="0 0 120 200" overflow="visible">
        <defs>
          <linearGradient id="as-combi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#59627a" />
            <stop offset="0.5" stopColor="#7b8396" />
            <stop offset="0.82" stopColor="#ada493" />
            <stop offset="1" stopColor="#ecdcbf" />
          </linearGradient>
          <linearGradient id="as-volume" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#0b1020" stopOpacity="0.45" />
            <stop offset="0.35" stopColor="#0b1020" stopOpacity="0" />
            <stop offset="0.8" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#dfe9ff" stopOpacity="0.32" />
          </linearGradient>
          <radialGradient id="as-casque" cx="0.66" cy="0.28" r="0.8">
            <stop offset="0" stopColor="#c2cad8" />
            <stop offset="0.45" stopColor="#7a8396" />
            <stop offset="1" stopColor="#2c3343" />
          </radialGradient>
          <linearGradient id="as-sac" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a5468" />
            <stop offset="1" stopColor="#2f3747" />
          </linearGradient>
          <linearGradient id="as-botte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6c6862" />
            <stop offset="1" stopColor="#f2dfbd" />
          </linearGradient>
          <linearGradient id="as-gant" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7e796f" />
            <stop offset="1" stopColor="#c9b99b" />
          </linearGradient>
          <radialGradient id="as-ombre" cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.18" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="as-sol" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3dc" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff3dc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="as-voyant" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#c9ecff" />
            <stop offset="1" stopColor="#5fb6ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ombre portée vers l'objectif, et reflet du chemin sous les pieds. */}
        <path d="M49 195 Q60 192 71 195 L93 292 Q60 308 27 292 Z" fill="url(#as-ombre)" />
        <ellipse cx="60" cy="196" rx="32" ry="7" fill="url(#as-sol)" />

        <g className="astronaute__corps">
          <Jambe cote="g" />
          <Jambe cote="d" />

          <g className="astronaute__buste">
            <Bras cote="g" />
            <Bras cote="d" />

            {/* Bassin, joint de taille, torse */}
            <path d="M38 99 Q37 116 44 123 L76 123 Q83 116 82 99 Z" fill="url(#as-combi)" />
            <path d="M37 101 Q60 108 83 101 L83 106 Q60 113 37 106 Z" fill="#5d6576" />
            <path d="M29 59 Q31 46 46 43.5 L74 43.5 Q89 46 91 59 L87 101 L33 101 Z" fill="url(#as-combi)" />
            <path d="M29 59 Q31 46 46 43.5 L74 43.5 Q89 46 91 59 L87 101 L33 101 Z" fill="url(#as-volume)" />

            {/* Sac de survie */}
            <rect x="37" y="40" width="46" height="60" rx="7" fill="url(#as-sac)" />
            <path d="M39 45 Q60 36 81 45 L81 51 L39 51 Z" fill="#3c4556" />
            <rect x="37" y="52" width="4" height="42" rx="1.5" fill="#262d3b" />
            <rect x="79" y="52" width="4" height="42" rx="1.5" fill="#262d3b" />
            <rect x="45" y="55" width="30" height="22" rx="3" fill="#465064" />
            <rect x="48" y="58" width="13" height="7" rx="1.2" fill="#3a4354" />
            <rect x="63" y="58" width="9" height="7" rx="1.2" fill="#3a4354" />
            <path d="M48 69 H72 M48 72.5 H72" stroke="#5a6478" strokeWidth="1" />
            <rect x="45" y="80" width="30" height="2.2" rx="1" fill="#cbb995" opacity="0.8" />
            <path d="M47 86 H73 M47 89 H73 M47 92 H73" stroke="#232a37" strokeWidth="1.3" />
            <circle cx="73" cy="47.5" r="3.2" fill="url(#as-voyant)" />
            <circle cx="73" cy="47.5" r="1.1" fill="#e6f6ff" />
            <path d="M39 92 Q33 96 34 104" stroke="#465064" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M81 92 Q87 96 86 104" stroke="#465064" strokeWidth="2.6" fill="none" strokeLinecap="round" />

            {/* Casque */}
            <ellipse cx="60" cy="40" rx="14.5" ry="4.2" fill="#555e70" />
            <ellipse cx="60" cy="24" rx="17.5" ry="18.5" fill="url(#as-casque)" />
            <path d="M44 28 Q60 36 76 28" stroke="#3b4353" strokeWidth="1.2" fill="none" opacity="0.7" />
            <path d="M47 12 Q60 6 73 12" stroke="#dfe7f5" strokeWidth="0.9" fill="none" opacity="0.5" />
            <rect x="40.5" y="20" width="3.5" height="8" rx="1.4" fill="#9aa4b6" />
            <rect x="76" y="20" width="3.5" height="8" rx="1.4" fill="#c9d3e3" />
            <circle cx="78" cy="22.5" r="1.1" fill="#f4f8ff" />

            {/* Liseré de lumière : le contre-jour de la planète. */}
            <g className="astronaute__lisere" fill="none" strokeLinecap="round">
              <path d="M67 7 Q77.5 13 77.5 26 Q77 34 73.5 38" stroke="#f3f7ff" strokeWidth="1.7" />
              <path d="M43 13 Q42 19 42.6 29" stroke="#bcd3ff" strokeWidth="0.9" opacity="0.7" />
              <path d="M90.5 58 Q90 78 87 100" stroke="#eef4ff" strokeWidth="1.4" />
              <path d="M98.5 63 Q99.7 80 97 104" stroke="#e6efff" strokeWidth="1.1" opacity="0.85" />
              <path d="M21.5 66 Q20.3 84 22.5 104" stroke="#bcd3ff" strokeWidth="0.8" opacity="0.6" />
              <path d="M82.5 101 Q82.6 114 77 122" stroke="#e6efff" strokeWidth="1" opacity="0.7" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
