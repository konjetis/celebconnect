'use strict';

// ─── Mock axios before requiring scheduler ────────────────────────────────────
jest.mock('axios');
const axios = require('axios');

// ─── Mock auth module so getAllUsers is controllable ──────────────────────────
jest.mock('../auth', () => ({
  getAllUsers: jest.fn(),
}));
const { getAllUsers } = require('../auth');

// ─── Mock store ───────────────────────────────────────────────────────────────
jest.mock('../store', () => ({
  getEventsForDate: jest.fn(),
  readAll: jest.fn(),
}));
const { getEventsForDate, readAll } = require('../store');

const { recurringEventMatchesToday, sendTodaysMessages } = require('../scheduler');

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

// ─── sendTodaysMessages — push notification flow ──────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

const makeEvent = (overrides = {}) => ({
  id: 'evt-1',
  title: 'Birthday',
  date: TODAY,
  recurrence: 'none',
  whatsappEnabled: true,
  contacts: [{ name: 'Alice', phone: '+1234567890' }],
  whatsappMessage: 'Happy Birthday {name}!',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  axios.post.mockResolvedValue({ data: { data: [{ status: 'ok' }] } });
  readAll.mockResolvedValue([]);
});

describe('sendTodaysMessages — no events', () => {
  it('does nothing when there are no events today', async () => {
    getEventsForDate.mockResolvedValue([]);
    readAll.mockResolvedValue([]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('sendTodaysMessages — no push tokens', () => {
  it('skips sending when no users have registered push tokens', async () => {
    getEventsForDate.mockResolvedValue([makeEvent()]);
    getAllUsers.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }]); // no expoPushToken
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('sendTodaysMessages — push notification sent', () => {
  beforeEach(() => {
    getAllUsers.mockResolvedValue([
      { id: 'u1', email: 'owner@example.com', expoPushToken: 'ExponentPushToken[abc123]' },
    ]);
  });

  it('calls Expo Push API for each whatsappEnabled contact', async () => {
    getEventsForDate.mockResolvedValue([
      makeEvent({
        contacts: [
          { name: 'Alice', phone: '+1111111111' },
          { name: 'Bob',   phone: '+2222222222' },
        ],
      }),
    ]);

    await sendTodaysMessages();

    // Two contacts → two POST calls
    expect(axios.post).toHaveBeenCalledTimes(2);
    expect(axios.post).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        to:   'ExponentPushToken[abc123]',
        data: expect.objectContaining({ waPhone: '+1111111111' }),
      }),
      expect.any(Object)
    );
  });

  it('interpolates {name} placeholder in the message', async () => {
    getEventsForDate.mockResolvedValue([
      makeEvent({
        whatsappMessage: 'Hey {name}, happy birthday!',
        contacts: [{ name: 'Carol', phone: '+3333333333' }],
      }),
    ]);

    await sendTodaysMessages();

    const payload = axios.post.mock.calls[0][1];
    expect(payload.data.message).toBe('Hey Carol, happy birthday!');
  });

  it('skips events where whatsappEnabled is false', async () => {
    getEventsForDate.mockResolvedValue([makeEvent({ whatsappEnabled: false })]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('skips contacts without a phone number', async () => {
    getEventsForDate.mockResolvedValue([
      makeEvent({
        contacts: [
          { name: 'No Phone' },
          { name: 'Has Phone', phone: '+4444444444' },
        ],
      }),
    ]);

    await sendTodaysMessages();

    // Only 1 call — the contact without a phone is skipped
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1].data.waPhone).toBe('+4444444444');
  });

  it('skips Instagram-only contacts (no phone)', async () => {
    getEventsForDate.mockResolvedValue([
      makeEvent({
        contacts: [{ name: 'IGUser', instagramHandle: '@iguser' }],
      }),
    ]);

    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('continues sending after a failed push notification', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: {} });

    getEventsForDate.mockResolvedValue([
      makeEvent({
        contacts: [
          { name: 'Fail',    phone: '+5555555555' },
          { name: 'Succeed', phone: '+6666666666' },
        ],
      }),
    ]);

    await expect(sendTodaysMessages()).resolves.not.toThrow();
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('sends to multiple registered push tokens', async () => {
    getAllUsers.mockResolvedValue([
      { id: 'u1', expoPushToken: 'ExponentPushToken[token1]' },
      { id: 'u2', expoPushToken: 'ExponentPushToken[token2]' },
    ]);
    getEventsForDate.mockResolvedValue([
      makeEvent({ contacts: [{ name: 'Dave', phone: '+7777777777' }] }),
    ]);

    await sendTodaysMessages();

    // 1 contact × 2 tokens = 2 calls
    expect(axios.post).toHaveBeenCalledTimes(2);
    const tokens = axios.post.mock.calls.map(c => c[1].to);
    expect(tokens).toContain('ExponentPushToken[token1]');
    expect(tokens).toContain('ExponentPushToken[token2]');
  });
});
