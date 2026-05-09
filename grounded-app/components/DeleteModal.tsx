import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { t } from '../lib/theme';

interface DeleteModalProps {
  visible: boolean;
  dark: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({ visible, dark, onCancel, onConfirm }: DeleteModalProps) {
  const th = t(dark);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <BlurView
        intensity={60}
        tint={dark ? 'dark' : 'light'}
        style={styles.backdrop}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} activeOpacity={1} />
        <View style={[styles.card, { backgroundColor: dark ? '#1c0e06' : '#fef8ee', borderColor: dark ? 'rgba(255,140,50,0.18)' : 'rgba(200,100,40,0.14)' }]}>
          {/* Waldow face SVG approximated with emoji + text */}
          <Text style={styles.face}>🔥</Text>
          <Text style={[styles.title, { color: th.text }]}>Are you sure?</Text>
          <Text style={[styles.body, { color: th.textMuted }]}>
            Just checking you want to delete this! — Waldow
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btnKeep, { borderColor: dark ? 'rgba(255,140,50,0.28)' : 'rgba(200,100,40,0.20)', backgroundColor: dark ? 'rgba(255,140,50,0.08)' : 'rgba(255,255,255,0.72)' }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnKeepText, { color: th.textMuted }]}>Keep it</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDelete} onPress={onConfirm}>
              <Text style={styles.btnDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  face: {
    fontSize: 44,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 6,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    width: '100%',
  },
  btnKeep: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnKeepText: {
    fontSize: 15,
    fontWeight: '500',
  },
  btnDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    backgroundColor: 'rgba(200,40,20,0.85)',
    alignItems: 'center',
  },
  btnDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
