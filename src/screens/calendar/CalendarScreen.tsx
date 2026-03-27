import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarStackParamList, CalendarEvent } from '../../types';
import { useEvents } from '../../context/EventContext';
import { COLORS, SPACING } from '../../utils/theme';
import { getCategoryEmoji, formatDate } from '../../utils/helpers';
import { sendWhatsAppMessages, openInstagramAccounts } from '../../utils/messaging';

type Props = {
  navigation: NativeStackNavigationProp<CalendarStackParamList, 'CalendarMain'>;
};

export default function CalendarScreen({ navigation }: Props) {
  const { events, loadEvents, deleteEvent } = useEvents();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => { loadEvents(); }, []);

  // Build marked dates for the calendar
  const markedDates = events.reduce<Record<string, any>>((acc, event) => {
    acc[event.date] = {
      marked: true,
      dotColor: COLORS.primary,
      ...(event.date === selectedDate ? { selected: true, selectedColor: COLORS.primary } : {}),
    };
    return acc;
  }, {
    [selectedDate]: { selected: true, selectedColor: COLORS.primary },
  });

  const selectedEvents = events.filter(e => e.date === selectedDate);

  const handleDelete = (event: CalendarEvent) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ]);
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => (
    <View style={styles.eventCard}>
      <Text style={styles.eventEmoji}>{getCategoryEmoji(item.category)}</Text>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventMeta}>
          {item.recurrence !== 'none' ? `🔄 ${item.recurrence}` : '📅 one-time'}
        </Text>
        {item.description ? <Text style={styles.eventDesc} numberOfLines={1}>{item.description}</Text> : null}
        {(item.whatsappEnabled || item.instagramEnabled) && (
          <View style={styles.sendRow}>
            {item.whatsappEnabled && (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => sendWhatsAppMessages(item)}
              >
                <Text style={styles.sendBtnText}>💬 Send WhatsApp</Text>
              </TouchableOpacity>
            )}
            {item.instagramEnabled && (
              <TouchableOpacity
                style={[styles.sendBtn, styles.sendBtnIG]}
                onPress={() => openInstagramAccounts(item)}
              >
                <Text style={styles.sendBtnText}>📸 Open Instagram</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditEvent', { eventId: item.id })}
        >
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Calendar
        style={styles.calendar}
        current={selectedDate}
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: COLORS.background,
          calendarBackground: COLORS.surface,
          textSectionTitleColor: COLORS.textSecondary,
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: COLORS.primary,
          dayTextColor: COLORS.text,
          dotColor: COLORS.primary,
          arrowColor: COLORS.primary,
          monthTextColor: COLORS.text,
          textDayFontWeight: '500',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
        }}
      />

      {/* Events for selected date */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>
            {selectedEvents.length > 0
              ? `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''} on ${formatDate(selectedDate)}`
              : `No events on ${formatDate(selectedDate)}`}
          </Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddEvent', { date: selectedDate })}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedEvents}
          renderItem={renderEvent}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Tap "+ Add" to add a birthday or anniversary</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  calendar: { borderRadius: 16, margin: SPACING.md, overflow: 'hidden' },
  eventsSection: { flex: 1, paddingHorizontal: SPACING.md },
  eventsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  eventsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, flex: 1 },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  eventEmoji: { fontSize: 28, marginRight: SPACING.sm },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  eventActions: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: COLORS.primaryLight, borderRadius: 10 },
  deleteBtn: { padding: 8, backgroundColor: '#FFF0F0', borderRadius: 10 },
  sendRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  sendBtn: {
    backgroundColor: '#25D366', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  sendBtnIG: { backgroundColor: '#C13584' },
  sendBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { paddingVertical: SPACING.xl, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});
