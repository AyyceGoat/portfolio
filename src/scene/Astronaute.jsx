/**
 * L'astronaute, vu de dos, qui marche vers la planète.
 *
 * Dessiné en SVG et éclairé comme la scène : à contre-jour (la planète
 * et le soleil sont devant lui), un liseré de lumière sur les contours,
 * et la lueur chaude du chemin qui remonte sur les jambes. Son ombre
 * s'allonge vers nous sur le chemin.
 *
 * La marche est pilotée de l'extérieur (voir parcours.js) : chaque
 * image, seuls les attributs `transform` des membres changent.
 */
export default function Astronaute() {
  return (
    <div className="astronaute" aria-hidden="true">
      <svg className="astronaute__svg" viewBox="0 0 100 180" overflow="visible">
        <defs>
          <linearGradient id="as-combi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4b5466" />
            <stop offset="0.5" stopColor="#687183" />
            <stop offset="0.85" stopColor="#a39b8d" />
            <stop offset="1" stopColor="#e4d4b6" />
          </linearGradient>
          <linearGradient id="as-flanc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9d8f2" stopOpacity="0.55" />
            <stop offset="0.22" stopColor="#c9d8f2" stopOpacity="0" />
            <stop offset="0.78" stopColor="#dce8ff" stopOpacity="0" />
            <stop offset="1" stopColor="#eef4ff" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="as-casque" cx="0.62" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#a9b2c2" />
            <stop offset="0.55" stopColor="#626c7e" />
            <stop offset="1" stopColor="#2c3342" />
          </radialGradient>
          <linearGradient id="as-sac" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3c4556" />
            <stop offset="1" stopColor="#5a6172" />
          </linearGradient>
          <linearGradient id="as-botte" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6f6a63" />
            <stop offset="1" stopColor="#efdcbb" />
          </linearGradient>
          <radialGradient id="as-ombre" cx="0.5" cy="0" r="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.16" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="as-sol" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3dc" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff3dc" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ombre portée vers l'objectif, et reflet du chemin sous les pieds. */}
        <path className="astronaute__ombre" d="M42 175 Q50 172 58 175 L76 262 Q50 276 24 262 Z" fill="url(#as-ombre)" />
        <ellipse cx="50" cy="176" rx="26" ry="6" fill="url(#as-sol)" />

        <g className="astronaute__corps">
          {/* Jambe gauche */}
          <g className="astronaute__jambe" data-cote="g">
            <path d="M36 104 Q34 132 37 158 L48 158 Q50 132 50 106 Z" fill="url(#as-combi)" />
            <path d="M33 156 Q33 151 38 151 L48 151 Q52 151 52 157 L52 170 Q52 175 47 175 L37 175 Q33 175 33 170 Z" fill="url(#as-botte)" />
            <path d="M34 140 Q42 143 49 140" stroke="#5b6372" strokeWidth="1.2" fill="none" opacity="0.6" />
          </g>
          {/* Jambe droite */}
          <g className="astronaute__jambe" data-cote="d">
            <path d="M50 106 Q50 132 52 158 L63 158 Q66 132 64 104 Z" fill="url(#as-combi)" />
            <path d="M48 157 Q48 151 52 151 L62 151 Q67 151 67 156 L67 170 Q67 175 63 175 L53 175 Q48 175 48 170 Z" fill="url(#as-botte)" />
            <path d="M51 140 Q58 143 66 140" stroke="#5b6372" strokeWidth="1.2" fill="none" opacity="0.6" />
          </g>

          <g className="astronaute__buste">
            {/* Bras gauche */}
            <g className="astronaute__bras" data-cote="g">
              <path d="M30 50 Q20 56 20 76 Q20 92 23 102 L32 101 Q30 88 31 76 Q32 64 36 58 Z" fill="url(#as-combi)" />
              <path d="M20 99 Q19 108 24 112 Q30 113 33 107 L32 99 Z" fill="#9a958d" />
            </g>
            {/* Bras droit */}
            <g className="astronaute__bras" data-cote="d">
              <path d="M70 50 Q80 56 80 76 Q80 92 77 102 L68 101 Q70 88 69 76 Q68 64 64 58 Z" fill="url(#as-combi)" />
              <path d="M80 99 Q81 108 76 112 Q70 113 67 107 L68 99 Z" fill="#9a958d" />
            </g>

            {/* Torse et bassin */}
            <path d="M28 52 Q30 44 42 42 L58 42 Q70 44 72 52 L70 92 Q68 106 50 108 Q32 106 30 92 Z" fill="url(#as-combi)" />
            <path d="M33 96 Q50 102 67 96" stroke="#5b6372" strokeWidth="1.5" fill="none" opacity="0.7" />

            {/* Sac de survie */}
            <rect x="33" y="44" width="34" height="44" rx="6" fill="url(#as-sac)" />
            <rect x="37" y="49" width="26" height="9" rx="2" fill="#4c5567" />
            <rect x="37" y="62" width="12" height="20" rx="2" fill="#6a7486" />
            <rect x="51" y="62" width="12" height="20" rx="2" fill="#6a7486" />
            <circle cx="41" cy="53.5" r="1.3" fill="#9fc3ff" />

            {/* Casque */}
            <ellipse cx="50" cy="40" rx="11" ry="4" fill="#5d6576" />
            <ellipse cx="50" cy="25" rx="15.5" ry="16.5" fill="url(#as-casque)" />
            <path d="M37 30 Q50 38 63 30" stroke="#3f4757" strokeWidth="1.4" fill="none" opacity="0.6" />

            {/* Liseré de lumière : le contre-jour de la planète. */}
            <g className="astronaute__lisere" fill="none" strokeLinecap="round">
              <path d="M58 10.5 Q66 16 65.4 26 Q65 32 63 35" stroke="#f1f6ff" strokeWidth="1.6" />
              <path d="M35.5 18 Q33.7 24 35.5 31" stroke="#bcd3ff" strokeWidth="0.9" opacity="0.7" />
              <path d="M71.5 54 Q71 74 69.5 92" stroke="#eef4ff" strokeWidth="1.4" />
              <path d="M79.6 62 Q80.4 78 78 98" stroke="#e6efff" strokeWidth="1" opacity="0.85" />
              <path d="M20.6 64 Q19.8 80 22 98" stroke="#bcd3ff" strokeWidth="0.8" opacity="0.6" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
