import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';
import { Folder, Meditation } from '../lib/types';

interface FolderPickerModalProps {
  visible: boolean;
  dark: boolean;
  meditation: Meditation | null;
  folders: Folder[];
  onClose: () => void;
  onToggleFolder: (medId: number, folderId: number) => void;
}

export default function FolderPickerModal({ visible, dark, meditation, folders, onClose, onToggleFolder }: FolderPickerModalProps) {
  const th = t(dark);
  const currentIds = meditation?.folderIds ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: dark ? '#1c0e06' : '#fef8ee', borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.14)' }]}>
          <Text style={[styles.title, { color: th.text }]}>Move to folder</Text>
          {folders.length === 0 ? (
            <Text style={[styles.empty, { color: th.textDim }]}>
              No folders yet — create one in the library.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {folders.map(f => {
                const active = currentIds.includes(f.id);
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.option,
                      {
                        backgroundColor: active
                          ? (dark ? 'rgba(255,140,50,0.16)' : 'rgba(210,70,15,0.09)')
                          : (dark ? 'rgba(255,140,50,0.07)' : 'rgba(255,255,255,0.65)'),
                        borderColor: active
                          ? (dark ? 'rgba(255,140,50,0.42)' : 'rgba(210,70,15,0.38)')
                          : (dark ? 'rgba(255,140,50,0.16)' : 'rgba(200,100,40,0.15)'),
                      },
                    ]}
                    onPress={() => meditation && onToggleFolder(meditation.id, f.id)}
                  >
                    <Text style={[styles.optionText, { color: active ? 'rgba(210,70,15,0.90)' : th.textMuted }]}>
                      {active ? '✓  ' : '      '}{f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <TouchableOpacity
            style={[styles.btnCancel, { borderColor: dark ? 'rgba(255,215,175,0.15)' : 'rgba(30,12,4,0.12)' }]}
            onPress={onClose}
          >
            <Text style={[styles.btnCancelText, { color: th.textMuted }]}>Done</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    gap: 10,
    paddingBottom: 44,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  empty: {
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 12,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
  },
  btnCancel: {
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  btnCancelText: {
    fontSize: 14,
  },
});
