import React, { useMemo, useRef, useState } from 'react';
import type {
  DailyPuzzle,
  DifferenceTarget,
  PuzzleTheme,
  SceneProp,
  ThemePalette,
} from '../types/game';

interface SceneCanvasProps {
  puzzle: DailyPuzzle;
  mode: 'original' | 'altered';
  foundIds: string[];
  hintDiffId: string | null;
  missFlash: { x: number; y: number; key: number } | null;
  loupeActive: boolean;
  hoverPos: { x: number; y: number; source: 'original' | 'altered' } | null;
  onHoverChange: (pos: { x: number; y: number; source: 'original' | 'altered' } | null) => void;
  onCanvasClick: (x: number, y: number, mode: 'original' | 'altered') => void;
  disabled?: boolean;
}

function renderBackdrop(theme: PuzzleTheme, palette: ThemePalette, uidSuffix: string) {
  return (
    <g>
      <defs>
        <linearGradient id={`sky-${uidSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.skyTop} />
          <stop offset="100%" stopColor={palette.skyBottom} />
        </linearGradient>
        <pattern
          id={`paper-dots-${uidSuffix}`}
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="0.65" fill={palette.ink} opacity="0.06" />
          <circle cx="7" cy="7" r="0.55" fill={palette.highlight} opacity="0.06" />
        </pattern>
      </defs>

      {/* Sky field */}
      <rect x="0" y="0" width="800" height="600" fill={`url(#sky-${uidSuffix})`} />

      {/* Atmospheric horizon band */}
      {theme === 'lighthouse' && (
        <g>
          <path
            d="M0 320 Q160 290 320 315 T640 305 T800 320 L800 390 L0 390 Z"
            fill={palette.horizon}
            opacity="0.7"
          />
          <rect x="0" y="360" width="800" height="240" fill={palette.ground} />
          <path
            d="M0 405 Q90 395 180 405 T360 405 T540 405 T720 405 T800 405"
            stroke={palette.highlight}
            strokeWidth="2"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M40 455 Q130 445 220 455 T400 455 T580 455 T760 455"
            stroke={palette.highlight}
            strokeWidth="2"
            fill="none"
            opacity="0.25"
          />
          {/* Rocky pier / headland */}
          <path
            d="M0 510 L210 495 L265 535 L290 600 L0 600 Z"
            fill={palette.groundAccent}
            stroke={palette.ink}
            strokeWidth="2"
          />
          <rect x="440" y="480" width="360" height="22" fill={palette.structure} stroke={palette.ink} strokeWidth="2" />
          <rect x="475" y="502" width="18" height="98" fill={palette.ink} opacity="0.65" />
          <rect x="595" y="502" width="18" height="98" fill={palette.ink} opacity="0.65" />
          <rect x="715" y="502" width="18" height="98" fill={palette.ink} opacity="0.65" />
        </g>
      )}

      {theme === 'conservatory' && (
        <g>
          {/* Glasshouse steel ribs in background */}
          <path
            d="M40 370 C40 120 760 120 760 370"
            fill="none"
            stroke={palette.structure}
            strokeWidth="6"
            opacity="0.45"
          />
          <path
            d="M140 370 C140 165 660 165 660 370"
            fill="none"
            stroke={palette.structure}
            strokeWidth="3.5"
            opacity="0.35"
          />
          {[180, 300, 400, 500, 620].map((vx) => (
            <line
              key={vx}
              x1={vx}
              y1="145"
              x2={vx}
              y2="375"
              stroke={palette.structure}
              strokeWidth="2.5"
              opacity="0.3"
            />
          ))}
          {/* Distant botanical silhouette */}
          <path
            d="M0 365 Q120 320 250 355 T530 345 T800 360 L800 400 L0 400 Z"
            fill={palette.horizon}
            opacity="0.7"
          />
          {/* Tiled conservatory floor */}
          <rect x="0" y="370" width="800" height="230" fill={palette.ground} stroke={palette.ink} strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((row) => (
            <line
              key={row}
              x1="0"
              y1={395 + row * 42}
              x2="800"
              y2={395 + row * 42}
              stroke={palette.groundAccent}
              strokeWidth="1.5"
            />
          ))}
          {[-100, 60, 220, 380, 540, 700, 860].map((gx) => (
            <line
              key={gx}
              x1={400 + (gx - 400) * 0.45}
              y1="370"
              x2={gx}
              y2="600"
              stroke={palette.groundAccent}
              strokeWidth="1.5"
            />
          ))}
        </g>
      )}

      {theme === 'observatory' && (
        <g>
          {/* Starfield */}
          {[
            [70, 55], [160, 120], [235, 48], [340, 110], [490, 60],
            [615, 130], [725, 52], [755, 155], [110, 185], [665, 195],
          ].map(([sx, sy], i) => (
            <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 1.8 : 1.2} fill={palette.highlight} opacity="0.75" />
          ))}
          {/* Observatory dome arc */}
          <path
            d="M60 375 C60 95 740 95 740 375"
            fill={palette.horizon}
            opacity="0.55"
            stroke={palette.structureTrim}
            strokeWidth="2.5"
          />
          <rect x="0" y="370" width="800" height="230" fill={palette.ground} stroke={palette.ink} strokeWidth="2" />
          <ellipse cx="400" cy="485" rx="310" ry="68" fill="none" stroke={palette.groundAccent} strokeWidth="2.5" />
          <ellipse cx="400" cy="485" rx="190" ry="38" fill="none" stroke={palette.structureTrim} strokeWidth="1.5" opacity="0.6" />
        </g>
      )}

      {theme === 'cafe' && (
        <g>
          {/* Distant European roofline */}
          <path
            d="M0 325 L80 325 L80 265 L195 265 L195 315 L350 315 L350 245 L510 245 L510 310 L650 310 L650 260 L800 260 L800 375 L0 375 Z"
            fill={palette.horizon}
            opacity="0.65"
          />
          {/* Cobblestone terrace */}
          <rect x="0" y="365" width="800" height="235" fill={palette.ground} stroke={palette.ink} strokeWidth="2" />
          <path d="M0 400 H800 M0 445 H800 M0 495 H800 M0 550 H800" stroke={palette.groundAccent} strokeWidth="1.5" opacity="0.6" />
          {[90, 210, 340, 470, 600, 720].map((cx, i) => (
            <rect
              key={cx}
              x={cx}
              y={415 + (i % 3) * 45}
              width="48"
              height="16"
              rx="6"
              fill={palette.groundAccent}
              opacity="0.35"
            />
          ))}
        </g>
      )}

      {theme === 'chalet' && (
        <g>
          {/* Layered Alpine peaks */}
          <path
            d="M0 350 L130 185 L260 320 L405 160 L545 315 L695 190 L800 330 L800 380 L0 380 Z"
            fill={palette.horizon}
            opacity="0.75"
          />
          {/* Snow caps */}
          <path d="M130 185 L165 230 L135 220 L102 232 Z" fill={palette.highlight} opacity="0.8" />
          <path d="M405 160 L448 212 L408 200 L368 215 Z" fill={palette.highlight} opacity="0.8" />
          <path d="M695 190 L732 235 L695 225 L660 238 Z" fill={palette.highlight} opacity="0.8" />
          {/* Rolling snowfield */}
          <path
            d="M0 375 Q220 345 450 375 T800 365 L800 600 L0 600 Z"
            fill={palette.ground}
            stroke={palette.ink}
            strokeWidth="2"
          />
          <path d="M0 490 Q240 460 520 500 T800 480" stroke={palette.groundAccent} strokeWidth="3" fill="none" opacity="0.55" />
        </g>
      )}

      {theme === 'clockshop' && (
        <g>
          {/* Wood-panelled atelier wall */}
          <rect x="0" y="0" width="800" height="380" fill={palette.skyBottom} opacity="0.35" />
          {[80, 200, 320, 440, 560, 680].map((px) => (
            <rect
              key={px}
              x={px}
              y="40"
              width="95"
              height="310"
              rx="4"
              fill="none"
              stroke={palette.structure}
              strokeWidth="2"
              opacity="0.45"
            />
          ))}
          <rect x="0" y="375" width="800" height="225" fill={palette.ground} stroke={palette.ink} strokeWidth="2" />
          <line x1="0" y1="392" x2="800" y2="392" stroke={palette.structureTrim} strokeWidth="3" opacity="0.6" />
        </g>
      )}

      {theme === 'mesa' && (
        <g>
          {/* Distant desert plateaus */}
          <path
            d="M0 325 L110 325 L135 270 L255 270 L275 325 L490 325 L520 250 L680 250 L710 325 L800 325 L800 385 L0 385 Z"
            fill={palette.horizon}
            opacity="0.7"
          />
          <path
            d="M0 375 Q240 350 480 378 T800 368 L800 600 L0 600 Z"
            fill={palette.ground}
            stroke={palette.ink}
            strokeWidth="2"
          />
          <path d="M40 480 Q210 455 390 485 T760 475" stroke={palette.groundAccent} strokeWidth="2.5" fill="none" opacity="0.5" />
        </g>
      )}

      {theme === 'jazzrooftop' && (
        <g>
          {/* Night stars */}
          {[
            [90, 45], [210, 95], [330, 50], [485, 85], [610, 42], [735, 105],
          ].map(([sx, sy], i) => (
            <circle key={i} cx={sx} cy={sy} r="1.5" fill={palette.highlight} opacity="0.7" />
          ))}
          {/* Skyline silhouette */}
          <path
            d="M0 370 L0 265 L65 265 L65 215 L145 215 L145 290 L215 290 L215 190 L310 190 L310 275 L410 275 L410 205 L505 205 L505 285 L590 285 L590 175 L685 175 L685 260 L800 260 L800 370 Z"
            fill={palette.horizon}
            opacity="0.85"
          />
          {/* Lit skyline windows */}
          {[
            [82, 232], [110, 232], [235, 212], [268, 212], [235, 240],
            [430, 225], [462, 225], [612, 198], [645, 198], [612, 228],
          ].map(([wx, wy], i) => (
            <rect key={i} x={wx} y={wy} width="12" height="14" fill={palette.highlight} opacity="0.65" />
          ))}
          {/* Rooftop parapet & terrace */}
          <rect x="0" y="368" width="800" height="232" fill={palette.ground} stroke={palette.ink} strokeWidth="2" />
          <rect x="0" y="362" width="800" height="14" fill={palette.groundAccent} stroke={palette.ink} strokeWidth="2" />
        </g>
      )}

      {/* Subtle risograph print dot texture */}
      <rect x="0" y="0" width="800" height="600" fill={`url(#paper-dots-${uidSuffix})`} pointerEvents="none" />
    </g>
  );
}

