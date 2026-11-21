import React from 'react';
import { BIKE_COLOR_PALETTES } from '../data/wordQuestions';
import { BikeColorId, BikeModelId, HelmetStyleId } from '../types/game';

interface BikePreviewSvgProps {
  bikeColor: BikeColorId;
  helmetStyle: HelmetStyleId;
  bikeModel: BikeModelId;
  raceNumber: string;
  className?: string;
}

export const BikePreviewSvg: React.FC<BikePreviewSvgProps> = ({
  bikeColor,
  helmetStyle,
  bikeModel,
  raceNumber,
  className = 'w-full h-32',
}) => {
  const palette = BIKE_COLOR_PALETTES.find((c) => c.id === bikeColor) ?? BIKE_COLOR_PALETTES[0];

  return (
    <svg viewBox="0 0 220 130" className={className} aria-label={`Pelari #${raceNumber}`}>
      <defs>
        <linearGradient id={`jersey-${bikeColor}-${bikeModel}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.primary} />
          <stop offset="100%" stopColor={palette.secondary} />
        </linearGradient>
      </defs>

      {/* Track lane line & ground shadow */}
      <line x1="20" y1="115" x2="200" y2="115" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeDasharray="8 6" />
      <ellipse cx="110" cy="116" rx="56" ry="6.5" fill="rgba(0,0,0,0.4)" />

      {/* Speed motion lines */}
      {bikeModel === 'turbo' || bikeModel === 'aero' ? (
        <g stroke={palette.accent} strokeWidth="2.2" strokeLinecap="round" opacity="0.65">
          <line x1="34" y1="44" x2="62" y2="44" />
          <line x1="24" y1="62" x2="54" y2="62" />
          <line x1="38" y1="80" x2="64" y2="80" />
        </g>
      ) : null}

      {/* Back leg (trailing stride) */}
      <path
        d="M98,74 L74,89 L56,105"
        fill="none"
        stroke="#E6B28A"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Back shorts thigh */}
      <path
        d="M98,74 L82,84"
        fill="none"
        stroke={palette.secondary}
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Back running sneaker */}
      <path
        d="M52,104 L65,109 L48,113 Z"
        fill={palette.primary}
        stroke="#F8FAFC"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Back arm */}
      <path
        d="M104,45 L84,56 L72,49"
        fill="none"
        stroke="#D49B72"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front leg (high knee sprint stride) */}
      <path
        d="M106,74 L134,82 L144,104"
        fill="none"
        stroke="#F1C29B"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M106,74 L126,80"
        fill="none"
        stroke={palette.secondary}
        strokeWidth="12.5"
        strokeLinecap="round"
      />
      {/* Front running sneaker */}
      <path
        d="M140,104 L160,104 L158,111 L140,111 Z"
        fill={palette.primary}
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Sprinter Torso & Jersey */}
      <path
        d="M96,42 L119,40 L114,75 L93,74 Z"
        fill={`url(#jersey-${bikeColor}-${bikeModel})`}
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Jersey Accent Trim */}
      <path
        d="M113,41 L118,41 L113,75 L108,75 Z"
        fill={palette.accent}
        opacity="0.9"
      />

      {/* Chest Race Bib */}
      <rect
        x="98"
        y="49"
        width="20"
        height="15"
        rx="2.5"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="1.2"
      />
      <text
        x="108"
        y="60"
        textAnchor="middle"
        fontSize="10.5"
        fontWeight="800"
        fontFamily="Barlow Condensed, sans-serif"
        fill="#0F172A"
      >
        {raceNumber || '01'}
      </text>

      {/* Front pumping arm + wristband */}
      <path
        d="M112,46 L128,60 L142,52"
        fill="none"
        stroke="#F1C29B"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="141" cy="52" r="3.5" fill={palette.accent} />

      {/* Head & Dynamic Accessory */}
      <g transform="translate(115, 25)">
        <circle r="11.5" fill="#F1C29B" stroke="#0F172A" strokeWidth="1.8" />
        {/* Hair */}
        <path
          d="M-11,-3 Q-6,-14 7,-11 Q11,-8 10,-3 Z"
          fill="#1E293B"
        />
        {/* Headband (pro) */}
        {helmetStyle === 'pro' && (
          <>
            <path d="M-11,-5 Q0,-8 11,-4" fill="none" stroke={palette.primary} strokeWidth="4" />
            <path d="M-11,-5 L-21,-8 L-17,-2 Z" fill={palette.accent} />
          </>
        )}
        {/* Sport Sunglasses (cyber) */}
        {helmetStyle === 'cyber' && (
          <rect
            x="1"
            y="-4"
            width="11.5"
            height="5"
            rx="2"
            fill="#06B6D4"
            stroke="#0F172A"
            strokeWidth="1.3"
          />
        )}
        {/* Sprinter Cap (eagle) */}
        {helmetStyle === 'eagle' && (
          <>
            <path d="M-11,-4 Q0,-15 11,-4 Z" fill={palette.primary} stroke="#0F172A" strokeWidth="1.3" />
            <path d="M5,-4 L19,-2 L7,0 Z" fill={palette.accent} stroke="#0F172A" strokeWidth="1" />
          </>
        )}
        {/* Champion Gold Crown Headband (champ) */}
        {helmetStyle === 'champ' && (
          <>
            <path d="M-11,-5 Q0,-9 11,-4" fill="none" stroke="#FACC15" strokeWidth="4.2" />
            <path d="M-4,-11 L0,-17 L4,-11 Z" fill="#FACC15" stroke="#0F172A" strokeWidth="1" />
          </>
        )}
      </g>
    </svg>
  );
};
