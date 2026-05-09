import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

interface OrbsProps {
  dark: boolean;
}

function useBreathing(duration: number, delay: number = 0) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, isInteraction: false }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return anim;
}

export default function Orbs({ dark }: OrbsProps) {
  const breathA = useBreathing(4500);
  const breathB = useBreathing(6500, 800);
  const breathC = useBreathing(3500, 400);

  const opacityA = breathA.interpolate({ inputRange: [0, 1], outputRange: dark ? [0.72, 1.0] : [0.52, 0.86] });
  const opacityB = breathB.interpolate({ inputRange: [0, 1], outputRange: dark ? [0.60, 0.92] : [0.44, 0.76] });
  const opacityC = breathC.interpolate({ inputRange: [0, 1], outputRange: dark ? [0.50, 0.88] : [0.36, 0.70] });

  const scaleA = breathA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const scaleB = breathB.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const scaleC = breathC.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Orb A — large warm orange, top-left */}
      <Animated.View style={[styles.orbA, { opacity: opacityA, transform: [{ scale: scaleA }] }]}>
        <LinearGradient
          colors={
            dark
              ? ['rgba(255,95,10,0.82)', 'rgba(230,55,5,0.42)', 'transparent']
              : ['rgba(255,100,18,0.62)', 'rgba(230,58,8,0.30)', 'transparent']
          }
          start={{ x: 0.38, y: 0.40 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>

      {/* Orb B — deep red, center-right */}
      <Animated.View style={[styles.orbB, { opacity: opacityB, transform: [{ scale: scaleB }] }]}>
        <LinearGradient
          colors={
            dark
              ? ['rgba(210,18,5,0.72)', 'rgba(250,70,15,0.30)', 'transparent']
              : ['rgba(205,20,6,0.52)', 'rgba(248,72,18,0.22)', 'transparent']
          }
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>

      {/* Orb C — golden amber, bottom-right */}
      <Animated.View style={[styles.orbC, { opacity: opacityC, transform: [{ scale: scaleC }] }]}>
        <LinearGradient
          colors={
            dark
              ? ['rgba(255,200,80,0.70)', 'rgba(255,150,40,0.28)', 'transparent']
              : ['rgba(255,210,100,0.60)', 'rgba(255,158,50,0.22)', 'transparent']
          }
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
}

const SIZE_A = Math.max(W, H) * 0.9;
const SIZE_B = Math.max(W, H) * 0.65;
const SIZE_C = Math.max(W, H) * 0.45;

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  orbA: {
    position: 'absolute',
    width: SIZE_A,
    height: SIZE_A,
    borderRadius: SIZE_A / 2,
    left: -SIZE_A * 0.1,
    top: -SIZE_A * 0.2,
    overflow: 'hidden',
  },
  orbB: {
    position: 'absolute',
    width: SIZE_B,
    height: SIZE_B,
    borderRadius: SIZE_B / 2,
    right: -SIZE_B * 0.15,
    top: H * 0.3,
    overflow: 'hidden',
  },
  orbC: {
    position: 'absolute',
    width: SIZE_C,
    height: SIZE_C,
    borderRadius: SIZE_C / 2,
    right: W * 0.1,
    bottom: H * 0.15,
    overflow: 'hidden',
  },
});
