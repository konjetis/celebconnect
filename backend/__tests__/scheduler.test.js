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
  readAllForScheduler: jest.fn(),
}));
const { readAllForScheduler } = require('../store');

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

// Must match scheduler.getTodayString(), which uses LOCAL date parts.
// toISOString() would give the UTC date, which differs from local for part of
// every day in any non-UTC timezone and would make these tests flaky.
const TODAY = (() => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
})();

const OWNER = 'u1';

const makeEvent = (overrides = {}) => ({
  id: 'evt-1',
  title: 'Birthday',
  date: TODAY,
  recurrence: 'none',
  whatsappEnabled: true,
  contacts: [{ name: 'Alice', phone: '+1234567890' }],
  whatsappMessage: 'Happy Birthday {name}!',
  userId: OWNER,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  axios.post.mockResolvedValue({ data: { data: [{ status: 'ok' }] } });
  readAllForScheduler.mockResolvedValue([]);
});

describe('sendTodaysMessages — no events', () => {
  it('does nothing when there are no events today', async () => {
    readAllForScheduler.mockResolvedValue([]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('sendTodaysMessages — no push tokens', () => {
  it('skips sending when no users have registered push tokens', async () => {
    readAllForScheduler.mockResolvedValue([makeEvent()]);
    getAllUsers.mockResolvedValue([{ id: OWNER, email: 'a@b.com' }]); // no expoPushToken
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('sendTodaysMessages — push notification sent', () => {
  beforeEach(() => {
    getAllUsers.mockResolvedValue([
      { id: OWNER, email: 'owner@example.com', expoPushToken: 'ExponentPushToken[abc123]' },
    ]);
  });

  it('calls Expo Push API for each whatsappEnabled contact', async () => {
    readAllForScheduler.mockResolvedValue([
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

  it('returns the number of notifications sent', async () => {
    readAllForScheduler.mockResolvedValue([
      makeEvent({
        contacts: [
          { name: 'Alice', phone: '+1111111111' },
          { name: 'Bob',   phone: '+2222222222' },
        ],
      }),
    ]);

    await expect(sendTodaysMessages()).resolves.toBe(2);
  });

  it('interpolates {name} placeholder in the message', async () => {
    readAllForScheduler.mockResolvedValue([
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
    readAllForScheduler.mockResolvedValue([makeEvent({ whatsappEnabled: false })]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('skips contacts without a phone number', async () => {
    readAllForScheduler.mockResolvedValue([
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
    readAllForScheduler.mockResolvedValue([
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

    readAllForScheduler.mockResolvedValue([
      makeEvent({
        contacts: [
          { name: 'Fail',    phone: '+5555555555' },
          { name: 'Succeed', phone: '+6666666666' },
        ],
      }),
    ]);

    await expect(sendTodaysMessages()).resolves.toBe(1);
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it('skips an event whose owner has no registered device', async () => {
    readAllForScheduler.mockResolvedValue([makeEvent({ userId: 'someone-else' })]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});

// ─── Cross-user isolation ─────────────────────────────────────────────────────
// Regression tests for the pre-1.0 bug where the scheduler collected push tokens
// from ALL users and sent every event to every device — leaking contacts' real
// phone numbers to strangers.

describe('sendTodaysMessages — cross-user isolation', () => {
  const ALICE = 'user-alice';
  const BOB   = 'user-bob';

  beforeEach(() => {
    getAllUsers.mockResolvedValue([
      { id: ALICE, expoPushToken: 'ExponentPushToken[alice]' },
      { id: BOB,   expoPushToken: 'ExponentPushToken[bob]' },
    ]);
  });

  it('sends each event only to the device of the user who owns it', async () => {
    readAllForScheduler.mockResolvedValue([
      makeEvent({
        id: 'a-1',
        userId: ALICE,
        contacts: [{ name: "Alice's Mum", phone: '+1111111111' }],
      }),
      makeEvent({
        id: 'b-1',
        userId: BOB,
        contacts: [{ name: "Bob's Dad", phone: '+2222222222' }],
      }),
    ]);

    await sendTodaysMessages();

    expect(axios.post).toHaveBeenCalledTimes(2);

    const byToken = Object.fromEntries(
      axios.post.mock.calls.map(c => [c[1].to, c[1].data])
    );

    expect(byToken['ExponentPushToken[alice]'].waPhone).toBe('+1111111111');
    expect(byToken['ExponentPushToken[bob]'].waPhone).toBe('+2222222222');
  });

  it("never puts one user's contact phone number on another user's device", async () => {
    readAllForScheduler.mockResolvedValue([
      makeEvent({
        id: 'a-1',
        userId: ALICE,
        contacts: [{ name: "Alice's Mum", phone: '+1111111111' }],
      }),
    ]);

    await sendTodaysMessages();

    const bobsPushes = axios.post.mock.calls.filter(
      c => c[1].to === 'ExponentPushToken[bob]'
    );
    expect(bobsPushes).toHaveLength(0);
  });

  it('onlyUserId restricts the run to a single user', async () => {
    readAllForScheduler.mockResolvedValue([
      makeEvent({ id: 'a-1', userId: ALICE, contacts: [{ name: 'A', phone: '+1111111111' }] }),
      makeEvent({ id: 'b-1', userId: BOB,   contacts: [{ name: 'B', phone: '+2222222222' }] }),
    ]);

    const sent = await sendTodaysMessages({ onlyUserId: ALICE });

    expect(sent).toBe(1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][1].to).toBe('ExponentPushToken[alice]');
  });

  it('ignores events with no owner', async () => {
    readAllForScheduler.mockResolvedValue([makeEvent({ userId: undefined })]);
    await sendTodaysMessages();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
