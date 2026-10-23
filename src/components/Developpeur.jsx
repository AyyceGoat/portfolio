/**
 * Le développeur à son poste, en orbite au-dessus de l'horizon.
 *
 * Même lumière que le reste de la scène : un contre-jour bleuté venu
 * du lever de soleil derrière lui (liserés sur les cheveux, les épaules
 * et le mobilier), et la lumière froide de l'écran qui éclaire le
 * visage et les mains par-dessous. Le reste demeure dans la pénombre.
 */
export default function Developpeur() {
  return (
    <svg className="developpeur" viewBox="0 0 400 560" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="dv-sol" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#9cc2ff" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#4d79c9" stopOpacity="0.18" />
          <stop offset="1" stopColor="#4d79c9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dv-plateau" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4a6b" />
          <stop offset="1" stopColor="#151c2c" />
        </linearGradient>
        <linearGradient id="dv-pied" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2234" />
          <stop offset="1" stopColor="#0c111c" />
        </linearGradient>
        <linearGradient id="dv-peau" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#8e8aa6" />
          <stop offset="0.35" stopColor="#5a4651" />
          <stop offset="1" stopColor="#2b1a16" />
        </linearGradient>
        <radialGradient id="dv-cheveux" cx="0.62" cy="0.25" r="0.8">
          <stop offset="0" stopColor="#2a2d3a" />
          <stop offset="0.5" stopColor="#111219" />
          <stop offset="1" stopColor="#07080c" />
        </radialGradient>
        <linearGradient id="dv-pull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2638" />
          <stop offset="0.7" stopColor="#141b2a" />
          <stop offset="1" stopColor="#2b3a5c" />
        </linearGradient>
        <radialGradient id="dv-cone" cx="0.5" cy="1" r="1" fx="0.5" fy="1">
          <stop offset="0" stopColor="#d6e6ff" stopOpacity="0.26" />
          <stop offset="0.45" stopColor="#bcd4ff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#bcd4ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dv-capot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c3446" />
          <stop offset="1" stopColor="#151a26" />
        </linearGradient>
        <radialGradient id="dv-logo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#bcd6ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#bcd6ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dv-pantalon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#121827" />
          <stop offset="1" stopColor="#1d2840" />
        </linearGradient>
        <linearGradient id="dv-feuille" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0f2427" />
          <stop offset="1" stopColor="#2f5d5c" />
        </linearGradient>
      </defs>

      {/* Plateforme flottante et reflet de l'horizon. */}
      <ellipse cx="200" cy="548" rx="206" ry="16" fill="url(#dv-sol)" />
      <ellipse cx="200" cy="546" rx="168" ry="7" fill="#0b101b" opacity="0.85" />
      <path d="M38 546 Q200 538 362 546" stroke="#a9c8ff" strokeWidth="1" fill="none" opacity="0.5" />

      {/* Plante */}
      <g className="developpeur__plante">
        <path d="M58 470 Q30 420 46 368 Q62 412 64 470 Z" fill="url(#dv-feuille)" />
        <path d="M62 472 Q60 404 92 350 Q92 420 72 474 Z" fill="url(#dv-feuille)" />
        <path d="M54 474 Q8 446 4 402 Q40 424 60 470 Z" fill="url(#dv-feuille)" />
        <path d="M70 474 Q104 430 132 418 Q112 456 76 478 Z" fill="url(#dv-feuille)" />
        <path d="M47 370 Q58 410 63 466" stroke="#7fb7b0" strokeWidth="0.8" fill="none" opacity="0.5" />
        <path d="M91 352 Q78 410 70 470" stroke="#7fb7b0" strokeWidth="0.8" fill="none" opacity="0.5" />
        <path d="M36 474 L92 474 L84 540 Q64 546 44 540 Z" fill="#1c2333" />
        <path d="M36 474 L92 474" stroke="#9fbcf0" strokeWidth="1.4" opacity="0.7" />
        <path d="M91 476 L84 538" stroke="#9fbcf0" strokeWidth="1" opacity="0.45" />
      </g>

      {/* Dossier du fauteuil */}
      <path d="M126 196 Q126 168 154 166 L246 166 Q274 168 274 196 L278 330 L122 330 Z" fill="#0b0f19" />
      <path d="M274 196 L278 330" stroke="#8fb0ea" strokeWidth="1.2" opacity="0.55" />
      <path d="M154 166 L246 166" stroke="#8fb0ea" strokeWidth="1" opacity="0.4" />

      {/* Jambes, sous le bureau : l'une croisée sur l'autre. */}
      <path d="M176 352 L210 352 L206 516 L182 516 Z" fill="url(#dv-pantalon)" />
      <path d="M176 520 Q174 510 186 508 L206 508 Q214 514 214 524 L214 532 L172 532 Q168 524 176 520 Z" fill="#cfd6e4" />
      <path d="M172 532 L214 532" stroke="#7b869c" strokeWidth="2" />
      <path d="M206 352 Q248 352 262 382 L298 452 L276 462 L244 398 Q232 384 206 386 Z" fill="url(#dv-pantalon)" />
      <path d="M276 458 Q282 448 296 448 L308 470 Q316 482 306 488 L284 488 Q276 476 276 458 Z" fill="#cfd6e4" />
      <path d="M262 382 L298 452" stroke="#7fa0dc" strokeWidth="1" opacity="0.5" />

      {/* Buste */}
      <path
        d="M118 330 Q116 250 128 222 Q138 198 172 190 L228 190 Q262 198 272 222 Q284 250 282 330 Z"
        fill="url(#dv-pull)"
      />
      <path d="M272 222 Q284 250 282 330" stroke="#a8c4ff" strokeWidth="1.6" fill="none" opacity="0.75" />
      <path d="M128 222 Q138 198 172 190" stroke="#a8c4ff" strokeWidth="1.2" fill="none" opacity="0.45" />
      <path d="M228 190 Q262 198 272 222" stroke="#cfe0ff" strokeWidth="1.4" fill="none" opacity="0.7" />
      <path d="M176 190 Q200 206 224 190" stroke="#0b0f19" strokeWidth="3" fill="none" />

      {/* Cou et tête */}
      <path d="M186 160 L214 160 L216 194 Q200 202 184 194 Z" fill="#3a2620" />
      <ellipse cx="168" cy="134" rx="6" ry="10" fill="#3b2722" />
      <ellipse cx="232" cy="134" rx="6" ry="10" fill="#3b2722" />
      <ellipse cx="200" cy="130" rx="31" ry="38" fill="url(#dv-peau)" />
      {/* Barbe courte, le long de la mâchoire */}
      <path
        d="M171 140 Q172 164 188 172 Q200 177 212 172 Q228 164 229 140 Q226 158 214 164 Q200 168 186 164 Q174 158 171 140 Z"
        fill="#15100f"
        opacity="0.85"
      />
      {/* Regard baissé vers l'écran */}
      <path d="M181 124 Q188 128 195 125" stroke="#120c0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M205 125 Q212 128 219 124" stroke="#120c0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M180 116 Q188 112 195 115" stroke="#120c0b" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M205 115 Q212 112 220 116" stroke="#120c0b" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M200 126 Q197 140 194 145 Q200 149 206 145" stroke="#a49cb6" strokeWidth="1.2" fill="none" opacity="0.55" />
      <path d="M190 156 Q200 159 210 156" stroke="#120c0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Chevelure afro, ourlée de lumière : elle encadre le visage
          jusqu'aux oreilles, contour légèrement crépu. */}
      <path
        d="M146 142 Q130 128 132 106 Q128 84 140 66 Q146 46 166 38 Q182 26 202 28 Q224 26 240 38 Q258 46 264 66 Q274 84 270 106 Q272 128 256 142 Q254 122 246 110 Q236 96 216 92 Q200 88 184 92 Q164 96 154 110 Q146 122 146 142 Z"
        fill="url(#dv-cheveux)"
      />
      <path
        d="M140 66 Q146 46 166 38 Q182 26 202 28 Q224 26 240 38 Q258 46 264 66 Q274 84 270 106"
        stroke="#cfe0ff"
        strokeWidth="2.2"
        fill="none"
        opacity="0.75"
        strokeLinecap="round"
        strokeDasharray="7 3"
      />
      <path d="M270 106 Q272 128 256 142" stroke="#a8c4ff" strokeWidth="1.4" fill="none" opacity="0.55" />

      {/* Lumière de l'écran qui monte vers le visage */}
      <path className="developpeur__cone" d="M150 254 L250 254 L246 92 L154 92 Z" fill="url(#dv-cone)" />

      {/* Bras posés sur le bureau */}
      <path d="M140 224 Q110 268 122 306 Q140 324 170 328" stroke="url(#dv-pull)" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d="M260 224 Q290 268 278 306 Q260 324 230 328" stroke="url(#dv-pull)" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d="M291 268 Q294 296 280 318" stroke="#a8c4ff" strokeWidth="1.4" fill="none" opacity="0.6" />
      <ellipse cx="172" cy="327" rx="12" ry="7" fill="#6f6680" />
      <ellipse cx="228" cy="327" rx="12" ry="7" fill="#6f6680" />

      {/* Bureau */}
      <path d="M22 322 L378 322 L400 344 L0 344 Z" fill="url(#dv-plateau)" />
      <path d="M0 344 L400 344 L400 356 L0 356 Z" fill="#0d1320" />
      <path d="M22 322 L378 322" stroke="#b7cdf5" strokeWidth="1.2" opacity="0.7" />
      <path d="M0 344 L400 344" stroke="#7e98c8" strokeWidth="1" opacity="0.5" />
      <path d="M20 356 L32 356 L30 548 L24 548 Z" fill="url(#dv-pied)" />
      <path d="M368 356 L380 356 L376 548 L370 548 Z" fill="url(#dv-pied)" />
      <path d="M380 356 L376 548" stroke="#8fb0ea" strokeWidth="1" opacity="0.5" />

      {/* Tasse et vapeur */}
      <g className="developpeur__tasse">
        <path d="M310 296 L336 296 L333 330 Q323 334 313 330 Z" fill="#1e2638" />
        <path d="M336 302 Q348 304 346 314 Q344 322 334 322" stroke="#1e2638" strokeWidth="4" fill="none" />
        <path d="M310 296 L336 296" stroke="#cfe0ff" strokeWidth="1.2" opacity="0.8" />
        <path d="M335 298 L332 328" stroke="#a8c4ff" strokeWidth="1" opacity="0.6" />
        <path className="developpeur__vapeur" d="M318 288 Q312 276 320 266 Q328 256 320 244" stroke="#dbe8ff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path className="developpeur__vapeur developpeur__vapeur--2" d="M328 288 Q334 274 326 262 Q320 252 328 240" stroke="#dbe8ff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>

      {/* Ordinateur portable, vu de dos */}
      <path d="M144 250 Q144 246 148 246 L252 246 Q256 246 256 250 L260 324 L140 324 Z" fill="url(#dv-capot)" />
      <path d="M148 246 L252 246" stroke="#e3edff" strokeWidth="1.4" opacity="0.9" />
      <path d="M256 250 L260 324" stroke="#9fbcf0" strokeWidth="1" opacity="0.6" />
      <circle className="developpeur__logo" cx="200" cy="284" r="14" fill="url(#dv-logo)" />
      <path d="M128 324 L272 324 L276 332 L124 332 Z" fill="#3b4762" />
      <path d="M128 324 L272 324" stroke="#cfe0ff" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}
