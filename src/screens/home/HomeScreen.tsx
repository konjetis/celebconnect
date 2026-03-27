import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, FlatList, Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../context/EventContext';
import { CalendarEvent } from '../../types';
import { COLORS, SPACING } from '../../utils/theme';
import { formatDate, daysUntil, getCategoryEmoji } from '../../utils/helpers';
import { sendWhatsAppMessages, openInstagramAccounts } from '../../utils/messaging';

export default function HomeScreen() {
  const { user } = useAuth();
  const { loadEvents, getUpcomingEvents, deleteEvent } = useEvents();

  const handleDelete = (event: CalendarEvent) => {
    Alert.alert('Delete Event', `Delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ]);
  };

  useEffect(() => { loadEvents(); }, []);

  const upcomingEvents = getUpcomingEvents(30);
  const todayEvents = getUpcomingEvents(0);

  const renderEvent = ({ item }: { item: CalendarEvent }) => {
    const days = daysUntil(item.date);
    const hasMessaging = item.whatsappEnabled || item.instagramEnabled;
    return (
      <View style={styles.eventCard}>
        <Text style={styles.eventEmoji}>{getCategoryEmoji(item.category)}</Text>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDate}>{formatDate(item.date)}</Text>
          <View style={styles.integrationRow}>
            {item.whatsappEnabled && (
              <TouchableOpacity onPress={() => sendWhatsAppMessages(item)}>
                <Text style={styles.integrationBadge}>💬 WhatsApp</Text>
              </TouchableOpacity>
            )}
            {item.instagramEnabled && (
              <TouchableOpacity onPress={() => openInstagramAccounts(item)}>
                <Text style={styles.integrationBadge}>📸 Instagram</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasMessaging && (
            <View style={styles.sendRow}>
              {item.whatsappEnabled && (
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={() => sendWhatsAppMessages(item)}
                >
                  <Text style={styles.sendBtnText}>💬 Send Message</Text>
                </TouchableOpacity>
              )}
              {item.instagramEnabled && (
                <TouchableOpacity
                  style={[styles.sendBtn, styles.sendBtnIG]}
                  onPress={() => openInstagramAccounts(item)}
                >
                  <Text style={styles.sendBtnText}>📸 Open Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View style={[styles.daysBadge, days === 0 && styles.daysBadgeToday]}>
          <Text style={[styles.daysText, days === 0 && styles.daysTextToday]}>
            {days === 0 ? 'Today!' : `${days}d`}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>
          Good {getTimeOfDay()}, {user?.firstName}! 👋
        </Text>
        <Text style={styles.greetingSub}>
          {upcomingEvents.length > 0
            ? `You have ${upcomingEvents.length} upcoming celebration${upcomingEvents.length > 1 ? 's' : ''}`
            : 'No upcoming events — add some celebrations!'}
        </Text>
      </View>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 Today</Text>
          {todayEvents.map(event => (
            <View key={event.id} style={[styles.eventCard, styles.todayCard]}>
              <Text style={styles.eventEmoji}>{getCategoryEmoji(event.category)}</Text>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.todayText}>Happening today!</Text>
                {(event.whatsappEnabled || event.instagramEnabled) && (
                  <View style={styles.sendRow}>
                    {event.whatsappEnabled && (
                      <TouchableOpacity
                        style={styles.sendBtnToday}
                        onPress={() => sendWhatsAppMessages(event)}
                      >
                        <Text style={styles.sendBtnTodayText}>💬 Send WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                    {event.instagramEnabled && (
                      <TouchableOpacity
                        style={[styles.sendBtnToday, styles.sendBtnTodayIG]}
                        onPress={() => openInstagramAccounts(event)}
                      >
                        <Text style={styles.sendBtnTodayText}>📸 Open Instagram</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(event)}>
                <Text style={styles.deleteBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Next 30 Days</Text>
        {upcomingEvents.length > 0 ? (
          <FlatList
            data={upcomingEvents}
            renderItem={renderEvent}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗓️</Text>
            <Text style={styles.emptyText}>No events in the next 30 days</Text>
            <Text style={styles.emptySubText}>
              Go to the Calendar tab to add birthdays and anniversaries!
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <StatCard emoji="🎂" label="Birthdays" count={upcomingEvents.filter(e => e.category === 'birthday').length} />
        <StatCard emoji="💍" label="Anniversaries" count={upcomingEvents.filter(e => e.category === 'anniversary').length} />
        <StatCard emoji="💬" label="Auto-messages" count={upcomingEvents.filter(e => e.whatsappEnabled || e.instagramEnabled).length} />
      </View>
    </ScrollView>
  );
}

function StatCard({ emoji, label, count }: { emoji: string; label: string; count: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  greetingSection: {
    backgroundColor: COLORS.primary, borderRadius: 20, padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  greetingSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 16, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  todayCard: { borderColor: COLORS.primary, borderWidth: 2 },
  eventEmoji: { fontSize: 32, marginRight: SPACING.md },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  todayText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  integrationRow: { flexDirection: 'row', marginTop: 6, gap: 6 },
  integrationBadge: {
    fontSize: 11, backgroundColor: COLORS.primaryLight, color: COLORS.primary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, fontWeight: '600',
  },
  daysBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 50, alignItems: 'center',
  },
  daysBadgeToday: { backgroundColor: COLORS.primary },
  daysText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  sendRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  sendBtn: {
    backgroundColor: '#25D366', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  sendBtnIG: { backgroundColor: '#C13584' },
  sendBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sendBtnToday: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  sendBtnTodayIG: { borderColor: '#C13584' },
  sendBtnTodayText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  daysTextToday: { color: '#fff' },
  deleteBtn: { padding: 8, backgroundColor: '#FFF0F0', borderRadius: 10, marginLeft: SPACING.sm },
  deleteBtnText: { fontSize: 16 },
  emptyState: { alignItems: 'center', padding: SPACING.xl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  emptySubText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.md,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statCount: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});
