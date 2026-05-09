import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';
import { Meditation, Folder } from '../lib/types';

interface LibraryProps {
  visible: boolean;
  dark: boolean;
  library: Meditation[];
  folders: Folder[];
  onClose: () => void;
  onPlay: (m: Meditation) => void;
  onView: (m: Meditation) => void;
  onDelete: (id: number) => void;
  onFolder: (m: Meditation) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: number) => void;
}

export default function Library({ visible, dark, library, folders, onClose, onPlay, onView, onDelete, onFolder, onAddFolder, onDeleteFolder }: LibraryProps) {
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const th = t(dark);

  const filtered = currentFolderId === null
    ? library
    : library.filter(m => (m.folderIds ?? []).includes(currentFolderId));

  function confirmCreate() {
    const name = newFolderName.trim();
    if (name) onAddFolder(name);
    setCreatingFolder(false);
    setNewFolderName('');
  }

  function renderCard({ item: m }: { item: Meditation }) {
    const cardFolders = (m.folderIds ?? [])
      .map(fid => folders.find(f => f.id === fid))
      .filter(Boolean) as Folder[];

    return (
      <View style={[styles.card, { backgroundColor: th.cardBg, borderColor: th.cardBorder }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.cardTitle, { color: th.text }]} numberOfLines={1}>{m.title}</Text>
          <Text style={[styles.cardDate, { color: th.textDim }]}>{m.date}</Text>
          {cardFolders.length > 0 && (
            <View style={styles.badges}>
              {cardFolders.map(f => (
                <View key={f.id} style={[styles.badge, { backgroundColor: dark ? 'rgba(255,140,50,0.10)' : 'rgba(210,70,15,0.08)', borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(210,70,15,0.18)' }]}>
                  <Text style={[styles.badgeText, { color: dark ? 'rgba(255,180,90,0.65)' : 'rgba(210,70,15,0.65)' }]}>{f.name}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.cardPreview, { color: th.textMuted }]} numberOfLines={2}>
            {m.text.replace(/\.{3,}/g, '.').slice(0, 120)}…
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.btnPlay} onPress={() => onPlay(m)}>
            <Text style={styles.btnPlayText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { borderColor: dark ? 'rgba(255,140,50,0.20)' : 'rgba(28,10,4,0.14)' }]} onPress={() => onView(m)}>
            <Text style={[styles.btnGhostText, { color: th.textMuted }]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnIcon, { borderColor: dark ? 'rgba(255,140,50,0.14)' : 'rgba(28,10,4,0.10)' }]} onPress={() => onFolder(m)}>
            <Text style={{ fontSize: 14, color: th.textDim }}>⊕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnIcon, { borderColor: dark ? 'rgba(255,140,50,0.14)' : 'rgba(28,10,4,0.10)' }]} onPress={() => onDelete(m.id)}>
            <Text style={{ fontSize: 14, color: th.textDim }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: th.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: dark ? 'rgba(255,140,50,0.10)' : 'rgba(200,100,40,0.10)' }]}>
          <Text style={[styles.headerTitle, { color: th.text }]}>Library</Text>
          <TouchableOpacity style={[styles.closeBtn, { borderColor: dark ? 'rgba(255,140,50,0.20)' : 'rgba(28,10,4,0.12)' }]} onPress={onClose}>
            <Text style={{ color: th.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Folder bar */}
        <View style={[styles.folderBar, { borderBottomColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(200,100,40,0.08)' }]}>
          <TouchableOpacity
            style={[styles.folderChip, {
              backgroundColor: currentFolderId === null ? (dark ? 'rgba(255,140,50,0.15)' : 'rgba(210,70,15,0.10)') : (dark ? 'rgba(255,140,50,0.07)' : 'rgba(255,255,255,0.72)'),
              borderColor: currentFolderId === null ? (dark ? 'rgba(255,140,50,0.40)' : 'rgba(210,70,15,0.35)') : (dark ? 'rgba(255,140,50,0.16)' : 'rgba(200,100,40,0.14)'),
            }]}
            onPress={() => setCurrentFolderId(null)}
          >
            <Text style={[styles.folderChipText, { color: currentFolderId === null ? 'rgba(210,70,15,0.90)' : th.textMuted }]}>All</Text>
          </TouchableOpacity>

          {folders.map(f => (
            <View key={f.id} style={[styles.folderChipWrap, {
              backgroundColor: currentFolderId === f.id ? (dark ? 'rgba(255,140,50,0.15)' : 'rgba(210,70,15,0.10)') : (dark ? 'rgba(255,140,50,0.07)' : 'rgba(255,255,255,0.72)'),
              borderColor: currentFolderId === f.id ? (dark ? 'rgba(255,140,50,0.40)' : 'rgba(210,70,15,0.35)') : (dark ? 'rgba(255,140,50,0.16)' : 'rgba(200,100,40,0.14)'),
            }]}>
              <TouchableOpacity onPress={() => setCurrentFolderId(currentFolderId === f.id ? null : f.id)}>
                <Text style={[styles.folderChipText, { color: currentFolderId === f.id ? 'rgba(210,70,15,0.90)' : th.textMuted }]}>{f.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onDeleteFolder(f.id); if (currentFolderId === f.id) setCurrentFolderId(null); }} style={styles.folderDel}>
                <Text style={{ fontSize: 10, color: th.textDim }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {creatingFolder ? (
            <View style={styles.folderCreate}>
              <TextInput
                style={[styles.folderInput, { color: th.text, borderColor: 'rgba(210,70,15,0.40)' }]}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Folder name"
                placeholderTextColor={th.textDim}
                autoFocus
                maxLength={30}
                onSubmitEditing={confirmCreate}
              />
              <TouchableOpacity onPress={confirmCreate}><Text style={{ color: 'rgba(210,70,15,0.75)', fontSize: 16 }}>✓</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setCreatingFolder(false); setNewFolderName(''); }}><Text style={{ color: th.textDim, fontSize: 14 }}>✕</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addFolderBtn, { borderColor: dark ? 'rgba(255,140,50,0.22)' : 'rgba(200,100,40,0.25)' }]}
              onPress={() => setCreatingFolder(true)}
            >
              <Text style={[styles.addFolderText, { color: th.textDim }]}>+ new folder</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: th.textDim }]}>
              {currentFolderId !== null
                ? 'No meditations in this folder yet.\nUse ⊕ on a card to move one here.'
                : 'No saved meditations yet.\nWrite one and hit Save.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={m => String(m.id)}
            renderItem={renderCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  folderChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
  },
  folderChipText: {
    fontSize: 13,
  },
  folderChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 7,
    gap: 4,
  },
  folderDel: {
    padding: 3,
  },
  addFolderBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addFolderText: {
    fontSize: 12,
  },
  folderCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folderInput: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    width: 120,
  },
  list: {
    padding: 20,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 12,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
  },
  cardPreview: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnPlay: {
    backgroundColor: 'rgba(210,70,15,0.88)',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 100,
  },
  btnPlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  btnGhost: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
  },
  btnGhostText: {
    fontSize: 13,
  },
  btnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
