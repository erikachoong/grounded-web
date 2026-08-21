// components/GlassButton.tsx — frosted pill (suggestion + time chips).
//
// Mirrors §1 (Glass Pill) in BUTTONS.md. Uses BlurView for the frost,
// stacked overlays for the bevel highlights and the bottom-right shadow.

import React from 'react';
import { Pressable, Text, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type as t, radius } from '../theme/tokens';
import { familyForWeight } from '../theme/fonts';

interface Props {
  label: string;
  onPress: () => void;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassButton({ label, onPress, active = false, style }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.wrapper,
      style,
      pressed && { opacity: 0.85 },
    ]}>
      <BlurView intensity={28} tint="dark" style={styles.blur}>
        {/* diagonal gradient fill — top-left lit, bottom-right dimmer */}
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.07)',
            'rgba(255,255,255,0.025)',
            'rgba(0,0,0,0.04)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* top + left highlight rim */}
        <View style={styles.topRim} />
        <View style={styles.leftRim} />
        {/* bottom + right shadow rim */}
        <View style={styles.bottomRim} />
        <View style={styles.rightRim} />

        <Text style={[
          styles.label,
          active && { color: colors.warmInk },
        ]}>
          {label}
        </Text>
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  blur: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRim: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  leftRim: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottomRim: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  rightRim: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  label: {
    fontFamily: familyForWeight('300'),
    fontSize: t.meta.fontSize,
    color: colors.ink,
    letterSpacing: 0.3,
  },
});
