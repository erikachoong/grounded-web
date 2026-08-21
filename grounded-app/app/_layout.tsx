import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { fontMap } from '../theme/fonts';
import { colors } from '../theme/tokens';
import Orbs from '../components/Orbs';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [loaded] = useFonts(fontMap);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.root}>
        {/* Deep indigo gradient — bg2 top-left → bg0 bottom-right */}
        <LinearGradient
          colors={[colors.bg2, colors.bg1, colors.bg0]}
          start={{ x: 0.18, y: 0.08 }}
          end={{ x: 0.85, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Persistent warm orb */}
        <Orbs />

        {/* Veil so text reads over orb */}
        <LinearGradient
          colors={['rgba(20,15,40,0.40)', 'rgba(20,15,40,0.05)', 'rgba(20,15,40,0.55)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }} />

        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg0 },
});
