import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, Dimensions, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import Library from '../components/Library';
import Settings from '../components/Settings';
import DeleteModal from '../components/DeleteModal';
import PersonalityModal from '../components/PersonalityModal';
import FolderPickerModal from '../components/FolderPickerModal';
import IntroOverlay from '../components/IntroOverlay';
import { GlassButton } from '../components/GlassButton';
import { PrimaryButton } from '../components/PrimaryButton';

import { storage } from '../lib/storage';
import { streamMeditation, generateAudio, fetchVoices } from '../lib/api';
import { colors, type as ty, space, radius } from '../theme/tokens';
import { familyForWeight } from '../theme/fonts';
import { Meditation, Folder, Personality, Voice, AppSettings } from '../lib/types';

type ScreenView = 'home' | 'text' | 'player';

const { width: W } = Dimensions.get('window');

const ALL_SUGGESTIONS = [
  'a soft place to land after a hard day',
  "I'm tired but my mind won't stop",
  'help me come back into my body',
  'something to start the morning gently',
  'calm me before a stressful meeting',
  'body scan to help me fall asleep',
  'breathwork to come back to the present moment',
  'letting go of something I can\'t control',
  'release tension and anxiety after work',
  'open heart meditation for loneliness',
  'find stillness when my mind won\'t stop',
  'releasing guilt and forgiving myself',
];

const DURATIONS = [1, 3, 5, 10];

function getSuggestions() {
  const slot = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  const start = (slot * 4) % ALL_SUGGESTIONS.length;
  return Array.from({ length: 4 }, (_, i) => ALL_SUGGESTIONS[(start + i) % ALL_SUGGESTIONS.length]);
}

function cleanForDisplay(text: string) {
  return text.replace(/\.{3,}/g, '.').replace(/\.+/g, '.').replace(/ \./g, '.').trim();
}

