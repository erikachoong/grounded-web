export const C = {
  // Brand
  flame: 'rgba(210,70,15,0.92)',
  flameSoft: 'rgba(210,70,15,0.10)',
  flameBorder: 'rgba(210,70,15,0.35)',

  // Light theme
  bgLight: '#fffaf6',
  textLight: 'rgba(28,10,4,0.84)',
  textMutedLight: 'rgba(28,10,4,0.42)',
  textDimLight: 'rgba(28,10,4,0.28)',
  cardBgLight: 'rgba(255,255,255,0.72)',
  cardBorderLight: 'rgba(200,100,40,0.14)',
  inputBgLight: 'rgba(255,255,255,0.75)',
  inputBorderLight: 'rgba(200,100,40,0.18)',

  // Dark theme
  bgDark: '#0d0704',
  textDark: 'rgba(255,230,200,0.88)',
  textMutedDark: 'rgba(255,200,140,0.55)',
  textDimDark: 'rgba(255,200,140,0.28)',
  cardBgDark: 'rgba(255,140,50,0.06)',
  cardBorderDark: 'rgba(255,140,50,0.14)',
  inputBgDark: 'rgba(255,140,50,0.07)',
  inputBorderDark: 'rgba(255,140,50,0.20)',
} as const;

export function t(dark: boolean) {
  return {
    bg: dark ? C.bgDark : C.bgLight,
    text: dark ? C.textDark : C.textLight,
    textMuted: dark ? C.textMutedDark : C.textMutedLight,
    textDim: dark ? C.textDimDark : C.textDimLight,
    cardBg: dark ? C.cardBgDark : C.cardBgLight,
    cardBorder: dark ? C.cardBorderDark : C.cardBorderLight,
    inputBg: dark ? C.inputBgDark : C.inputBgLight,
    inputBorder: dark ? C.inputBorderDark : C.inputBorderLight,
  };
}
