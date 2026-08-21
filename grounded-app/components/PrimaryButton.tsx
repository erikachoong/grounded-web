// components/PrimaryButton.tsx — warm halo CTA.
//
// Mirrors §2 (Primary CTA) in BUTTONS.md. Dark indigo glass with thin amber
// outline + radial inner glow + outer halo. Used for "listen", "begin",
// "save" — at most one per screen.

import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, type as t, radius } from '../theme/tokens';
import { familyForWeight } from '../theme/fonts';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({ label, onPress, disabled, style }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrapper,
        style,
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {/* outer halo — soft amber bloom around the button */}
      <View style={styles.halo} pointerEvents="none" />

      <View style={styles.body}>
        {/* inner amber radial glow */}
        <LinearGradient
          colors={[
            'rgba(232,180,110,0.42)',
            'rgba(232,180,110,0.10)',
            'rgba(20,16,38,0.55)',
          ]}
          start={{ x: 0.5, y: 1.2 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
  },
  halo: {
    position: 'absolute',
    top: -10, bottom: -10, left: -10, right: -10,
    borderRadius: radius.pill,
    shadowColor: '#D8A560',
    shadowOpacity: 0.30,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'transparent',
  },
  body: {
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(232,180,110,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(20,16,38,0.55)',
  },
  label: {
    fontFamily: familyForWeight('400'),
    fontSize: t.button.fontSize,
    color: colors.warmInk,
    letterSpacing: t.button.letterSpacing,
  },
});
