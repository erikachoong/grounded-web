import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';
import { Personality, Voice, AppSettings } from '../lib/types';

interface SettingsProps {
  visible: boolean;
  dark: boolean;
  voices: Voice[];
  personalities: Personality[];
  settings: AppSettings;
  onClose: () => void;
  onSave: (s: AppSettings) => void;
  onNewPersonality: () => void;
  onEditPersonality: (p: Personality) => void;
}

export default function Settings({
  visible, dark, voices, personalities, settings, onClose, onSave, onNewPersonality, onEditPersonality,
}: SettingsProps) {
  const [local, setLocal] = React.useState<AppSettings>(settings);
  const th = t(dark);

  React.useEffect(() => {
    if (visible) setLocal(settings);
  }, [visible, settings]);

  const speedSteps = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
  const pauseSteps = [1, 2, 3, 4];
  const speedLabel = (v: number) => v.toFixed(1) + '×';
  const pauseLabel = (v: number) => ['Short', 'Medium', 'Long', 'Very long'][v - 1] ?? String(v);

  function chip(label: string, active: boolean, onPress: () => void) {
    return (
      <TouchableOpacity
        key={label}
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: active ? (dark ? 'rgba(255,140,50,0.18)' : 'rgba(210,70,15,0.10)') : (dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.70)'),
            borderColor: active ? (dark ? 'rgba(255,140,50,0.50)' : 'rgba(210,70,15,0.42)') : (dark ? 'rgba(255,140,50,0.20)' : 'rgba(200,100,40,0.22)'),
          },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? 'rgba(210,70,15,0.90)' : th.textMuted }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: dark ? 'rgba(18,8,3,0.97)' : 'rgba(255,252,248,0.97)', borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.15)' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: th.text }]}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: dark ? 'rgba(255,140,50,0.20)' : 'rgba(28,10,4,0.12)' }]}>
              <Text style={{ color: th.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Voice */}
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>VOICE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {voices.map(v =>
                chip(v.name + (v.labels?.accent ? ' · ' + v.labels.accent : ''), local.voiceId === v.voice_id, () =>
                  setLocal(s => ({ ...s, voiceId: v.voice_id })),
                ),
              )}
            </ScrollView>

            {/* Speed */}
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>SPEED</Text>
            <View style={styles.chipRow}>
              {speedSteps.map(v =>
                chip(speedLabel(v), local.voiceSpeed === v, () => setLocal(s => ({ ...s, voiceSpeed: v }))),
              )}
            </View>

            {/* Pauses */}
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>PAUSES</Text>
            <View style={styles.chipRow}>
              {pauseSteps.map(v =>
                chip(pauseLabel(v), local.voicePause === v, () => setLocal(s => ({ ...s, voicePause: v }))),
              )}
            </View>

            {/* Personality */}
            <Text style={[styles.sectionLabel, { color: th.textMuted }]}>TONE</Text>
            <View style={styles.personalityGrid}>
              {personalities.map(p => (
                <View key={p.id} style={[styles.personalityBubble, {
                  backgroundColor: p.text === local.personality ? (dark ? 'rgba(255,140,50,0.18)' : 'rgba(210,70,15,0.10)') : (dark ? 'rgba(255,140,50,0.07)' : 'rgba(255,255,255,0.65)'),
                  borderColor: p.text === local.personality ? (dark ? 'rgba(255,140,50,0.50)' : 'rgba(210,70,15,0.42)') : (dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.20)'),
                }]}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setLocal(s => ({ ...s, personality: p.text === s.personality ? '' : p.text }))}
                  >
                    <Text style={[styles.bubbleLabel, { color: p.text === local.personality ? 'rgba(210,70,15,0.90)' : th.textMuted }]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onEditPersonality(p)} style={styles.editBtn}>
                    <Text style={{ color: th.textDim, fontSize: 14 }}>✎</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addPersonality, { borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.25)' }]}
                onPress={onNewPersonality}
              >
                <Text style={[styles.addPersonalityText, { color: th.textDim }]}>+ new tone</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => { onSave(local); onClose(); }}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 44,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 13,
  },
  personalityGrid: {
    gap: 8,
    marginBottom: 8,
  },
  personalityBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  bubbleLabel: {
    fontSize: 14,
  },
  editBtn: {
    padding: 8,
  },
  addPersonality: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addPersonalityText: {
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: 'rgba(210,70,15,0.92)',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
