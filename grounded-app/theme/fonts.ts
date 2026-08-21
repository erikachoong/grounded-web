// theme/fonts.ts — load Inter Tight at the weights we use.
//
// Used in app/_layout.tsx via useFonts(...).

import {
  InterTight_200ExtraLight,
  InterTight_300Light,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight';

export const fontMap = {
  InterTight_200ExtraLight,
  InterTight_300Light,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
};

// Map our weight strings to the actual loaded family name.
export const familyForWeight = (w?: string | number) => {
  switch (String(w)) {
    case '200': return 'InterTight_200ExtraLight';
    case '300': return 'InterTight_300Light';
    case '400': return 'InterTight_400Regular';
    case '500': return 'InterTight_500Medium';
    case '600': return 'InterTight_600SemiBold';
    default:    return 'InterTight_300Light';
  }
};
