import React from 'react';
import type { AvatarId } from '../types/game';

export const AVATAR_OPTIONS: { id: AvatarId; label: string }[] = [
  { id: 'loupe', label: 'Brass Loupe' },
  { id: 'owl', label: 'Barn Owl' },
  { id: 'lighthouse', label: 'Lighthouse' },
  { id: 'compass', label: 'Mariner Compass' },
  { id: 'monstera', label: 'Monstera Leaf' },
  { id: 'astrolabe', label: 'Astrolabe' },
  { id: 'chalet', label: 'Alpine Peak' },
  { id: 'saxophone', label: 'Tenor Sax' },
];

export const AvatarEmblem: React.FC<{
  avatarId: AvatarId;
  size?: number;
  className?: string;
}> = ({ avatarId, size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill="#1E2631" stroke="rgba(224,159,62,0.35)" strokeWidth="1.2" />
      {avatarId === 'loupe' && (
        <g stroke="#E09F3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="17" cy="17" r="7.5" fill="rgba(224,159,62,0.14)" />
          <path d="M22.5 22.5L30 30" strokeWidth="2.6" />
          <path d="M14.5 14.5a3.5 3.5 0 0 1 4.5-0.5" stroke="#F2EFE9" strokeWidth="1.4" />
        </g>
      )}
      {avatarId === 'owl' && (
        <g stroke="#E09F3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14c0-3 3-5 8-5s8 2 8 5v9c0 5-3.5 8-8 8s-8-3-8-8v-9z" fill="rgba(224,159,62,0.14)" />
          <circle cx="16" cy="16.5" r="2.3" fill="#F2EFE9" stroke="none" />
          <circle cx="24" cy="16.5" r="2.3" fill="#F2EFE9" stroke="none" />
          <circle cx="16" cy="16.5" r="1" fill="#12161D" stroke="none" />
          <circle cx="24" cy="16.5" r="1" fill="#12161D" stroke="none" />
          <path d="M19 19l1 2 1-2z" fill="#E09F3E" />
        </g>
      )}
      {avatarId === 'lighthouse' && (
        <g stroke="#F2EFE9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 30l2-14h4l2 14H16z" fill="rgba(224,159,62,0.2)" />
          <rect x="17.5" y="11" width="5" height="5" fill="#E09F3E" stroke="none" />
          <path d="M12 30h16" stroke="#E09F3E" />
          <path d="M25 13l6-2M25 15l6 2M15 13l-6-2M15 15l-6 2" stroke="#E09F3E" strokeWidth="1.3" />
        </g>
      )}
      {avatarId === 'compass' && (
        <g stroke="#E09F3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="20" cy="20" r="10" fill="rgba(224,159,62,0.12)" />
          <polygon points="20,12 22.5,20 20,28 17.5,20" fill="#F2EFE9" stroke="none" />
          <polygon points="20,12 22.5,20 17.5,20" fill="#E09F3E" stroke="none" />
        </g>
      )}
      {avatarId === 'monstera' && (
        <g stroke="#3D8C7D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9c6 0 10 5 9 11-1 5-4 8-9 9-5-1-8-4-9-9-1-6 3-11 9-11z" fill="rgba(61,140,125,0.28)" />
          <path d="M20 11v20M14 17l6 3M26 17l-6 3M15 23l5 2M25 23l-5 2" stroke="#9BE0CF" strokeWidth="1.4" />
        </g>
      )}
      {avatarId === 'astrolabe' && (
        <g stroke="#E09F3E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="20" cy="21" r="9" fill="rgba(224,159,62,0.12)" />
          <ellipse cx="20" cy="21" rx="9" ry="3.5" transform="rotate(-25 20 21)" stroke="#F2EFE9" />
          <circle cx="20" cy="10" r="2" />
          <circle cx="20" cy="21" r="2" fill="#E09F3E" />
        </g>
      )}
      {avatarId === 'chalet' && (
        <g stroke="#F2EFE9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 29l9-14 5 7 4-5 6 12H8z" fill="rgba(70,139,163,0.28)" />
          <path d="M14 20l3-5 3 4" fill="#F2EFE9" stroke="none" />
          <circle cx="28" cy="12" r="2.5" fill="#E09F3E" stroke="none" />
        </g>
      )}
      {avatarId === 'saxophone' && (
        <g stroke="#E09F3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 10l4 2v13c0 3 2.5 4.5 4.5 4.5s4-1.5 4-4v-3h3" fill="none" />
          <circle cx="28" cy="21" r="2.5" fill="rgba(224,159,62,0.28)" />
          <circle cx="18" cy="16" r="1" fill="#F2EFE9" stroke="none" />
          <circle cx="18" cy="20" r="1" fill="#F2EFE9" stroke="none" />
        </g>
      )}
    </svg>
  );
};
