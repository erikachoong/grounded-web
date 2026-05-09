import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, Dimensions, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import Orbs from '../components/Orbs';
import Library from '../components/Library';
import Settings from '../components/Settings';
import DeleteModal from '../components/DeleteModal';
import PersonalityModal from '../components/PersonalityModal';
import FolderPickerModal from '../components/FolderPickerModal';
import IntroOverlay from '../components/IntroOverlay';

import { storage } from '../lib/storage';
import { streamMeditation, generateAudio, fetchVoices } from '../lib/api';
import { t } from '../lib/theme';
import { Meditation, Folder, Personality, Voice, AppSettings } from '../lib/types';

type ScreenView = 'home' | 'text' | 'player';

const { width: W } = Dimensions.get('window');

const SUGGESTIONS = [
  'Calm me before a stressful meeting',
  'Body scan to help me fall asleep',
  'Self-compassion when I\'m being hard on myself',
  'Breathwork to come back to the present moment',
  '5-minute morning grounding to start the day',
  'Letting go of something I can\'t control',
  'Soothe my nervous system after a hard day',
  'Visualisation for confidence before something big',
  'Release tension and anxiety after work',
  'Gratitude practice to close the day',
  'Midday reset to clear mental fog',
  'Open heart meditation for loneliness',
  'Ground myself when I feel overwhelmed',
  'Gentle wake-up to ease into the morning',
  'Find stillness when my mind won\'t stop',
  'Releasing guilt and forgiving myself',
];

const DURATIONS = ['5 min', '10 min', '20 min'];

function getSuggestions() {
  const slot = Math.floor(Date.now() / (12 * 60 * 60 * 1000));
  const start = (slot * 4) % SUGGESTIONS.length;
  return Array.from({ length: 4 }, (_, i) => SUGGESTIONS[(start + i) % SUGGESTIONS.length]);
}

function cleanForDisplay(text: string) {
  return text.replace(/\.{3,}/g, '.').replace(/\.+/g, '.').replace(/ \./g, '.').trim();
}

