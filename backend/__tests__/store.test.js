'use strict';

/**
 * Tests for the file-based (JSON) store mode.
 * DATABASE_URL is not set so the file store is used automatically.
 */

const path = require('path');
const fs   = require('fs');

// Path to the actual events file the store uses
const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

delete process.env.DATABASE_URL;

const store = require('../store');

// Wipe events before each test so tests are isolated
beforeEach(() => {
  if (fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
  }
});

afterAll(() => {
  // Leave the file clean after the suite
  if (fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
  }
});

describe('File-based event store', () => {
  it('readAll returns empty array when no events exist', async () => {
    const events = await store.readAll();
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(0);
  });

  it('upsertEvent inserts a new event', async () => {
    const event = { id: 'evt-1', title: "Mum's Birthday", date: '2026-06-01', recurrence: 'yearly' };
    await store.upsertEvent(event);
    const events = await store.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt-1');
    expect(events[0].title).toBe("Mum's Birthday");
  });

  it('upsertEvent updates an existing event', async () => {
    const event = { id: 'evt-1', title: 'Original', date: '2026-06-01', recurrence: 'none' };
    await store.upsertEvent(event);
    await store.upsertEvent({ ...event, title: 'Updated' });
    const events = await store.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Updated');
  });

  it('removeEvent removes the correct event', async () => {
    await store.upsertEvent({ id: 'evt-1', title: 'Keep', date: '2026-05-01' });
    await store.upsertEvent({ id: 'evt-2', title: 'Delete', date: '2026-06-01' });
    await store.removeEvent('evt-2');
    const events = await store.readAll();
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('evt-1');
  });

  it('getEventsForDate returns events on the given date only', async () => {
    await store.upsertEvent({ id: 'evt-1', title: 'Today', date: '2026-04-23' });
    await store.upsertEvent({ id: 'evt-2', title: 'Tomorrow', date: '2026-04-24' });
    const todayEvents = await store.getEventsForDate('2026-04-23');
    expect(todayEvents).toHaveLength(1);
    expect(todayEvents[0].id).toBe('evt-1');
  });

  it('getEventsForDate returns empty array when no events on date', async () => {
    const events = await store.getEventsForDate('2099-12-31');
    expect(events).toHaveLength(0);
  });

  it('handles multiple events correctly', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.upsertEvent({ id: `evt-${i}`, title: `Event ${i}`, date: `2026-0${i}-01` });
    }
    const all = await store.readAll();
    expect(all).toHaveLength(5);
  });
});
