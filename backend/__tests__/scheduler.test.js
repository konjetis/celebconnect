'use strict';

const { recurringEventMatchesToday } = require('../scheduler');

describe('recurringEventMatchesToday', () => {
  const baseEvent = (recurrence, date) => ({ id: '1', title: 'Test', date, recurrence });

  describe('none / no recurrence', () => {
    it('returns false when recurrence is none', () => {
      expect(recurringEventMatchesToday(baseEvent('none', '2020-04-23'), '2021-04-23')).toBe(false);
    });
    it('returns false when recurrence is missing', () => {
      expect(recurringEventMatchesToday({ id: '1', date: '2020-04-23' }, '2021-04-23')).toBe(false);
    });
  });

  describe('yearly recurrence', () => {
    const event = baseEvent('yearly', '2020-04-23');

    it('matches the same month and day in a future year', () => {
      expect(recurringEventMatchesToday(event, '2021-04-23')).toBe(true);
      expect(recurringEventMatchesToday(event, '2025-04-23')).toBe(true);
    });

    it('does not match a different day', () => {
      expect(recurringEventMatchesToday(event, '2021-04-24')).toBe(false);
    });

    it('does not match a different month', () => {
      expect(recurringEventMatchesToday(event, '2021-05-23')).toBe(false);
    });

    it('does not match the original date itself', () => {
      expect(recurringEventMatchesToday(event, '2020-04-23')).toBe(false);
    });

    it('does not match a date before the original', () => {
      expect(recurringEventMatchesToday(event, '2019-04-23')).toBe(false);
    });
  });

  describe('monthly recurrence', () => {
    const event = baseEvent('monthly', '2020-04-15');

    it('matches the same day of month in a future month', () => {
      expect(recurringEventMatchesToday(event, '2020-05-15')).toBe(true);
      expect(recurringEventMatchesToday(event, '2021-01-15')).toBe(true);
    });

    it('does not match a different day of month', () => {
      expect(recurringEventMatchesToday(event, '2020-05-16')).toBe(false);
    });

    it('does not match the original date', () => {
      expect(recurringEventMatchesToday(event, '2020-04-15')).toBe(false);
    });
  });

  describe('weekly recurrence', () => {
    const event = baseEvent('weekly', '2020-04-20'); // a Monday

    it('matches exactly 7 days later', () => {
      expect(recurringEventMatchesToday(event, '2020-04-27')).toBe(true);
    });

    it('matches exactly 14 days later', () => {
      expect(recurringEventMatchesToday(event, '2020-05-04')).toBe(true);
    });

    it('does not match 6 days later', () => {
      expect(recurringEventMatchesToday(event, '2020-04-26')).toBe(false);
    });

    it('does not match 8 days later', () => {
      expect(recurringEventMatchesToday(event, '2020-04-28')).toBe(false);
    });

    it('does not match the original date', () => {
      expect(recurringEventMatchesToday(event, '2020-04-20')).toBe(false);
    });
  });
});