function renderProp(
  prop: SceneProp,
  palette: ThemePalette,
  diff: DifferenceTarget | undefined,
  isAltered: boolean
): React.ReactNode {
  if (isAltered && diff?.mutation === 'missing') {
    return null;
  }
  if (!isAltered && diff?.mutation === 'added') {
    return null;
  }

  const useAltColors = isAltered && diff?.mutation === 'color_shift';
  const c1 = useAltColors && diff?.altColor ? diff.altColor : prop.primaryColor;
  const c2 = useAltColors && diff?.altAccent ? diff.altAccent : prop.secondaryColor;
  const accent = prop.accentColor;
  const ink = palette.ink;

  const variant = isAltered && diff?.mutation === 'pattern_swap' && diff.altVariant !== undefined
    ? diff.altVariant
    : prop.variant;

  const isFlipped = (prop.flipped ? -1 : 1) * (isAltered && diff?.mutation === 'flip' ? -1 : 1);
  const dx = isAltered && diff?.mutation === 'position_shift' ? (diff.altDx ?? 32) : 0;
  const dy = isAltered && diff?.mutation === 'position_shift' ? (diff.altDy ?? -24) : 0;

  const transform = `translate(${prop.x + dx}, ${prop.y + dy}) rotate(${prop.rotation}) scale(${
    prop.scale * isFlipped
  }, ${prop.scale})`;

  let shape: React.ReactNode = null;

  switch (prop.kind) {
    case 'sunDisc':
      shape = (
        <g>
          <circle cx="0" cy="0" r="28" fill={c1} stroke={ink} strokeWidth="2.2" />
          <circle cx="0" cy="0" r="19" fill={c2} opacity="0.65" />
          {variant === 0 &&
            [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="0"
                y1="-34"
                x2="0"
                y2="-43"
                stroke={c1}
                strokeWidth="2.4"
                strokeLinecap="round"
                transform={`rotate(${deg})`}
              />
            ))}
          {variant === 1 && (
            <circle cx="0" cy="0" r="37" fill="none" stroke={c1} strokeWidth="2.4" strokeDasharray="5 5" />
          )}
          {variant === 2 && (
            <>
              <circle cx="0" cy="0" r="10" fill={palette.highlight} stroke={ink} strokeWidth="1.8" />
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <polygon
                  key={deg}
                  points="-4,-33 4,-33 0,-44"
                  fill={c1}
                  stroke={ink}
                  strokeWidth="1.2"
                  transform={`rotate(${deg})`}
                />
              ))}
            </>
          )}
        </g>
      );
      break;

    case 'crescentMoon':
      shape = (
        <g>
          <path
            d="M12 -26 A26 26 0 1 0 26 14 A20 20 0 1 1 12 -26 Z"
            fill={c1}
            stroke={ink}
            strokeWidth="2"
          />
          {variant === 0 && <circle cx="18" cy="-10" r="4.5" fill={c2} stroke={ink} strokeWidth="1.2" />}
          {variant === 2 && <path d="M18 -15 L20 -8 L27 -8 L21 -4 L23 3 L18 -1 L13 3 L15 -4 L9 -8 L16 -8 Z" fill={c2} stroke={ink} strokeWidth="1" />}
        </g>
      );
      break;

    case 'cloudCluster':
      shape = (
        <g>
          <path
            d="M-38 12 H38 C46 12 52 5 52 -3 C52 -11 45 -17 37 -17 C35 -27 25 -34 14 -34 C4 -34 -4 -28 -8 -20 C-12 -23 -17 -25 -22 -25 C-33 -25 -42 -16 -42 -5 C-47 -3 -50 2 -50 7 C-50 10 -45 12 -38 12 Z"
            fill={c1}
            stroke={ink}
            strokeWidth="2"
          />
          {variant === 1 && (
            <path d="M-24 2 H24" stroke={c2} strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
          )}
          {variant === 2 && (
            <g fill={c2} stroke={ink} strokeWidth="1.4">
              <circle cx="-18" cy="22" r="3.5" />
              <circle cx="0" cy="24" r="3.5" />
              <circle cx="18" cy="22" r="3.5" />
            </g>
          )}
        </g>
      );
      break;

    case 'birdFlock':
      shape = (
        <g stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M-28 -4 Q-18 -14 -10 -4 Q-2 -14 8 -4" />
          <path d="M6 -18 Q14 -26 20 -18 Q26 -26 34 -18" />
          {variant === 0 && <path d="M-12 12 Q-4 4 2 12 Q8 4 16 12" />}
          {variant === 1 && (
            <>
              <path d="M-12 12 Q-4 4 2 12 Q8 4 16 12" />
              <path d="M-34 -18 Q-28 -25 -22 -18 Q-16 -25 -10 -18" />
            </>
          )}
        </g>
      );
      break;

    case 'hotAirBalloon':
      shape = (
        <g>
          <path
            d="M0 -42 C24 -42 36 -22 30 2 C25 18 12 24 8 28 H-8 C-12 24 -25 18 -30 2 C-36 -22 -24 -42 0 -42 Z"
            fill={c1}
            stroke={ink}
            strokeWidth="2.2"
          />
          {variant === 0 && (
            <path d="M-14 -40 Q0 -12 -6 28 M14 -40 Q0 -12 6 28" fill="none" stroke={c2} strokeWidth="5" />
          )}
          {variant === 1 && (
            <rect x="-28" y="-16" width="56" height="12" fill={c2} opacity="0.85" />
          )}
          {variant === 2 && (
            <g fill={c2}>
              <circle cx="-12" cy="-16" r="5" />
              <circle cx="12" cy="-16" r="5" />
              <circle cx="0" cy="-28" r="5" />
            </g>
          )}
          <line x1="-6" y1="28" x2="-5" y2="38" stroke={ink} strokeWidth="1.6" />
          <line x1="6" y1="28" x2="5" y2="38" stroke={ink} strokeWidth="1.6" />
          <rect x="-9" y="38" width="18" height="12" rx="2" fill={accent} stroke={ink} strokeWidth="2" />
        </g>
      );
      break;

    case 'weathervane':
      shape = (
        <g>
          <line x1="0" y1="-34" x2="0" y2="30" stroke={ink} strokeWidth="3" />
          <line x1="-22" y1="10" x2="22" y2="10" stroke={ink} strokeWidth="2.5" />
          <path d="M-28 -18 L24 -18 L14 -26 M24 -18 L14 -10" stroke={c1} strokeWidth="3" fill="none" strokeLinecap="round" />
          {variant === 0 && (
            <polygon points="-28,-25 -16,-18 -28,-11" fill={c2} stroke={ink} strokeWidth="1.8" />
          )}
          {variant === 1 && (
            <circle cx="-22" cy="-18" r="7" fill={c2} stroke={ink} strokeWidth="1.8" />
          )}
          {variant === 2 && (
            <polygon points="-32,-26 -18,-22 -24,-18 -18,-14 -32,-10" fill={c2} stroke={ink} strokeWidth="1.6" />
          )}
        </g>
      );
      break;

    case 'hangingLantern':
      shape = (
        <g>
          <line x1="0" y1="-48" x2="0" y2="-22" stroke={ink} strokeWidth="2.2" />
          <path d="M-12 -22 L12 -22 L16 -14 L-16 -14 Z" fill={accent} stroke={ink} strokeWidth="2" />
          <rect x="-13" y="-14" width="26" height="30" rx={variant === 1 ? 11 : 3} fill={c1} stroke={ink} strokeWidth="2" />
          <rect x="-7" y="-8" width="14" height="18" rx="2" fill={c2} opacity="0.85" />
          {variant === 2 && (
            <path d="M-13 -14 L13 16 M13 -14 L-13 16" stroke={ink} strokeWidth="1.8" />
          )}
          <path d="M-10 16 L10 16 L6 23 L-6 23 Z" fill={accent} stroke={ink} strokeWidth="2" />
        </g>
      );
      break;

    case 'pottedMonstera':
      shape = (
        <g>
          {/* Leaves */}
          <path d="M0 8 C-26 -8 -36 -30 -16 -40 C-4 -45 2 -26 0 8 Z" fill={c1} stroke={ink} strokeWidth="2" />
          <path d="M0 8 C26 -8 36 -30 16 -40 C4 -45 -2 -26 0 8 Z" fill={c2} stroke={ink} strokeWidth="2" />
          <path d="M0 6 C-12 -22 -10 -46 0 -52 C10 -46 12 -22 0 6 Z" fill={c1} stroke={ink} strokeWidth="2" />
          {/* Pot */}
          <path d="M-20 8 H20 L15 40 H-15 Z" fill={accent} stroke={ink} strokeWidth="2.2" />
          <rect x="-23" y="4" width="46" height="8" rx="2" fill={accent} stroke={ink} strokeWidth="2" />
          {variant === 1 && <path d="M-17 20 H17" stroke={ink} strokeWidth="3" />}
          {variant === 2 && (
            <g fill={palette.highlight} stroke={ink} strokeWidth="1">
              <circle cx="-8" cy="24" r="3" />
              <circle cx="0" cy="24" r="3" />
              <circle cx="8" cy="24" r="3" />
            </g>
          )}
        </g>
      );
      break;

    case 'wateringCan':
      shape = (
        <g>
          <path d="M-22 0 L-36 -18 L-41 -14 L-24 10 Z" fill={c1} stroke={ink} strokeWidth="2" />
          <ellipse cx="-40" cy="-17" rx="5" ry="3.5" transform="rotate(-35 -40 -17)" fill={c2} stroke={ink} strokeWidth="1.8" />
          <rect x="-22" y="-12" width="38" height="32" rx="4" fill={c1} stroke={ink} strokeWidth="2.2" />
          <path d="M16 -6 C30 -6 30 14 16 14" fill="none" stroke={ink} strokeWidth="3.5" />
          <path d="M-12 -12 C-12 -26 12 -26 12 -12" fill="none" stroke={ink} strokeWidth="3" />
          {variant === 1 && <rect x="-14" y="0" width="22" height="8" rx="2" fill={c2} stroke={ink} strokeWidth="1.4" />}
          {variant === 2 && <circle cx="-3" cy="4" r="7" fill={palette.highlight} stroke={ink} strokeWidth="1.6" />}
        </g>
      );
      break;

    case 'butterfly':
      shape = (
        <g>
          <path d="M0 0 C-18 -20 -30 -8 -22 6 C-16 14 -6 10 0 4 Z" fill={c1} stroke={ink} strokeWidth="1.8" />
          <path d="M0 0 C18 -20 30 -8 22 6 C16 14 6 10 0 4 Z" fill={c1} stroke={ink} strokeWidth="1.8" />
          <path d="M0 4 C-16 10 -22 24 -10 26 C-2 27 0 14 0 4 Z" fill={c2} stroke={ink} strokeWidth="1.8" />
          <path d="M0 4 C16 10 22 24 10 26 C2 27 0 14 0 4 Z" fill={c2} stroke={ink} strokeWidth="1.8" />
          <line x1="0" y1="-10" x2="0" y2="18" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          {variant === 0 && (
            <>
              <circle cx="-13" cy="-4" r="3.5" fill={palette.highlight} stroke={ink} strokeWidth="1" />
              <circle cx="13" cy="-4" r="3.5" fill={palette.highlight} stroke={ink} strokeWidth="1" />
            </>
          )}
          {variant === 1 && (
            <>
              <circle cx="-13" cy="-4" r="3.5" fill={palette.highlight} stroke={ink} strokeWidth="1" />
              <circle cx="13" cy="-4" r="3.5" fill={palette.highlight} stroke={ink} strokeWidth="1" />
              <path d="M-2 -10 Q-8 -20 -12 -18 M2 -10 Q8 -20 12 -18" fill="none" stroke={ink} strokeWidth="1.6" />
            </>
          )}
        </g>
      );
      break;

    case 'archWindow':
      shape = (
        <g>
          <path
            d="M-32 42 V-10 C-32 -32 -16 -46 0 -46 C16 -46 32 -32 32 -10 V42 Z"
            fill={c1}
            stroke={ink}
            strokeWidth="2.4"
          />
          <path
            d="M-24 36 V-8 C-24 -24 -12 -36 0 -36 C12 -36 24 -24 24 -8 V36 Z"
            fill={c2}
            stroke={ink}
            strokeWidth="1.8"
          />
          <line x1="0" y1="-36" x2="0" y2="36" stroke={ink} strokeWidth="2" />
          <line x1="-24" y1="6" x2="24" y2="6" stroke={ink} strokeWidth="2" />
          {variant === 1 && <circle cx="0" cy="-18" r="7" fill="none" stroke={ink} strokeWidth="1.8" />}
          {variant === 2 && (
            <rect x="-36" y="40" width="72" height="8" rx="2" fill={accent} stroke={ink} strokeWidth="2" />
          )}
        </g>
      );
      break;

    case 'lighthouseTower':
      shape = (
        <g>
          <path d="M-26 62 L-16 -24 H16 L26 62 Z" fill={c1} stroke={ink} strokeWidth="2.4" />
          {/* Stripes */}
          <path d="M-21 20 H21 L23 38 H-23 Z" fill={c2} stroke={ink} strokeWidth="1.8" />
          <path d="M-18 -6 H18 L19 8 H-19 Z" fill={c2} stroke={ink} strokeWidth="1.8" />
          {/* Lantern room */}
          <rect x="-18" y="-32" width="36" height="8" rx="2" fill={ink} />
          <rect x="-13" y="-50" width="26" height="18" fill={palette.highlight} stroke={ink} strokeWidth="2" />
          <polygon points="-17,-50 0,-66 17,-50" fill={c2} stroke={ink} strokeWidth="2" />
          {variant === 1 && (
            <path d="M16 -42 L48 -50 M16 -38 L48 -30" stroke={palette.highlight} strokeWidth="3" strokeLinecap="round" />
          )}
          {variant === 2 && (
            <path d="M-7 62 V44 C-7 39 7 39 7 44 V62 Z" fill={ink} />
          )}
        </g>
      );
      break;

    case 'sailboat':
      shape = (
        <g>
          <path d="M-36 14 H36 L26 30 H-26 Z" fill={c1} stroke={ink} strokeWidth="2.2" />
          <line x1="0" y1="14" x2="0" y2="-44" stroke={ink} strokeWidth="2.6" />
          <polygon points="2,-40 30,8 2,8" fill={c2} stroke={ink} strokeWidth="2" />
          {variant === 0 && <polygon points="-3,-32 -24,8 -3,8" fill={palette.highlight} stroke={ink} strokeWidth="2" />}
          {variant === 1 && (
            <>
              <polygon points="-3,-32 -24,8 -3,8" fill={palette.highlight} stroke={ink} strokeWidth="2" />
              <line x1="2" y1="-16" x2="17" y2="-16" stroke={ink} strokeWidth="3" />
            </>
          )}
          <polygon points="0,-44 14,-39 0,-34" fill={accent} stroke={ink} strokeWidth="1.5" />
        </g>
      );
      break;

    case 'seagull':
      shape = (
        <g>
          <ellipse cx="0" cy="4" rx="18" ry="9" fill="#F4F1EA" stroke={ink} strokeWidth="2" />
          <circle cx="15" cy="-4" r="7" fill="#F4F1EA" stroke={ink} strokeWidth="2" />
          <polygon points="21,-5 30,-2 21,0" fill={c1} stroke={ink} strokeWidth="1.6" />
          <circle cx="17" cy="-6" r="1.5" fill={ink} />
          <path
            d={variant === 2 ? 'M-14 -10 C-4 -22 8 -14 8 2' : 'M-12 2 C-4 -10 8 -6 10 4'}
            fill={c2}
            stroke={ink}
            strokeWidth="1.8"
          />
          {variant === 1 && (
            <>
              <line x1="-2" y1="13" x2="-4" y2="23" stroke={c1} strokeWidth="2.2" />
              <line x1="5" y1="13" x2="7" y2="23" stroke={c1} strokeWidth="2.2" />
            </>
          )}
        </g>
      );
      break;

    case 'buoy':
      shape = (
        <g>
          <path d="M-20 22 H20 L14 6 H-14 Z" fill={c1} stroke={ink} strokeWidth="2" />
          <path d="M-10 6 L-5 -24 H5 L10 6 Z" fill="none" stroke={ink} strokeWidth="2.2" />
          <rect x="-7" y="-32" width="14" height="8" fill={c2} stroke={ink} strokeWidth="1.8" />
          {variant === 1 && <circle cx="0" cy="-39" r="5.5" fill={palette.highlight} stroke={ink} strokeWidth="1.6" />}
          {variant === 2 && <rect x="-17" y="11" width="34" height="6" fill={palette.highlight} stroke={ink} strokeWidth="1.4" />}
        </g>
      );
      break;

    case 'telescope':
      shape = (
        <g>
          <line x1="0" y1="2" x2="-22" y2="48" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="0" y1="2" x2="22" y2="48" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="0" y1="2" x2="0" y2="44" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
          <g transform="rotate(-24)">
            <rect x="-32" y="-10" width="66" height="16" rx="3" fill={c1} stroke={ink} strokeWidth="2.2" />
            <rect x="26" y="-12" width="12" height="20" rx="2" fill={c2} stroke={ink} strokeWidth="2" />
            <rect x="-40" y="-6" width="10" height="8" fill={accent} stroke={ink} strokeWidth="1.8" />
            {variant === 1 && <rect x="-6" y="-10" width="12" height="16" fill={c2} stroke={ink} strokeWidth="1.6" />}
            {variant === 2 && <rect x="-10" y="-19" width="24" height="6" rx="2" fill={accent} stroke={ink} strokeWidth="1.6" />}
          </g>
        </g>
      );
      break;

    case 'orrery':
      shape = (
        <g>
          <rect x="-24" y="34" width="48" height="10" rx="3" fill={accent} stroke={ink} strokeWidth="2" />
          <line x1="0" y1="34" x2="0" y2="-22" stroke={ink} strokeWidth="3" />
          <ellipse cx="0" cy="-4" rx="42" ry="14" fill="none" stroke={accent} strokeWidth="2.2" />
          <ellipse cx="0" cy="-4" rx="24" ry="8" fill="none" stroke={ink} strokeWidth="1.6" strokeDasharray="4 3" />
          <circle cx="0" cy="-4" r="9" fill={c1} stroke={ink} strokeWidth="2" />
          <circle cx="-34" cy="-10" r="6" fill={c2} stroke={ink} strokeWidth="1.8" />
          <circle cx="32" cy="4" r={variant === 1 ? 9 : 5} fill={palette.highlight} stroke={ink} strokeWidth="1.8" />
          {variant === 2 && <circle cx="0" cy="-18" r="6" fill={c2} stroke={ink} strokeWidth="1.6" />}
        </g>
      );
      break;

    case 'constellationFrame':
      shape = (
        <g>
          <rect x="-34" y="-28" width="68" height="56" rx="4" fill={c1} stroke={ink} strokeWidth="2.4" />
          <rect x="-27" y="-21" width="54" height="42" fill="#182235" stroke={accent} strokeWidth="1.5" />
          <polyline
            points="-18,10 -6,-8 8,-2 18,-14"
            fill="none"
            stroke={palette.highlight}
            strokeWidth="1.8"
          />
          {variant === 1 && (
            <line x1="8" y1="-2" x2="14" y2="12" stroke={palette.highlight} strokeWidth="1.8" />
          )}
          {variant === 2 && (
            <circle cx="-16" cy="-11" r="6" fill="none" stroke={c2} strokeWidth="1.8" />
          )}
          {[
            [-18, 10], [-6, -8], [8, -2], [18, -14],
          ].map(([sx, sy], i) => (
            <circle key={i} cx={sx} cy={sy} r="2.6" fill={c2} />
          ))}
        </g>
      );
      break;

    case 'owl':
      shape = (
        <g>
          <ellipse cx="0" cy="4" rx="20" ry="26" fill={c1} stroke={ink} strokeWidth="2.2" />
          <ellipse cx="0" cy="10" rx="12" ry="16" fill={c2} opacity="0.7" />
          <circle cx="-7" cy="-8" r="6.5" fill="#F6F2E9" stroke={ink} strokeWidth="1.8" />
          <circle cx="7" cy="-8" r="6.5" fill="#F6F2E9" stroke={ink} strokeWidth="1.8" />
          <circle cx="-7" cy="-8" r="2.5" fill={ink} />
          <circle cx="7" cy="-8" r="2.5" fill={ink} />
          <polygon points="-3,-2 3,-2 0,4" fill={accent} stroke={ink} strokeWidth="1.4" />
          {variant !== 2 && (
            <>
              <polygon points="-16,-22 -8,-16 -18,-12" fill={c1} stroke={ink} strokeWidth="1.8" />
              <polygon points="16,-22 8,-16 18,-12" fill={c1} stroke={ink} strokeWidth="1.8" />
            </>
          )}
          {variant === 1 && (
            <path d="M-6 10 H6 M-4 16 H4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      );
      break;

    case 'bistroAwning':
      shape = (
        <g>
          <path d="M-54 -18 H54 L64 14 H-64 Z" fill={c1} stroke={ink} strokeWidth="2.2" />
          {variant !== 2 &&
            [-42, -14, 14, 42].map((sx) => (
              <rect key={sx} x={sx - 7} y="-18" width="14" height="32" fill={c2} opacity={variant === 1 ? 0.25 : 0.95} />
            ))}
          {variant === 2 && (
            <circle cx="0" cy="-2" r="9" fill={palette.highlight} stroke={ink} strokeWidth="1.8" />
          )}
          <path d="M-64 14 Q-52 24 -40 14 Q-28 24 -16 14 Q-4 24 8 14 Q20 24 32 14 Q44 24 64 14" fill={c1} stroke={ink} strokeWidth="2" />
        </g>
      );
      break;

    case 'bistroTable':
      shape = (
        <g>
          <line x1="0" y1="-6" x2="0" y2="38" stroke={ink} strokeWidth="3.5" />
          <path d="M-18 38 H18" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="0" cy="-6" rx="34" ry="9" fill={c1} stroke={ink} strokeWidth="2.2" />
          <ellipse cx="-10" cy="-10" rx="8" ry="3" fill="#F4F1EA" stroke={ink} strokeWidth="1.5" />
          <rect x="-14" y="-18" width="8" height="7" rx="2" fill={c2} stroke={ink} strokeWidth="1.5" />
          {variant === 1 && (
            <rect x="8" y="-17" width="10" height="8" rx="2" fill={accent} stroke={ink} strokeWidth="1.5" />
          )}
          {variant === 2 && (
            <path d="M10 -10 V-24 L13 -28 H17 L20 -24 V-10 Z" fill={accent} stroke={ink} strokeWidth="1.5" />
          )}
        </g>
      );
      break;

    case 'bicycle':
      shape = (
        <g>
          <circle cx="-26" cy="14" r="17" fill="none" stroke={ink} strokeWidth="2.8" />
          <circle cx="26" cy="14" r="17" fill="none" stroke={ink} strokeWidth="2.8" />
          <polyline
            points="-26,14 -6,-10 18,-10 26,14 -6,14 -6,-10"
            fill="none"
            stroke={c1}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <line x1="18" y1="-10" x2="14" y2="-22" stroke={ink} strokeWidth="2.6" />
          <line x1="10" y1="-22" x2="22" y2="-22" stroke={ink} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="-12" y1="-12" x2="0" y2="-12" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          {variant !== 2 && (
            <rect x="20" y="-14" width="14" height="11" rx="2" fill={c2} stroke={ink} strokeWidth="1.8" />
          )}
          {variant === 1 && (
            <rect x="-34" y="-6" width="14" height="9" rx="2" fill={accent} stroke={ink} strokeWidth="1.6" />
          )}
        </g>
      );
      break;

    case 'lamppost':
      shape = (
        <g>
          <rect x="-6" y="42" width="12" height="14" rx="2" fill={ink} />
          <line x1="0" y1="42" x2="0" y2="-32" stroke={ink} strokeWidth="4" />
          <path d="M-12 -32 L12 -32 L9 -52 L-9 -52 Z" fill={c1} stroke={ink} strokeWidth="2" />
          <polygon points="-14,-52 0,-64 14,-52" fill={c2} stroke={ink} strokeWidth="2" />
          {variant === 1 && <circle cx="0" cy="-42" r="5.5" fill={palette.highlight} stroke={ink} strokeWidth="1.2" />}
          {variant === 2 && <line x1="-14" y1="-18" x2="14" y2="-18" stroke={ink} strokeWidth="3" strokeLinecap="round" />}
        </g>
      );
      break;

    case 'steamTrain':
      shape = (
        <g>
          <rect x="-46" y="-8" width="64" height="28" rx="4" fill={c1} stroke={ink} strokeWidth="2.2" />
          <rect x="14" y="-22" width="26" height="42" rx="2" fill={c2} stroke={ink} strokeWidth="2.2" />
          <rect x="-38" y="-24" width="12" height="16" fill={ink} />
          <circle cx="-32" cy="24" r="9" fill={accent} stroke={ink} strokeWidth="2.2" />
          <circle cx="-10" cy="24" r="9" fill={accent} stroke={ink} strokeWidth="2.2" />
          <circle cx="24" cy="24" r="9" fill={accent} stroke={ink} strokeWidth="2.2" />
          {variant !== 1 && (
            <g fill="#F4F1EA" stroke={ink} strokeWidth="1.5" opacity="0.85">
              <circle cx="-36" cy="-34" r="6" />
              <circle cx="-26" cy="-42" r="8" />
            </g>
          )}
          {variant === 2 && <circle cx="-46" cy="-2" r="5" fill={palette.highlight} stroke={ink} strokeWidth="1.5" />}
        </g>
      );
      break;

    case 'pineTree':
      shape = (
        <g>
          <rect x="-6" y="24" width="12" height="24" fill="#5A3D2B" stroke={ink} strokeWidth="2" />
          <polygon points="0,-52 -26,-10 26,-10" fill={c1} stroke={ink} strokeWidth="2" />
          <polygon points="0,-30 -32,12 32,12" fill={c2} stroke={ink} strokeWidth="2" />
          <polygon points="0,-8 -38,30 38,30" fill={c1} stroke={ink} strokeWidth="2" />
          {variant === 1 && <circle cx="0" cy="-56" r="5" fill={accent} stroke={ink} strokeWidth="1.5" />}
          {variant === 2 && (
            <g fill={palette.highlight} stroke={ink} strokeWidth="1">
              <circle cx="-8" cy="-18" r="3" />
              <circle cx="10" cy="4" r="3" />
              <circle cx="-12" cy="20" r="3" />
            </g>
          )}
        </g>
      );
      break;

    case 'chaletGable':
      shape = (
        <g>
          <rect x="-42" y="-8" width="84" height="58" fill={c1} stroke={ink} strokeWidth="2.2" />
          <polygon points="-52,-8 0,-48 52,-8" fill={c2} stroke={ink} strokeWidth="2.4" />
          <rect x="-12" y="18" width="24" height="32" rx="2" fill={accent} stroke={ink} strokeWidth="2" />
          <rect x="-32" y="4" width="14" height="14" fill={palette.highlight} stroke={ink} strokeWidth="1.8" />
          <rect x="18" y="4" width="14" height="14" fill={palette.highlight} stroke={ink} strokeWidth="1.8" />
          {variant === 1 && <rect x="20" y="-42" width="10" height="20" fill={accent} stroke={ink} strokeWidth="2" />}
          {variant === 2 && <line x1="-44" y1="22" x2="44" y2="22" stroke={ink} strokeWidth="3.5" />}
        </g>
      );
      break;

    case 'grandfatherClock':
      shape = (
        <g>
          <rect x="-20" y="-26" width="40" height="86" rx="3" fill={c1} stroke={ink} strokeWidth="2.2" />
          <path d="M-24 -26 C-24 -46 24 -46 24 -26 Z" fill={c2} stroke={ink} strokeWidth="2.2" />
          <circle cx="0" cy="-16" r="14" fill="#F5F0E3" stroke={ink} strokeWidth="2" />
          <line x1="0" y1="-16" x2="0" y2="-24" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="-16" x2={variant === 1 ? -8 : 8} y2="-12" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <rect x="-11" y="6" width="22" height="38" fill="#231B16" stroke={accent} strokeWidth="1.5" />
          <circle cx="0" cy="34" r="6" fill={accent} stroke={ink} strokeWidth="1.6" />
          {variant === 2 && <circle cx="0" cy="-46" r="5" fill={accent} stroke={ink} strokeWidth="1.6" />}
        </g>
      );
      break;

    case 'pocketWatch':
      shape = (
        <g>
          <circle cx="0" cy="-26" r="6" fill="none" stroke={accent} strokeWidth="2.5" />
          <circle cx="0" cy="0" r="24" fill={c1} stroke={ink} strokeWidth="2.2" />
          <circle cx="0" cy="0" r="18" fill="#F5F0E3" stroke={ink} strokeWidth="1.6" />
          <line x1="0" y1="0" x2="0" y2="-11" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="0" x2={variant === 1 ? -9 : 9} y2="4" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
          {variant === 2 && <circle cx="0" cy="8" r="5" fill="none" stroke={ink} strokeWidth="1.4" />}
        </g>
      );
      break;

    case 'gearCluster':
      shape = (
        <g>
          <circle cx="-8" cy="-4" r="20" fill={c1} stroke={ink} strokeWidth="2.2" />
          <circle cx="-8" cy="-4" r="8" fill={palette.skyBottom} stroke={ink} strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="-11"
              y="-28"
              width="6"
              height="7"
              fill={c1}
              stroke={ink}
              strokeWidth="1.5"
              transform={`rotate(${deg} -8 -4)`}
            />
          ))}
          {variant !== 2 && (
            <g transform="translate(18, 14)">
              <circle cx="0" cy="0" r="12" fill={c2} stroke={ink} strokeWidth="2" />
              <circle cx="0" cy="0" r="4" fill={palette.highlight} stroke={ink} strokeWidth="1.5" />
            </g>
          )}
          {variant === 1 && (
            <path d="M-16 -4 H0 M-8 -12 V4" stroke={ink} strokeWidth="2" />
          )}
        </g>
      );
      break;

    case 'mesaButte':
      shape = (
        <g>
          <path d="M-54 32 L-36 -28 H36 L54 32 Z" fill={c1} stroke={ink} strokeWidth="2.2" />
          <path d="M-36 -28 L-28 -10 H28 L36 -28 Z" fill={c2} opacity="0.7" />
          {variant === 1 && <line x1="-42" y1="6" x2="42" y2="6" stroke={accent} strokeWidth="4" />}
          {variant === 2 && (
            <path d="M-24 -28 L-16 -44 L-6 -28 Z M8 -28 L18 -40 L26 -28 Z" fill={c1} stroke={ink} strokeWidth="2" />
          )}
        </g>
      );
      break;

    case 'saguaro':
      shape = (
        <g>
          <rect x="-8" y="-38" width="16" height="80" rx="8" fill={c1} stroke={ink} strokeWidth="2.2" />
          <path d="M-8 0 H-22 C-26 0 -28 -4 -28 -10 V-22" fill="none" stroke={c1} strokeWidth="11" strokeLinecap="round" />
          <path d="M-8 0 H-22 C-26 0 -28 -4 -28 -10 V-22" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          {variant !== 2 && (
            <>
              <path d="M8 -8 H22 C26 -8 28 -12 28 -18 V-28" fill="none" stroke={c1} strokeWidth="10" strokeLinecap="round" />
              <path d="M8 -8 H22 C26 -8 28 -12 28 -18 V-28" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {variant === 1 && <circle cx="0" cy="-42" r="5" fill={c2} stroke={ink} strokeWidth="1.5" />}
        </g>
      );
      break;

    case 'clayAmphora':
      shape = (
        <g>
          <path
            d="M-10 -28 H10 L7 -14 C22 -4 22 26 10 38 H-10 C-22 26 -22 -4 -7 -14 Z"
            fill={c1}
            stroke={ink}
            strokeWidth="2.2"
          />
          <path d="M-16 6 H16" stroke={c2} strokeWidth="5" />
          {variant === 1 && <path d="M-14 18 L-6 12 L2 18 L10 12 L15 18" fill="none" stroke={accent} strokeWidth="2.5" />}
          {variant === 2 && (
            <g fill={palette.highlight} stroke={ink} strokeWidth="1">
              <circle cx="-7" cy="20" r="3" />
              <circle cx="7" cy="20" r="3" />
            </g>
          )}
          <path d="M-9 -18 C-22 -18 -24 -2 -16 4" fill="none" stroke={ink} strokeWidth="2.5" />
          <path d="M9 -18 C22 -18 24 -2 16 4" fill="none" stroke={ink} strokeWidth="2.5" />
        </g>
      );
      break;

    case 'waterTower':
      shape = (
        <g>
          <line x1="-18" y1="10" x2="-26" y2="56" stroke={ink} strokeWidth="3" />
          <line x1="18" y1="10" x2="26" y2="56" stroke={ink} strokeWidth="3" />
          <line x1="-22" y1="34" x2="22" y2="34" stroke={ink} strokeWidth="2" />
          <rect x="-24" y="-26" width="48" height="36" rx="3" fill={c1} stroke={ink} strokeWidth="2.2" />
          <line x1="-24" y1="-12" x2="24" y2="-12" stroke={ink} strokeWidth="2" />
          <line x1="-24" y1="0" x2="24" y2="0" stroke={ink} strokeWidth="2" />
          <polygon points="-28,-26 0,-46 28,-26" fill={c2} stroke={ink} strokeWidth="2.2" />
          {variant === 1 && <rect x="-8" y="-22" width="16" height="8" fill={accent} stroke={ink} strokeWidth="1.2" />}
          {variant === 2 && <line x1="0" y1="10" x2="0" y2="56" stroke={ink} strokeWidth="3" />}
        </g>
      );
      break;

    case 'saxophone':
      shape = (
        <g>
          <line x1="-12" y1="42" x2="12" y2="42" stroke={ink} strokeWidth="3" />
          <line x1="0" y1="42" x2="0" y2="10" stroke={ink} strokeWidth="2.5" />
          <path
            d="M-16 -32 L-4 -26 V16 C-4 28 16 28 16 14 V2 H24"
            fill="none"
            stroke={c1}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M-16 -32 L-4 -26 V16 C-4 28 16 28 16 14 V2 H24"
            fill="none"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="20" cy="2" rx="9" ry="5" fill={c2} stroke={ink} strokeWidth="2" />
          {variant === 1 && (
            <>
              <circle cx="-4" cy="-10" r="2.5" fill={palette.highlight} />
              <circle cx="-4" cy="-2" r="2.5" fill={palette.highlight} />
              <circle cx="-4" cy="6" r="2.5" fill={palette.highlight} />
            </>
          )}
          {variant === 2 && (
            <g fill={palette.highlight} stroke={ink} strokeWidth="1">
              <circle cx="22" cy="-14" r="4" />
              <line x1="25" y1="-14" x2="25" y2="-26" stroke={palette.highlight} strokeWidth="2" />
            </g>
          )}
        </g>
      );
      break;

    case 'vinylShelf':
      shape = (
        <g>
          <rect x="-32" y="-26" width="64" height="52" rx="3" fill={c1} stroke={ink} strokeWidth="2.2" />
          <line x1="-32" y1="0" x2="32" y2="0" stroke={ink} strokeWidth="2.5" />
          {[-22, -16, -10, -4, 12, 18].map((rx, i) => (
            <rect
              key={rx}
              x={rx}
              y="-22"
              width="4.5"
              height="20"
              fill={i % 2 === 0 ? c2 : accent}
              stroke={ink}
              strokeWidth="1"
            />
          ))}
          {variant === 1 && <circle cx="14" cy="14" r="9" fill="#181C24" stroke={palette.highlight} strokeWidth="1.8" />}
          {variant === 2 && <rect x="-22" y="6" width="22" height="14" rx="2" fill={c2} stroke={ink} strokeWidth="1.6" />}
        </g>
      );
      break;

    case 'catSilhouette':
      shape = (
        <g>
          <ellipse cx="0" cy="12" rx="14" ry="18" fill={c1} stroke={ink} strokeWidth="2" />
          <circle cx="0" cy="-10" r="10" fill={c1} stroke={ink} strokeWidth="2" />
          <polygon points="-9,-16 -6,-28 -1,-18" fill={c1} stroke={ink} strokeWidth="1.8" />
          <polygon points="9,-16 6,-28 1,-18" fill={c1} stroke={ink} strokeWidth="1.8" />
          <path d="M12 24 C26 24 28 4 18 2" fill="none" stroke={c1} strokeWidth="5" strokeLinecap="round" />
          <circle cx="-4" cy="-11" r="1.8" fill={palette.highlight} />
          <circle cx="4" cy="-11" r="1.8" fill={palette.highlight} />
          {variant === 1 && <path d="M-8 0 H8" stroke={c2} strokeWidth="4" strokeLinecap="round" />}
          {variant === 2 && <circle cx="0" cy="5" r="4" fill={palette.highlight} stroke={ink} strokeWidth="1.2" />}
        </g>
      );
      break;

    case 'teaCup':
      shape = (
        <g>
          <ellipse cx="0" cy="14" rx="20" ry="5" fill={c2} stroke={ink} strokeWidth="1.8" />
          <path d="M-14 -8 H14 L10 12 H-10 Z" fill={c1} stroke={ink} strokeWidth="2" />
          <path d="M13 -4 C21 -4 21 6 12 6" fill="none" stroke={ink} strokeWidth="2.5" />
          {variant !== 2 && (
            <path d="M-4 -14 Q-8 -22 -2 -28 M4 -14 Q8 -22 3 -28" fill="none" stroke={palette.highlight} strokeWidth="1.8" strokeLinecap="round" />
          )}
          {variant === 1 && <circle cx="0" cy="2" r="3.5" fill={palette.highlight} stroke={ink} strokeWidth="1" />}
        </g>
      );
      break;

    case 'bookStack':
      shape = (
        <g>
          <rect x="-26" y="8" width="52" height="12" rx="2" fill={c1} stroke={ink} strokeWidth="2" />
          <rect x="-22" y="-4" width="46" height="12" rx="2" fill={c2} stroke={ink} strokeWidth="2" />
          <rect x="-24" y="-16" width="44" height="12" rx="2" fill={accent} stroke={ink} strokeWidth="2" />
          {variant === 1 && <rect x="-12" y="-16" width="8" height="12" fill={palette.highlight} />}
          {variant === 2 && <rect x="8" y="8" width="8" height="12" fill={palette.highlight} />}
        </g>
      );
      break;

    case 'flowerBox':
      shape = (
        <g>
          <rect x="-32" y="2" width="64" height="20" rx="2" fill={accent} stroke={ink} strokeWidth="2.2" />
          {(variant === 2 ? [-22, -7, 7, 22] : [-20, 0, 20]).map((fx, i) => (
            <g key={fx} transform={`translate(${fx}, -8)`}>
              <line x1="0" y1="10" x2="0" y2="0" stroke={ink} strokeWidth="2" />
              <circle cx="0" cy="-4" r="7" fill={i === 1 && variant === 1 ? c2 : c1} stroke={ink} strokeWidth="1.8" />
              <circle cx="0" cy="-4" r="2.5" fill={palette.highlight} />
            </g>
          ))}
        </g>
      );
      break;

    case 'clockDial':
      shape = (
        <g>
          <circle cx="0" cy="0" r="26" fill={accent} stroke={ink} strokeWidth="2.4" />
          <circle cx="0" cy="0" r="20" fill="#F6F1E4" stroke={ink} strokeWidth="1.8" />
          <line x1="0" y1="0" x2="0" y2="-13" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="0" y1="0" x2={variant === 1 ? -10 : 10} y2="5" stroke={c1} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2.5" fill={ink} />
          {variant === 2 && (
            <g stroke={ink} strokeWidth="2">
              <line x1="0" y1="-18" x2="0" y2="-15" />
              <line x1="18" y1="0" x2="15" y2="0" />
              <line x1="0" y1="18" x2="0" y2="15" />
              <line x1="-18" y1="0" x2="-15" y2="0" />
            </g>
          )}
        </g>
      );
      break;
  }

  return <g key={prop.id} transform={transform}>{shape}</g>;
}

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  puzzle,
  mode,
  foundIds,
  hintDiffId,
  missFlash,
  loupeActive,
  hoverPos,
  onHoverChange,
  onCanvasClick,
  disabled = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localHover, setLocalHover] = useState(false);

  const diffByPropId = useMemo(() => {
    const map = new Map<string, DifferenceTarget>();
    puzzle.differences.forEach((d) => map.set(d.propId, d));
    return map;
  }, [puzzle.differences]);

  const toViewBoxCoords = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;

    // Use native SVG CTM inverse for exact pixel-to-viewBox mapping with zero offset
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return {
        x: Math.max(0, Math.min(800, transformed.x)),
        y: Math.max(0, Math.min(600, transformed.y)),
      };
    }

    // Fallback: compute exact xMidYMid meet fitted box
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scale = Math.min(rect.width / 800, rect.height / 600);
    const renderedW = 800 * scale;
    const renderedH = 600 * scale;
    const offsetX = rect.left + (rect.width - renderedW) / 2;
    const offsetY = rect.top + (rect.height - renderedH) / 2;
    return {
      x: Math.max(0, Math.min(800, (clientX - offsetX) / scale)),
      y: Math.max(0, Math.min(600, (clientY - offsetY) / scale)),
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (disabled) return;
    const coords = toViewBoxCoords(e.clientX, e.clientY);
    if (coords) {
      setLocalHover(true);
      onHoverChange({ ...coords, source: mode });
    }
  };

  const handlePointerLeave = () => {
    setLocalHover(false);
    if (!hoverPos || hoverPos.source === mode) {
      onHoverChange(null);
    }
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    const coords = toViewBoxCoords(e.clientX, e.clientY);
    if (coords) {
      onCanvasClick(coords.x, coords.y, mode);
    }
  };

  const uidSuffix = `${puzzle.date}-${mode}`;
  const hintDiff = hintDiffId ? puzzle.differences.find((d) => d.id === hintDiffId) : null;

  const sceneContent = (
    <>
      {renderBackdrop(puzzle.theme, puzzle.palette, uidSuffix)}
      {puzzle.props.map((prop) =>
        renderProp(prop, puzzle.palette, diffByPropId.get(prop.id), mode === 'altered')
      )}
    </>
  );

  // Compute zoomed viewBox for synchronized optical Loupe
  const zoomRadius = 68;
  const zoomSpan = 96; // 2.2x optical magnification inside 136px viewBox window

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center min-h-0">
      <div className="w-full max-h-full aspect-[4/3] flex flex-col">
        {/* Subtle plate label above frame */}
        <div className="flex items-center justify-between px-1 pb-1.5 text-xs text-[#A9B2C0] shrink-0">
          <span className="font-medium tracking-wide text-[#F2EFE9]/90">
            {mode === 'original' ? 'Plate A · Original' : 'Plate B · Altered Print'}
          </span>
          <span className="font-mono-tabular text-[11px] text-[#A9B2C0]/75">
            {puzzle.themeLabel}
          </span>
        </div>

        {/* Framed 4:3 print surface — zero dead letterbox offset */}
        <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-[#F5F1E8] p-1.5 sm:p-2 shadow-lg ring-1 ring-white/10">
          <svg
            ref={svgRef}
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid meet"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
            className={`w-full h-full rounded-lg select-none block ${
              disabled ? 'cursor-default' : loupeActive ? 'cursor-none' : 'cursor-crosshair'
            }`}
            role="img"
            aria-label={`${puzzle.title} — ${mode === 'original' ? 'Original' : 'Altered'} illustration`}
          >
            {sceneContent}

            {/* Found difference markers centered on the exact prop location on this plate */}
            {puzzle.differences.map((diff) => {
              if (!foundIds.includes(diff.id)) return null;
              const cx = mode === 'original' ? diff.origX : diff.altX;
              const cy = mode === 'original' ? diff.origY : diff.altY;
              const r = Math.max(28, Math.min(58, diff.hitRadius * 0.78));
              return (
                <g key={diff.id} transform={`translate(${cx}, ${cy})`} pointerEvents="none">
                  <circle
                    cx="0"
                    cy="0"
                    r={r}
                    fill="rgba(16, 185, 129, 0.16)"
                    stroke="#10B981"
                    strokeWidth="3.5"
                    className="animate-spot-ring"
                  />
                  <circle
                    cx={r * 0.72}
                    cy={-r * 0.72}
                    r="11"
                    fill="#10B981"
                    stroke="#12161D"
                    strokeWidth="2"
                  />
                  <path
                    d={`M${r * 0.72 - 4} ${-r * 0.72} l3 3 l5 -6`}
                    fill="none"
                    stroke="#12161D"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Hint pulse marker */}
            {hintDiff && !foundIds.includes(hintDiff.id) && (
              <g
                transform={`translate(${mode === 'original' ? hintDiff.origX : hintDiff.altX}, ${
                  mode === 'original' ? hintDiff.origY : hintDiff.altY
                })`}
                pointerEvents="none"
              >
                <circle
                  cx="0"
                  cy="0"
                  r={Math.max(40, hintDiff.hitRadius)}
                  fill="rgba(224, 159, 62, 0.12)"
                  stroke="#E09F3E"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  className="animate-hint-pulse"
                />
              </g>
            )}

          {/* Miss flash marker */}
          {missFlash && (
            <g key={missFlash.key} transform={`translate(${missFlash.x}, ${missFlash.y})`} pointerEvents="none">
              <circle
                cx="0"
                cy="0"
                r="22"
                fill="rgba(239, 68, 68, 0.18)"
                stroke="#EF4444"
                strokeWidth="3"
                className="animate-miss-flash"
              />
              <path
                d="M-7 -7 L7 7 M7 -7 L-7 7"
                stroke="#EF4444"
                strokeWidth="3"
                strokeLinecap="round"
                className="animate-miss-flash"
              />
            </g>
          )}

          {/* Mirrored tracking bubble on the opposite plate when mousing over one side */}
          {!loupeActive && hoverPos && hoverPos.source !== mode && !disabled && (
            <g transform={`translate(${hoverPos.x}, ${hoverPos.y})`} pointerEvents="none">
              <circle
                cx="0"
                cy="0"
                r="24"
                fill="none"
                stroke="#12161D"
                strokeWidth="4.5"
                opacity="0.4"
              />
              <circle
                cx="0"
                cy="0"
                r="24"
                fill="rgba(224, 159, 62, 0.14)"
                stroke="#E09F3E"
                strokeWidth="2.4"
              />
              <path
                d="M-14 -12 A18 18 0 0 1 10 -16"
                fill="none"
                stroke="#F2EFE9"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.85"
              />
              <circle
                cx="0"
                cy="0"
                r="2.8"
                fill="#E09F3E"
                stroke="#12161D"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* Synchronized Optical Loupe Magnifier */}
          {loupeActive && hoverPos && !disabled && (
            <g pointerEvents="none">
              <defs>
                <clipPath id={`loupe-clip-${uidSuffix}`}>
                  <circle cx={hoverPos.x} cy={hoverPos.y} r={zoomRadius} />
                </clipPath>
              </defs>
              <g clipPath={`url(#loupe-clip-${uidSuffix})`}>
                <rect
                  x={hoverPos.x - zoomRadius}
                  y={hoverPos.y - zoomRadius}
                  width={zoomRadius * 2}
                  height={zoomRadius * 2}
                  fill={puzzle.palette.skyTop}
                />
                <svg
                  x={hoverPos.x - zoomRadius}
                  y={hoverPos.y - zoomRadius}
                  width={zoomRadius * 2}
                  height={zoomRadius * 2}
                  viewBox={`${hoverPos.x - zoomSpan / 2} ${hoverPos.y - zoomSpan / 2} ${zoomSpan} ${zoomSpan}`}
                >
                  {renderBackdrop(puzzle.theme, puzzle.palette, `loupe-${uidSuffix}`)}
                  {puzzle.props.map((prop) =>
                    renderProp(prop, puzzle.palette, diffByPropId.get(prop.id), mode === 'altered')
                  )}
                </svg>
              </g>
              {/* Brass loupe rim & crosshair */}
              <circle
                cx={hoverPos.x}
                cy={hoverPos.y}
                r={zoomRadius}
                fill="none"
                stroke="#E09F3E"
                strokeWidth="4.5"
              />
              <circle
                cx={hoverPos.x}
                cy={hoverPos.y}
                r={zoomRadius + 3}
                fill="none"
                stroke="#12161D"
                strokeWidth="1.5"
              />
              {localHover && (
                <path
                  d={`M${hoverPos.x - 8} ${hoverPos.y} H${hoverPos.x + 8} M${hoverPos.x} ${
                    hoverPos.y - 8
                  } V${hoverPos.y + 8}`}
                  stroke="#E09F3E"
                  strokeWidth="1.4"
                  opacity="0.7"
                />
              )}
            </g>
          )}
          </svg>
        </div>
      </div>
    </div>
  );
};
