// Dark purple palette matching the web app
export const C = {
  bg: '#13101f',
  ink: 'rgba(245,238,255,0.92)',
  inkSoft: 'rgba(245,238,255,0.62)',
  inkMute: 'rgba(245,238,255,0.34)',
  inkFaint: 'rgba(245,238,255,0.16)',
  surface: 'rgba(255,255,255,0.06)',
  surface2: 'rgba(255,255,255,0.10)',
  hairline: 'rgba(255,255,255,0.12)',
  hairlineStrong: 'rgba(255,255,255,0.22)',
  accentText: 'rgba(245,228,196,0.96)',
  accentBorder: 'rgba(232,180,110,0.55)',
  accentGlow: 'rgba(216,165,96,0.30)',
  accentBg: 'rgba(20,16,38,0.80)',
  accentSurface: 'rgba(232,180,110,0.12)',
} as const;

export function t(_dark: boolean) {
  return {
    bg: C.bg,
    text: C.ink,
    textMuted: C.inkSoft,
    textDim: C.inkMute,
    cardBg: C.surface,
    cardBorder: C.hairline,
    inputBg: C.surface,
    inputBorder: C.hairline,
  };
}
