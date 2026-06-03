import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  AppState, AppStateStatus,
} from 'react-native';
import { EventContact } from '../types';
import { openWhatsApp } from '../utils/messaging';
import { COLORS, SPACING } from '../utils/theme';

interface Props {
  visible: boolean;
  contacts: EventContact[];
  messageTemplate: string;
  onClose: () => void;
}

/**
 * Sequences through multiple WhatsApp contacts one by one.
 * After each WhatsApp send, the user returns to the app and taps "Next"
 * (or the next contact opens automatically when the app comes to foreground).
 */
export default function GroupSendModal({ visible, contacts, messageTemplate, onClose }: Props) {
  const [index, setIndex]   = useState(0);
  const [phase, setPhase]   = useState<'ready' | 'sent' | 'done'>('ready');
  const appState            = useRef(AppState.currentState);
  const appStateListenerRef = useRef<ReturnType<typeof AppState.addEventListener> | null>(null);

  const total   = contacts.length;
  const current = contacts[index];

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setIndex(0);
      setPhase('ready');
    }
  }, [visible]);

  // Listen for app returning to foreground after WhatsApp send
  useEffect(() => {
    if (!visible || phase !== 'sent') return;

    appStateListenerRef.current = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextState === 'active') {
          // User returned from WhatsApp — advance to next contact
          advanceToNext();
        }
        appState.current = nextState;
      }
    );

    return () => {
      appStateListenerRef.current?.remove();
    };
  }, [visible, phase, index]);

  const sendCurrent = async () => {
    setPhase('sent');
    await openWhatsApp(current, messageTemplate);
  };

  const advanceToNext = () => {
    appStateListenerRef.current?.remove();
    const nextIndex = index + 1;
    if (nextIndex >= total) {
      setPhase('done');
    } else {
      setIndex(nextIndex);
      setPhase('ready');
    }
  };

  const handleClose = () => {
    appStateListenerRef.current?.remove();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {phase === 'done' ? (
            <>
              <Text style={styles.doneIcon}>🎉</Text>
              <Text style={styles.title}>All Done!</Text>
              <Text style={styles.subtitle}>
                Sent wishes to all {total} contacts.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Progress */}
              <View style={styles.progressRow}>
                {contacts.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i < index  && styles.progressDotDone,
                      i === index && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressLabel}>{index + 1} of {total}</Text>

              <Text style={styles.contactName}>{current?.name}</Text>
              {current?.phone ? (
                <Text style={styles.contactPhone}>{current.phone}</Text>
              ) : null}

              {phase === 'ready' ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={sendCurrent}>
                  <Text style={styles.primaryBtnText}>
                    💬 Open WhatsApp
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.waitingBox}>
                  <Text style={styles.waitingText}>
                    WhatsApp is open — send your message then come back here.
                  </Text>
                  <TouchableOpacity style={styles.nextBtn} onPress={advanceToNext}>
                    <Text style={styles.nextBtnText}>
                      {index + 1 < total ? `Next → ${contacts[index + 1]?.name}` : 'Finish'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Stop Sending</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, paddingBottom: 40, alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row', gap: 8, marginBottom: SPACING.sm,
  },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  progressDotDone: { backgroundColor: COLORS.primary, opacity: 0.4 },
  progressDotActive: { backgroundColor: COLORS.primary, width: 24 },
  progressLabel: {
    fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.lg,
  },
  contactName: {
    fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, alignItems: 'center', width: '100%',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    marginBottom: SPACING.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitingBox: {
    backgroundColor: COLORS.background, borderRadius: 14, padding: SPACING.lg,
    alignItems: 'center', width: '100%', marginBottom: SPACING.md,
  },
  waitingText: {
    fontSize: 14, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 20, marginBottom: SPACING.md,
  },
  nextBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14 },
  doneIcon: { fontSize: 56, marginBottom: SPACING.md },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: SPACING.xl, textAlign: 'center' },
});
