/**
 * Unit tests for src/utils/helpers.ts
 *
 * These are pure-function tests — no mocks needed.
 */

import {
  formatDate,
  daysUntil,
  getCategoryEmoji,
  generateWhatsAppMessage,
} from '../../utils/helpers';

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string into a human-readable date', () => {
    // Note: we use a fixed date string and verify the shape rather than the
    // exact locale string, because the test runner's locale may vary.
    const result = formatDate('2026-03-25');
    expect(result).toContain('2026');
    expect(result).toContain('25');
    // month should appear as a word ("March") for en-US
    expect(result).toMatch(/March/i);
  });

  it('formats January correctly', () => {
    const result = formatDate('2026-01-01');
    expect(result).toMatch(/January/i);
    expect(result).toContain('1');
    expect(result).toContain('2026');
  });

  it('formats December correctly', () => {
    const result = formatDate('2025-12-31');
    expect(result).toMatch(/December/i);
    expect(result).toContain('31');
    expect(result).toContain('2025');
  });

  it('returns a non-empty string for any valid date', () => {
    expect(formatDate('2030-06-15').length).toBeGreaterThan(0);
  });
});

// ─── daysUntil ────────────────────────────────────────────────────────────────

describe('daysUntil', () => {
  // We freeze time so results are deterministic.
  beforeEach(() => {
    jest.useFakeTimers();
    // Fix "today" to 2026-03-25 at noon (local time)
    jest.setSystemTime(new Date('2026-03-25T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 for today\'s date', () => {
    expect(daysUntil('2026-03-25')).toBe(0);
  });

  it('returns 1 for tomorrow', () => {
    expect(daysUntil('2026-03-26')).toBe(1);
  });

  it('returns 7 for a week from now', () => {
    expect(daysUntil('2026-04-01')).toBe(7);
  });

  it('returns 30 for 30 days from now', () => {
    expect(daysUntil('2026-04-24')).toBe(30);
  });

  it('returns 0 (not negative) for a date in the past', () => {
    // daysUntil uses Math.max(0, ...) so past dates return 0
    expect(daysUntil('2026-03-24')).toBe(0);
    expect(daysUntil('2020-01-01')).toBe(0);
  });

  it('handles cross-month boundaries correctly', () => {
    // March has 31 days; 2026-03-25 + 6 = 2026-03-31
    expect(daysUntil('2026-03-31')).toBe(6);
  });

  it('handles cross-year boundaries correctly', () => {
    // 2026-03-25 → 2027-03-25 should be exactly 365 days (2027 is not a leap year)
    expect(daysUntil('2027-03-25')).toBe(365);
  });
});

// ─── getCategoryEmoji ─────────────────────────────────────────────────────────

describe('getCategoryEmoji', () => {
  it('returns 🎂 for birthday', () => {
    expect(getCategoryEmoji('birthday')).toBe('🎂');
  });

  it('returns 💍 for anniversary', () => {
    expect(getCategoryEmoji('anniversary')).toBe('💍');
  });

  it('returns 🎉 for holiday', () => {
    expect(getCategoryEmoji('holiday')).toBe('🎉');
  });

  it('returns ⭐ for custom', () => {
    expect(getCategoryEmoji('custom')).toBe('⭐');
  });

  it('falls back to 📅 for an unknown category', () => {
    // @ts-expect-error — intentionally passing invalid value to test fallback
    expect(getCategoryEmoji('unknown_category')).toBe('📅');
  });

  it('returns a non-empty string for all known categories', () => {
    const categories = ['birthday', 'anniversary', 'holiday', 'custom'] as const;
    categories.forEach(cat => {
      expect(getCategoryEmoji(cat).length).toBeGreaterThan(0);
    });
  });
});

// ─── generateWhatsAppMessage ──────────────────────────────────────────────────

describe('generateWhatsAppMessage', () => {
  it('replaces {name} placeholder with the given name', () => {
    const result = generateWhatsAppMessage('Happy Birthday, {name}! 🎂', 'Alice');
    expect(result).toBe('Happy Birthday, Alice! 🎂');
  });

  it('replaces all occurrences of {name}', () => {
    const result = generateWhatsAppMessage('{name}, {name}, happy day!', 'Bob');
    expect(result).toBe('Bob, Bob, happy day!');
  });

  it('returns the template unchanged if there is no {name} placeholder', () => {
    const template = 'Happy Anniversary! 💍';
    expect(generateWhatsAppMessage(template, 'Charlie')).toBe(template);
  });

  it('handles an empty name', () => {
    const result = generateWhatsAppMessage('Hi {name}!', '');
    expect(result).toBe('Hi !');
  });

  it('handles an empty template', () => {
    expect(generateWhatsAppMessage('', 'Dave')).toBe('');
  });

  it('handles names with special regex characters safely', () => {
    // Names that look like regex patterns should be inserted literally
    const result = generateWhatsAppMessage('Hello {name}!', 'O\'Brien');
    expect(result).toBe("Hello O'Brien!");
  });
});
