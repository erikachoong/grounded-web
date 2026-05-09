import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';

const SLIDES = [
  {
    tag: 'Welcome',
    title: 'Your personal\nmeditation guide',
    body: 'Grounded writes a unique guided meditation just for you — spoken aloud by a calm, warm voice.\n\nTell it how you\'re feeling, what you need, or pick a suggestion.',
  },
  {
    tag: 'How it works',
    title: 'Written by AI,\nfelt by you',
    body: 'Type anything — "help me sleep", "calm my anxiety", "morning grounding". Claude writes a bespoke meditation in seconds.\n\nThen ElevenLabs reads it aloud, slowly and softly.',
  },
  {
    tag: 'Your library',
    title: 'Save what\nresonates',
    body: 'Meditations you love can be saved to your library and played again any time.\n\nOrganise them into folders, choose your favourite voice, adjust pace.',
  },
];

interface IntroOverlayProps {
  dark: boolean;
  onFinish: () => void;
}

export default function IntroOverlay({ dark, onFinish }: IntroOverlayProps) {
  const [slide, setSlide] = useState(0);
  const th = t(dark);
  const isLast = slide === SLIDES.length - 1;
  const s = SLIDES[slide];

  return (
    <BlurView
      intensity={80}
      tint={dark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.inner}>
        <Text style={styles.flame}>🔥</Text>

        <View style={[styles.card, { backgroundColor: dark ? 'rgba(16,8,3,0.92)' : 'rgba(255,252,248,0.95)', borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.14)' }]}>
          <Text style={[styles.tag, { color: 'rgba(210,90,20,0.55)' }]}>{s.tag}</Text>
          <Text style={[styles.title, { color: th.text }]}>{s.title}</Text>
          <Text style={[styles.body, { color: th.textMuted }]}>{s.body}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, {
                backgroundColor: i === slide ? 'rgba(200,90,20,0.70)' : 'rgba(200,90,20,0.18)',
                transform: [{ scale: i === slide ? 1.3 : 1 }],
              }]}
            />
          ))}
        </View>

        {/* Nav */}
        <View style={styles.nav}>
          {slide > 0 && (
            <TouchableOpacity onPress={() => setSlide(s => s - 1)} style={styles.btnBack}>
              <Text style={[styles.btnBackText, { color: th.textMuted }]}>← Back</Text>
            </TouchableOpacity>
          )}
          {!isLast && (
            <TouchableOpacity onPress={onFinish} style={styles.btnSkip}>
              <Text style={[styles.btnSkipText, { color: th.textDim }]}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnNext} onPress={isLast ? onFinish : () => setSlide(s => s + 1)}>
            <Text style={styles.btnNextText}>{isLast ? "Let's go" : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  flame: {
    fontSize: 52,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 28,
    gap: 10,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  body: {
    fontSize: 14.5,
    lineHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nav: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  btnBack: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  btnBackText: {
    fontSize: 15,
  },
  btnSkip: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  btnSkipText: {
    fontSize: 14,
  },
  btnNext: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(210,70,15,0.92)',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  btnNextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
