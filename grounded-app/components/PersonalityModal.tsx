import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';
import { Personality } from '../lib/types';

interface PersonalityModalProps {
  visible: boolean;
  dark: boolean;
  editing: Personality | null;
  onClose: () => void;
  onSave: (p: Personality) => void;
  onDelete: (id: string) => void;
}

export default function PersonalityModal({ visible, dark, editing, onClose, onSave, onDelete }: PersonalityModalProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const th = t(dark);

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? '');
      setText(editing?.text ?? '');
    }
  }, [visible, editing]);

  function handleSave() {
    const n = name.trim();
    const tx = text.trim();
    if (!n || !tx) return;
    onSave({ id: editing?.id ?? ('p' + Date.now()), name: n, text: tx });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <BlurView intensity={40} tint={dark ? 'dark' : 'light'} style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
          <View style={[styles.sheet, { backgroundColor: dark ? '#1a0a03' : '#fef8ee', borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.14)' }]}>
            <Text style={[styles.title, { color: th.text }]}>{editing ? 'Edit tone' : 'New tone'}</Text>

            <Text style={[styles.label, { color: th.textMuted }]}>NAME</Text>
            <TextInput
              style={[styles.input, { color: th.text, backgroundColor: th.inputBg, borderColor: th.inputBorder }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Warm & gentle"
              placeholderTextColor={th.textDim}
              maxLength={40}
            />

            <Text style={[styles.label, { color: th.textMuted }]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.textarea, { color: th.text, backgroundColor: th.inputBg, borderColor: th.inputBorder }]}
              value={text}
              onChangeText={setText}
              placeholder="Describe the tone and style for this meditation..."
              placeholderTextColor={th.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              {editing && (
                <TouchableOpacity
                  style={[styles.btnDelete, { borderColor: 'rgba(200,40,20,0.30)' }]}
                  onPress={() => onDelete(editing.id)}
                >
                  <Text style={styles.btnDeleteText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.btnSave, { opacity: name.trim() && text.trim() ? 1 : 0.4 }]}
                onPress={handleSave}
                disabled={!name.trim() || !text.trim()}
              >
                <Text style={styles.btnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 28,
    gap: 10,
    paddingBottom: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  btnDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnDeleteText: {
    color: 'rgba(200,40,20,0.75)',
    fontSize: 15,
    fontWeight: '500',
  },
  btnSave: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(210,70,15,0.92)',
    alignItems: 'center',
  },
  btnSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
