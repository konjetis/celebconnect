import { EventCategory } from '../types';

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString + 'T00:00:00');
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getCategoryEmoji(category: EventCategory): string {
  const map: Record<EventCategory, string> = {
    birthday: '🎂',
    anniversary: '💍',
    holiday: '🎉',
    custom: '⭐',
  };
  return map[category] ?? '📅';
}

export function generateWhatsAppMessage(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}
