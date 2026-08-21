import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

export default function Orbs() {
  const breathA = useRef(new Animated.Value(0)).current;
  const breathB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(breathA, { toValue: 1, duration: 4500, useNativeDriver: true, isInteraction: false }),
        Animated.timing(breathA, { toValue: 0, duration: 4500, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    const loopB = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(breathB, { toValue: 1, duration: 6500, useNativeDriver: true, isInteraction: false }),
        Animated.timing(breathB, { toValue: 0, duration: 6500, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    loopA.start();
    loopB.start();
    return () => { loopA.stop(); loopB.stop(); };
  }, []);

  const scaleA = breathA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const opacityA = breathA.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0.78] });
  const scaleB = breathB.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const opacityB = breathB.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Bloom — large soft halo */}
      <Animated.View style={[styles.bloom, { opacity: opacityB, transform: [{ scale: scaleB }] }]}>
        <LinearGradient
          colors={['rgba(245,170,140,0.45)', 'rgba(255,210,170,0.18)', 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>
      {/* Core orb — warm peach centre */}
      <Animated.View style={[styles.core, { opacity: opacityA, transform: [{ scale: scaleA }] }]}>
        <LinearGradient
          colors={['rgba(255,210,170,0.90)', 'rgba(245,170,140,0.42)', 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
      </Animated.View>
    </View>
  );
}

const CORE = Math.min(W, H) * 0.68;
const BLOOM = Math.min(W, H) * 1.3;

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', borderRadius: 9999 },
  core: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    left: (W - CORE) / 2,
    top: (H - CORE) / 2,
    overflow: 'hidden',
  },
  bloom: {
    position: 'absolute',
    width: BLOOM,
    height: BLOOM,
    borderRadius: BLOOM / 2,
    left: (W - BLOOM) / 2,
    top: (H - BLOOM) / 2,
    overflow: 'hidden',
  },
});
