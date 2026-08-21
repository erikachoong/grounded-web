// theme/tokens.ts
//
// The single source of truth for the meditation app's visual system.
// Every screen and component imports from here. Don't hard-code colors
// or sizes elsewhere.

// ─── Colors ─────────────────────────────────────────────────────
// Dusk palette — deep indigo night, with warm amber accents for the orb
// and rare warm CTAs. Mirror of the CSS variables in the HTML prototype.

export const colors = {
  // backgrounds (use as gradient stops)
  bg0: '#1A1531',          // deepest night
  bg1: '#2A1F4F',          // upper-left ambient
  bg2: '#3A2A5C',          // soft lift

  // ink (text)
  ink:       'rgba(245, 238, 255, 0.92)',
  inkSoft:   'rgba(245, 238, 255, 0.62)',
  inkMute:   'rgba(245, 238, 255, 0.34)',
  inkFaint:  'rgba(245, 238, 255, 0.16)',

  // surfaces (buttons, cards)
  surface:        'rgba(255, 255, 255, 0.06)',
  surface2:       'rgba(255, 255, 255, 0.10)',
  hairline:       'rgba(255, 255, 255, 0.12)',
  hairlineStrong: 'rgba(255, 255, 255, 0.22)',

  // warm accents — used VERY sparingly (orb + primary CTA only)
  warmCore:    'rgba(255, 210, 170, 0.95)',
  warmHalo:    'rgba(245, 170, 140, 0.45)',
  warmGlow:    'rgba(216, 165, 96, 0.30)',
  warmBorder:  'rgba(232, 180, 110, 0.55)',
  warmInk:     'rgba(245, 228, 196, 0.96)',
};

// ─── Type ────────────────────────────────────────────────────────
// Inter Tight at every weight we use. Sizes match the web prototype.

export const type = {
  family: 'InterTight',

  // size + weight + leading combos
  display:  { fontSize: 38, fontWeight: '200' as const, lineHeight: 40, letterSpacing: -0.8 },
  title:    { fontSize: 26, fontWeight: '300' as const, lineHeight: 32, letterSpacing: -0.4 },
  body:     { fontSize: 14.5, fontWeight: '300' as const, lineHeight: 23, letterSpacing: 0.05 },
  bodyLg:   { fontSize: 16, fontWeight: '300' as const, lineHeight: 24 },
  meta:     { fontSize: 12.5, fontWeight: '300' as const, lineHeight: 16, letterSpacing: 0.3 },
  eyebrow:  { fontSize: 10.5, fontWeight: '300' as const, letterSpacing: 1.6, lineHeight: 14 },
  button:   { fontSize: 13, fontWeight: '400' as const, letterSpacing: 0.4 },
};

// ─── Spacing scale ───────────────────────────────────────────────
// Mostly 4-px grid. Use semantic names where possible.
export const space = {
  xs: 4, s: 8, m: 14, l: 20, xl: 28, xxl: 40, xxxl: 64,
  // common pad shapes
  screenX: 22,
  screenTopOnboarding: 90,
};

// ─── Radii ───────────────────────────────────────────────────────
export const radius = {
  pill: 100,
  card: 24,
  sheet: 28,
  phone: 64,
  s: 12, m: 18, l: 24,
};

// ─── Shadows / glow recipes ─────────────────────────────────────
// React Native shadow is platform-fragmented. On iOS use shadowColor
// + shadowOpacity. On Android use elevation. Glow effects (the warm
// halo around primary CTAs) are reproduced by stacking views — see
// PrimaryButton.tsx for the technique.
export const shadow = {
  // soft drop under cards
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.30,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  // close, tight shadow under glass pills
  pill: {
    shadowColor: '#000',
    shadowOpacity: 0.40,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // warm halo (around primary CTA) — stack two layers
  warmHalo: {
    shadowColor: '#D8A560',
    shadowOpacity: 0.30,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
};

// ─── Easing — match Reanimated's Easing.bezier ───────────────────
export const easing = {
  out:   [0.22, 1, 0.36, 1] as const,    // generic decel
  inOut: [0.65, 0, 0.35, 1] as const,    // mood transitions
  soft:  [0.4, 0, 0.2, 1] as const,      // material standard
};

// ─── Durations (ms) ──────────────────────────────────────────────
export const duration = {
  fast: 200, base: 350, slow: 600, breath: 4500, // 4.5s = inhale+exhale
};