export default function GroundedScreen() {
  // ── views ───────────────────────────────────────────────────────────────
  const [view, setView] = useState<ScreenView>('home');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // ── modals ──────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [editingPersonality, setEditingPersonality] = useState<Personality | null | 'new'>('new');
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [folderTarget, setFolderTarget] = useState<Meditation | null>(null);

  // ── data ────────────────────────────────────────────────────────────────
  const [library, setLibraryState] = useState<Meditation[]>([]);
  const [folders, setFoldersState] = useState<Folder[]>([]);
  const [personalities, setPersonalitiesState] = useState<Personality[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>({
    voiceId: 'atEhNo1k29EZslpsboHA',
    voiceSpeed: 0.7,
    voicePause: 2,
    personality: '',
  });

  // ── meditation state ────────────────────────────────────────────────────
  const [requestText, setRequestText] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(5);
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions] = useState(getSuggestions);

  const abortRef = useRef<AbortController | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const meditationTextRef = useRef('');
  const textScrollRef = useRef<ScrollView>(null);

  // ── player animation ────────────────────────────────────────────────────
  const ppBreath = useRef(new Animated.Value(0)).current;
  const ppBreathAnim = useRef<Animated.CompositeAnimation | null>(null);

  function startPPBreath() {
    ppBreathAnim.current?.stop();
    ppBreathAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(ppBreath, { toValue: 1, duration: 2250, useNativeDriver: true }),
        Animated.timing(ppBreath, { toValue: 0, duration: 2250, useNativeDriver: true }),
      ]),
    );
    ppBreathAnim.current.start();
  }
  function stopPPBreath() {
    ppBreathAnim.current?.stop();
    ppBreath.setValue(0);
  }
  const ppScale = ppBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.13] });

  // ── init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [lib, fol, per, setts, visited] = await Promise.all([
        storage.getLibrary(),
        storage.getFolders(),
        storage.getPersonalities(),
        storage.getSettings(),
        storage.getHasVisited(),
      ]);
      setLibraryState(lib);
      setFoldersState(fol);
      setPersonalitiesState(per);
      setSettingsState(setts);
      if (!visited) setShowIntro(true);
    }
    init();
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    fetchVoices().then(setVoices).catch(() => {});
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  // ── persist helpers ──────────────────────────────────────────────────────
  async function updateLibrary(lib: Meditation[]) { setLibraryState(lib); await storage.setLibrary(lib); }
  async function updateFolders(fol: Folder[]) { setFoldersState(fol); await storage.setFolders(fol); }
  async function updatePersonalities(per: Personality[]) { setPersonalitiesState(per); await storage.setPersonalities(per); }
  async function updateSettings(s: AppSettings) { setSettingsState(s); await storage.setSettings(s); }

  // ── begin ────────────────────────────────────────────────────────────────
  async function begin() {
    const req = requestText.trim();
    if (!req) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    meditationTextRef.current = '';
    setDisplayText('');
    setIsSaved(false);
    setError(null);
    setIsStreaming(true);
    setView('text');

    try {
      const fullRequest = `${req} (${selectedDuration} min long)`;
      await streamMeditation(
        fullRequest,
        settings.personality,
        (chunk) => {
          meditationTextRef.current += chunk;
          setDisplayText(cleanForDisplay(meditationTextRef.current));
          setTimeout(() => textScrollRef.current?.scrollToEnd({ animated: true }), 50);
        },
        abortRef.current.signal,
      );
      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Something went wrong');
      setIsStreaming(false);
      setView('home');
    }
  }

  // ── speak ────────────────────────────────────────────────────────────────
  async function speak() {
    if (!meditationTextRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoadingAudio(true);
    setError(null);
    try {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      const uri = await generateAudio(
        meditationTextRef.current, settings.voiceId, settings.voiceSpeed, settings.voicePause,
      );
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setIsDone(true);
            stopPPBreath();
          }
        },
      );
      soundRef.current = sound;
      setIsLoadingAudio(false);
      setIsPlaying(true);
      setIsDone(false);
      setView('player');
      startPPBreath();
    } catch (err: any) {
      setIsLoadingAudio(false);
      setError(err.message ?? 'Could not create audio');
    }
  }

  async function togglePlay() {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      stopPPBreath();
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      startPPBreath();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function endSession() {
    await soundRef.current?.stopAsync();
    stopPPBreath();
    setIsPlaying(false);
    setView('text');
  }

  function rewrite() {
    abortRef.current?.abort();
    setView('home');
  }

  async function saveMeditation() {
    if (!meditationTextRef.current || !requestText.trim()) return;
    const title = requestText.trim().length > 60
      ? requestText.trim().slice(0, 57) + '…'
      : requestText.trim();
    const entry: Meditation = {
      id: Date.now(), title,
      text: meditationTextRef.current,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      folderIds: [],
    };
    await updateLibrary([entry, ...library]);
    setIsSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── library ───────────────────────────────────────────────────────────────
  function playFromLibrary(m: Meditation) {
    meditationTextRef.current = m.text;
    setDisplayText(cleanForDisplay(m.text));
    setRequestText(m.title);
    setIsSaved(true);
    setShowLibrary(false);
    speak();
  }
  function viewFromLibrary(m: Meditation) {
    meditationTextRef.current = m.text;
    setDisplayText(cleanForDisplay(m.text));
    setRequestText(m.title);
    setIsSaved(true);
    setShowLibrary(false);
    setView('text');
  }
  async function confirmDelete() {
    if (deleteTarget === null) return;
    await updateLibrary(library.filter(m => m.id !== deleteTarget));
    setDeleteTarget(null);
  }
  async function toggleFolder(medId: number, folderId: number) {
    const lib = library.map(m => {
      if (m.id !== medId) return m;
      const ids = m.folderIds ?? [];
      const idx = ids.indexOf(folderId);
      return { ...m, folderIds: idx === -1 ? [...ids, folderId] : ids.filter(id => id !== folderId) };
    });
    await updateLibrary(lib);
    setFolderTarget(lib.find(m => m.id === medId) ?? null);
  }
  async function addFolder(name: string) { await updateFolders([...folders, { id: Date.now(), name }]); }
  async function deleteFolder(id: number) {
    await updateFolders(folders.filter(f => f.id !== id));
    await updateLibrary(library.map(m => ({ ...m, folderIds: (m.folderIds ?? []).filter(fid => fid !== id) })));
  }
  async function savePersonality(p: Personality) {
    const list = editingPersonality && editingPersonality !== 'new'
      ? personalities.map(x => x.id === p.id ? p : x)
      : [...personalities, p];
    await updatePersonalities(list);
    setShowPersonalityModal(false);
  }
  async function deletePersonality(id: string) {
    await updatePersonalities(personalities.filter(p => p.id !== id));
    if (settings.personality === personalities.find(p => p.id === id)?.text) {
      await updateSettings({ ...settings, personality: '' });
    }
    setShowPersonalityModal(false);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Nav */}
        <View style={styles.nav}>
          <GlassButton label="Library" onPress={() => setShowLibrary(true)} />
          <GlassButton label="Settings" onPress={() => setShowSettings(true)} />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── HOME ─────────────────────────────────────────────────────────── */}
        {view === 'home' && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.homeScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Greeting */}
              <Text style={styles.greeting}>Grounded</Text>
              <Text style={styles.greetingSub}>What do you need today?</Text>

              {/* Input box */}
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={requestText}
                  onChangeText={setRequestText}
                  placeholder="say what's going on…"
                  placeholderTextColor={colors.inkFaint}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={begin}
                />
                <TouchableOpacity
                  onPress={begin}
                  disabled={!requestText.trim()}
                  style={[styles.sendBtn, requestText.trim() && styles.sendBtnActive]}
                >
                  <Text style={[styles.sendArrow, requestText.trim() && { color: colors.warmInk }]}>↑</Text>
                </TouchableOpacity>
              </View>

              {/* Duration chips */}
              <View style={styles.durationsRow}>
                {DURATIONS.map(d => (
                  <GlassButton
                    key={d}
                    label={`${d} min`}
                    onPress={() => setSelectedDuration(d)}
                    active={selectedDuration === d}
                  />
                ))}
              </View>

              {/* Suggestion pills */}
              <View style={styles.suggestionsWrap}>
                {suggestions.map(s => (
                  <GlassButton
                    key={s}
                    label={s}
                    onPress={() => setRequestText(s)}
                    style={{ alignSelf: 'flex-start' }}
                  />
                ))}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ── TEXT (generating + reading) ──────────────────────────────────── */}
        {view === 'text' && (
          <View style={{ flex: 1 }}>
            {isStreaming && (
              <View style={styles.streamingBadge}>
                <Text style={styles.streamingText}>✦ writing your meditation…</Text>
              </View>
            )}
            <ScrollView
              ref={textScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.textScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.textBody}>{displayText}</Text>
            </ScrollView>
            {!isStreaming && (
              <View style={styles.textActions}>
                <GlassButton label="Rewrite" onPress={rewrite} />
                <GlassButton
                  label={isSaved ? 'Saved ✓' : 'Save'}
                  onPress={saveMeditation}
                  active={isSaved}
                />
                <PrimaryButton
                  label={isLoadingAudio ? 'Loading…' : 'Listen'}
                  onPress={speak}
                  disabled={isLoadingAudio}
                />
              </View>
            )}
          </View>
        )}

        {/* ── PLAYER ───────────────────────────────────────────────────────── */}
        {view === 'player' && (
          <View style={styles.playerWrap}>
            <Animated.View style={{ transform: [{ scale: ppScale }] }}>
              <PrimaryButton
                label={isPlaying ? '⏸' : '▶'}
                onPress={togglePlay}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
            </Animated.View>
            <Text style={styles.playerStatus}>
              {isDone ? 'complete' : isPlaying ? 'playing' : 'paused'}
            </Text>
            <GlassButton label="End" onPress={endSession} />
          </View>
        )}
      </SafeAreaView>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      <Library
        visible={showLibrary} dark={true} library={library} folders={folders}
        onClose={() => setShowLibrary(false)}
        onPlay={playFromLibrary} onView={viewFromLibrary}
        onDelete={(id) => setDeleteTarget(id)} onFolder={(m) => setFolderTarget(m)}
        onAddFolder={addFolder} onDeleteFolder={deleteFolder}
      />
      <Settings
        visible={showSettings} dark={true} voices={voices}
        personalities={personalities} settings={settings}
        onClose={() => setShowSettings(false)} onSave={updateSettings}
        onNewPersonality={() => { setEditingPersonality('new'); setShowPersonalityModal(true); }}
        onEditPersonality={(p) => { setEditingPersonality(p); setShowPersonalityModal(true); }}
      />
      <DeleteModal
        visible={deleteTarget !== null} dark={true}
        onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete}
      />
      <PersonalityModal
        visible={showPersonalityModal} dark={true}
        editing={editingPersonality === 'new' ? null : editingPersonality}
        onClose={() => setShowPersonalityModal(false)}
        onSave={savePersonality} onDelete={deletePersonality}
      />
      <FolderPickerModal
        visible={folderTarget !== null} dark={true}
        meditation={folderTarget} folders={folders}
        onClose={() => setFolderTarget(null)} onToggleFolder={toggleFolder}
      />
      {showIntro && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <IntroOverlay
            dark={true}
            onFinish={async () => { setShowIntro(false); await storage.setHasVisited(); }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.screenX,
    paddingTop: 8,
    paddingBottom: 4,
  },

  errorBanner: {
    marginHorizontal: space.screenX,
    marginTop: 8,
    backgroundColor: 'rgba(200,40,20,0.12)',
    borderRadius: radius.m,
    padding: 12,
  },
  errorText: { color: 'rgba(255,120,100,0.90)', fontSize: 14, textAlign: 'center' },

  // ── Home ──
  homeScroll: {
    padding: space.screenX,
    paddingTop: 60,
    gap: space.m,
  },
  greeting: {
    fontFamily: familyForWeight('200'),
    fontSize: 38, fontWeight: '200',
    letterSpacing: -0.8, lineHeight: 42,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  greetingSub: {
    fontFamily: familyForWeight('300'),
    fontSize: 14.5, color: colors.inkMute,
    textAlign: 'center', marginBottom: space.m,
  },
  inputWrap: {
    backgroundColor: colors.surface,
    borderColor: colors.hairline, borderWidth: 1,
    borderRadius: radius.l,
    minHeight: 80, padding: 16, paddingRight: 56,
  },
  input: {
    fontFamily: familyForWeight('300'),
    fontSize: 15, color: colors.ink, lineHeight: 22, minHeight: 48,
  },
  sendBtn: {
    position: 'absolute', right: 8, bottom: 8,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.hairline,
  },
  sendBtnActive: {
    backgroundColor: 'rgba(20,16,38,0.65)',
    borderColor: colors.warmBorder,
  },
  sendArrow: { color: colors.inkMute, fontSize: 16 },
  durationsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // ── Text view ──
  streamingBadge: { alignSelf: 'center', marginVertical: 12 },
  streamingText: {
    fontFamily: familyForWeight('300'),
    fontSize: 13, color: colors.inkMute, letterSpacing: 0.4,
  },
  textScrollContent: { padding: space.screenX, paddingBottom: 40 },
  textBody: {
    fontFamily: familyForWeight('300'),
    fontSize: 16, lineHeight: 30,
    color: colors.inkSoft, letterSpacing: 0.05,
  },
  textActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: space.screenX,
    paddingBottom: 20, paddingTop: 8,
    flexWrap: 'wrap', justifyContent: 'center',
  },

  // ── Player ──
  playerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l,
  },
  playerStatus: {
    fontFamily: familyForWeight('300'),
    fontSize: 13, color: colors.inkMute, letterSpacing: 0.4,
  },
});