export default function GroundedScreen() {
  const insets = useSafeAreaInsets();

  // ── theme ───────────────────────────────────────────────────────────────
  const [dark, setDark] = useState(false);
  const th = t(dark);

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
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [meditationText, setMeditationText] = useState('');
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

  // ── load persisted state ────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const [lib, fol, per, setts, theme, visited] = await Promise.all([
        storage.getLibrary(),
        storage.getFolders(),
        storage.getPersonalities(),
        storage.getSettings(),
        storage.getTheme(),
        storage.getHasVisited(),
      ]);
      setLibraryState(lib);
      setFoldersState(fol);
      setPersonalitiesState(per);
      setSettingsState(setts);
      setDark(theme === 'dark');
      if (!visited) setShowIntro(true);
    }
    init();

    // Set up audio session for background play
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    // Load voices
    fetchVoices().then(setVoices).catch(() => {});

    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // ── persist helpers ─────────────────────────────────────────────────────
  async function updateLibrary(lib: Meditation[]) {
    setLibraryState(lib);
    await storage.setLibrary(lib);
  }
  async function updateFolders(fol: Folder[]) {
    setFoldersState(fol);
    await storage.setFolders(fol);
  }
  async function updatePersonalities(per: Personality[]) {
    setPersonalitiesState(per);
    await storage.setPersonalities(per);
  }
  async function updateSettings(s: AppSettings) {
    setSettingsState(s);
    await storage.setSettings(s);
  }

  // ── theme toggle ────────────────────────────────────────────────────────
  async function toggleTheme() {
    const next = !dark;
    setDark(next);
    await storage.setTheme(next ? 'dark' : 'light');
  }

  // ── begin meditation ────────────────────────────────────────────────────
  async function begin() {
    const req = requestText.trim();
    if (!req) return;
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    meditationTextRef.current = '';
    setMeditationText('');
    setDisplayText('');
    setIsSaved(false);
    setError(null);
    setIsStreaming(true);
    setView('text');

    try {
      const fullRequest = selectedDuration ? `${req} (${selectedDuration} long)` : req;
      await streamMeditation(
        fullRequest,
        settings.personality,
        (chunk) => {
          meditationTextRef.current += chunk;
          const display = cleanForDisplay(meditationTextRef.current);
          setMeditationText(meditationTextRef.current);
          setDisplayText(display);
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

  // ── speak ───────────────────────────────────────────────────────────────
  async function speak() {
    if (!meditationTextRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoadingAudio(true);
    setError(null);

    try {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;

      const uri = await generateAudio(
        meditationTextRef.current,
        settings.voiceId,
        settings.voiceSpeed,
        settings.voicePause,
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

  // ── toggle play/pause ───────────────────────────────────────────────────
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

  // ── end session ─────────────────────────────────────────────────────────
  async function endSession() {
    await soundRef.current?.stopAsync();
    stopPPBreath();
    setIsPlaying(false);
    setView('text');
  }

  // ── rewrite ─────────────────────────────────────────────────────────────
  function rewrite() {
    abortRef.current?.abort();
    setView('home');
    setSelectedDuration(null);
  }

  // ── save ────────────────────────────────────────────────────────────────
  async function saveMeditation() {
    if (!meditationTextRef.current || !requestText.trim()) return;
    const title = requestText.trim().length > 60
      ? requestText.trim().slice(0, 57) + '…'
      : requestText.trim();
    const entry: Meditation = {
      id: Date.now(),
      title,
      text: meditationTextRef.current,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      folderIds: [],
    };
    await updateLibrary([entry, ...library]);
    setIsSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── library actions ─────────────────────────────────────────────────────
  function playFromLibrary(m: Meditation) {
    meditationTextRef.current = m.text;
    setMeditationText(m.text);
    setDisplayText(cleanForDisplay(m.text));
    setRequestText(m.title);
    setIsSaved(true);
    setShowLibrary(false);
    speak();
  }

  function viewFromLibrary(m: Meditation) {
    meditationTextRef.current = m.text;
    setMeditationText(m.text);
    setDisplayText(cleanForDisplay(m.text));
    setRequestText(m.title);
    setIsSaved(true);
    setShowLibrary(false);
    setView('text');
  }

  async function deleteFromLibrary(id: number) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (deleteTarget === null) return;
    await updateLibrary(library.filter(m => m.id !== deleteTarget));
    setDeleteTarget(null);
  }

  function handleFolder(m: Meditation) {
    setFolderTarget(m);
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

  async function addFolder(name: string) {
    await updateFolders([...folders, { id: Date.now(), name }]);
  }

  async function deleteFolder(id: number) {
    await updateFolders(folders.filter(f => f.id !== id));
    const lib = library.map(m => ({ ...m, folderIds: (m.folderIds ?? []).filter(fid => fid !== id) }));
    await updateLibrary(lib);
  }

  // ── personality actions ─────────────────────────────────────────────────
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
      const updated = { ...settings, personality: '' };
      await updateSettings(updated);
    }
    setShowPersonalityModal(false);
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: th.bg }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Orbs dark={dark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: dark ? 'rgba(255,140,50,0.10)' : 'rgba(255,255,255,0.65)', borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.18)' }]}
            onPress={() => setShowLibrary(true)}
          >
            <Text style={[styles.navBtnText, { color: dark ? 'rgba(255,210,160,0.65)' : 'rgba(28,10,4,0.52)' }]}>Library</Text>
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={[styles.navBtnSquare, { backgroundColor: dark ? 'rgba(255,140,50,0.10)' : 'rgba(255,255,255,0.65)', borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.18)' }]}
              onPress={toggleTheme}
            >
              <Text style={{ fontSize: 18 }}>{dark ? '☀︎' : '☽'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: dark ? 'rgba(255,140,50,0.10)' : 'rgba(255,255,255,0.65)', borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.18)' }]}
              onPress={() => setShowSettings(true)}
            >
              <Text style={[styles.navBtnText, { color: dark ? 'rgba(255,210,160,0.65)' : 'rgba(28,10,4,0.52)' }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── HOME VIEW ──────────────────────────────────────────────────── */}
        {view === 'home' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Title */}
            <View style={styles.titleWrap}>
              <Text style={[styles.appTitle, { color: th.text }]}>Grounded</Text>
              <Text style={[styles.appSubtitle, { color: th.textMuted }]}>
                What do you need today?
              </Text>
            </View>

            {/* Input area pinned to bottom */}
            <View style={{ flex: 1 }} />
            <View style={[styles.inputArea, { backgroundColor: dark ? 'transparent' : 'transparent' }]}>
              {/* Suggestions */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.suggestionsScroll}
                contentContainerStyle={styles.suggestionsContent}
              >
                {suggestions.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, { backgroundColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.65)', borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.18)' }]}
                    onPress={() => setRequestText(s)}
                  >
                    <Text style={[styles.chipText, { color: dark ? 'rgba(255,210,155,0.72)' : 'rgba(28,10,4,0.52)' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Duration chips */}
              <View style={styles.durationRow}>
                {DURATIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.durationChip,
                      {
                        backgroundColor: selectedDuration === d
                          ? (dark ? 'rgba(255,140,50,0.16)' : 'rgba(210,70,15,0.10)')
                          : (dark ? 'rgba(255,140,50,0.07)' : 'rgba(255,255,255,0.55)'),
                        borderColor: selectedDuration === d
                          ? (dark ? 'rgba(255,140,50,0.48)' : 'rgba(210,70,15,0.42)')
                          : (dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.16)'),
                      },
                    ]}
                    onPress={() => setSelectedDuration(selectedDuration === d ? null : d)}
                  >
                    <Text style={[styles.durationChipText, {
                      color: selectedDuration === d
                        ? (dark ? 'rgba(255,200,130,0.95)' : 'rgba(210,70,15,0.92)')
                        : (dark ? 'rgba(255,210,155,0.58)' : 'rgba(28,10,4,0.48)'),
                    }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Textarea */}
              <TextInput
                style={[styles.textarea, { backgroundColor: th.inputBg, borderColor: th.inputBorder, color: th.text }]}
                value={requestText}
                onChangeText={setRequestText}
                placeholder="How are you feeling, or what do you need right now?"
                placeholderTextColor={th.textDim}
                multiline
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={begin}
              />

              {/* Begin button */}
              <TouchableOpacity
                style={[styles.btnBegin, { opacity: requestText.trim() ? 1 : 0.35 }]}
                onPress={begin}
                disabled={!requestText.trim()}
              >
                <Text style={styles.btnBeginText}>Begin</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── TEXT VIEW ──────────────────────────────────────────────────── */}
        {view === 'text' && (
          <View style={{ flex: 1 }}>
            {/* Streaming indicator */}
            {isStreaming && (
              <View style={styles.streamingBadge}>
                <Text style={[styles.streamingText, { color: th.textMuted }]}>✦ Writing your meditation...</Text>
              </View>
            )}

            <ScrollView
              ref={textScrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.textScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.textCard, { backgroundColor: th.cardBg, borderColor: th.cardBorder }]}>
                <Text style={[styles.textBody, { color: dark ? 'rgba(255,225,185,0.78)' : 'rgba(28,10,4,0.75)' }]}>
                  {displayText || (isStreaming ? '' : '')}
                </Text>
              </View>
            </ScrollView>

            {/* Action buttons */}
            {!isStreaming && (
              <View style={styles.textActions}>
                <TouchableOpacity
                  style={[styles.btnSecondary, { backgroundColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.62)', borderColor: dark ? 'rgba(255,140,50,0.20)' : 'rgba(28,10,4,0.12)' }]}
                  onPress={rewrite}
                >
                  <Text style={[styles.btnSecondaryText, { color: th.textMuted }]}>Rewrite</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSecondary, { backgroundColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.62)', borderColor: dark ? 'rgba(225,80,12,0.30)' : 'rgba(210,70,15,0.28)', opacity: isSaved ? 0.45 : 1 }]}
                  onPress={saveMeditation}
                  disabled={isSaved}
                >
                  <Text style={[styles.btnSecondaryText, { color: dark ? 'rgba(255,160,80,0.72)' : 'rgba(210,70,15,0.72)' }]}>
                    {isSaved ? 'Saved ✓' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnListen, { opacity: isLoadingAudio ? 0.5 : 1 }]}
                  onPress={speak}
                  disabled={isLoadingAudio}
                >
                  <Text style={styles.btnListenText}>
                    {isLoadingAudio ? 'Loading...' : 'Listen ▶'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── PLAYER VIEW ────────────────────────────────────────────────── */}
        {view === 'player' && (
          <View style={styles.playerWrap}>
            <Animated.View style={{ transform: [{ scale: ppScale }] }}>
              <TouchableOpacity style={styles.btnPP} onPress={togglePlay}>
                <Text style={styles.btnPPIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={[styles.playerRow, { backgroundColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.70)', borderColor: dark ? 'rgba(255,140,50,0.20)' : 'rgba(200,100,40,0.16)' }]}>
              <Text style={[styles.playerLabel, { color: th.textMuted }]}>
                {isDone ? 'Complete' : isPlaying ? 'Playing' : 'Paused'}
              </Text>
              <TouchableOpacity
                style={[styles.btnEnd, { borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(28,10,4,0.12)' }]}
                onPress={endSession}
              >
                <Text style={[styles.btnEndText, { color: th.textMuted }]}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* ── OVERLAYS ───────────────────────────────────────────────────────── */}
      <Library
        visible={showLibrary}
        dark={dark}
        library={library}
        folders={folders}
        onClose={() => setShowLibrary(false)}
        onPlay={playFromLibrary}
        onView={viewFromLibrary}
        onDelete={deleteFromLibrary}
        onFolder={handleFolder}
        onAddFolder={addFolder}
        onDeleteFolder={deleteFolder}
      />

      <Settings
        visible={showSettings}
        dark={dark}
        voices={voices}
        personalities={personalities}
        settings={settings}
        onClose={() => setShowSettings(false)}
        onSave={updateSettings}
        onNewPersonality={() => {
          setEditingPersonality('new');
          setShowPersonalityModal(true);
        }}
        onEditPersonality={(p) => {
          setEditingPersonality(p);
          setShowPersonalityModal(true);
        }}
      />

      <DeleteModal
        visible={deleteTarget !== null}
        dark={dark}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <PersonalityModal
        visible={showPersonalityModal}
        dark={dark}
        editing={editingPersonality === 'new' ? null : editingPersonality}
        onClose={() => setShowPersonalityModal(false)}
        onSave={savePersonality}
        onDelete={deletePersonality}
      />

      <FolderPickerModal
        visible={folderTarget !== null}
        dark={dark}
        meditation={folderTarget}
        folders={folders}
        onClose={() => setFolderTarget(null)}
        onToggleFolder={toggleFolder}
      />

      {showIntro && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <IntroOverlay
            dark={dark}
            onFinish={async () => {
              setShowIntro(false);
              await storage.setHasVisited();
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navRight: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  navBtnSquare: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: 'rgba(200,40,20,0.10)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: 'rgba(200,40,20,0.85)',
    fontSize: 14,
    textAlign: 'center',
  },

  // ── Home ──
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  appTitle: {
    fontSize: 44,
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 8,
    fontFamily: 'Nunito_300Light',
  },
  appSubtitle: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  suggestionsScroll: {
    flexGrow: 0,
  },
  suggestionsContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 100,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 13,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  btnBegin: {
    backgroundColor: 'rgba(210,70,15,0.92)',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: 'rgba(200,60,10,1)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  btnBeginText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Text view ──
  streamingBadge: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  streamingText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  textScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  textCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
  },
  textBody: {
    fontSize: 16,
    lineHeight: 30,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 0.01,
  },
  textActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 100,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnListen: {
    backgroundColor: 'rgba(210,70,15,0.92)',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 100,
    shadowColor: 'rgba(200,60,10,1)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  btnListenText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Player ──
  playerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  btnPP: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(210,70,15,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(200,60,10,1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  btnPPIcon: {
    color: '#fff',
    fontSize: 26,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
  },
  playerLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  btnEnd: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  btnEndText: {
    fontSize: 12,
  },
});
