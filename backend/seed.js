'use strict';

/**
 * CelebConnect — Seed Script
 *
 * Populates the database (or local JSON file) with test users and events
 * so you can test the app without real data.
 *
 * Usage:
 *   cd backend
 *   node seed.js
 *
 * Safe to run multiple times — uses upsert so data won't duplicate.
 */

require('dotenv').config();

const bcrypt       = require('bcryptjs');
const { upsertEvent } = require('./store');

// ─── Test users ───────────────────────────────────────────────────────────────

const TEST_USERS = [
  {
    id:           'user-seed-001',
    firstName:    'Suneetha',
    lastName:     'Test',
    email:        'test@celebconnect.app',
    passwordHash: bcrypt.hashSync('TestPass123!', 10),
    createdAt:    new Date().toISOString(),
  },
  {
    id:           'user-seed-002',
    firstName:    'Reviewer',
    lastName:     'Apple',
    email:        'reviewer@celebconnect.app',
    passwordHash: bcrypt.hashSync('ReviewCelebConnect2026!', 10),
    createdAt:    new Date().toISOString(),
  },
];

// ─── Test events ──────────────────────────────────────────────────────────────

// Use dates relative to today so "upcoming" events always appear
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const TEST_EVENTS = [
  {
    id:              'evt-seed-001',
    title:           "Mum's Birthday",
    date:            daysFromToday(3),
    recurrence:      'yearly',
    type:            'birthday',
    whatsappEnabled: true,
    whatsappMessage: 'Happy Birthday Mum! 🎂 Wishing you a wonderful day filled with love and joy! 🎉',
    contacts: [
      { name: 'Mum', phone: '+10000000001' },
    ],
    reminderDays:    3,
    notes:           'Remember to also send flowers!',
    userId:          'user-seed-001',
  },
  {
    id:              'evt-seed-002',
    title:           "Wedding Anniversary",
    date:            daysFromToday(7),
    recurrence:      'yearly',
    type:            'anniversary',
    whatsappEnabled: true,
    whatsappMessage: 'Happy Anniversary {name}! 💑 Another beautiful year together!',
    contacts: [
      { name: 'Ravi', phone: '+10000000002' },
    ],
    reminderDays:    2,
    notes:           '',
    userId:          'user-seed-001',
  },
  {
    id:              'evt-seed-003',
    title:           "Best Friend's Birthday",
    date:            daysFromToday(14),
    recurrence:      'yearly',
    type:            'birthday',
    whatsappEnabled: true,
    whatsappMessage: 'Happy Birthday {name}! 🎉🥳 Hope your day is as amazing as you are!',
    contacts: [
      { name: 'Priya', phone: '+10000000003' },
    ],
    reminderDays:    1,
    notes:           'Plan a surprise lunch',
    userId:          'user-seed-001',
  },
  {
    id:              'evt-seed-004',
    title:           'Team Standup',
    date:            daysFromToday(0),
    recurrence:      'weekly',
    type:            'custom',
    whatsappEnabled: false,
    whatsappMessage: '',
    contacts:        [],
    reminderDays:    0,
    notes:           'Weekly team meeting',
    userId:          'user-seed-001',
  },
  {
    id:              'evt-seed-005',
    title:           "Dad's Birthday",
    date:            daysFromToday(-30), // past — recurring will fire yearly
    recurrence:      'yearly',
    type:            'birthday',
    whatsappEnabled: true,
    whatsappMessage: 'Happy Birthday Dad! 🎂❤️',
    contacts: [
      { name: 'Dad', phone: '+10000000004' },
    ],
    reminderDays:    5,
    notes:           '',
    userId:          'user-seed-002',
  },
];

// ─── Seed functions ───────────────────────────────────────────────────────────

async function seedUsers() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL — skipping user seeding (users live in memory on local mode).');
    console.log('   Test credentials: test@celebconnect.app / TestPass123!');
    return;
  }

  const { getPool } = require('./db');
  const pool        = getPool();

  for (const user of TEST_USERS) {
    await pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [user.id, user.email, user.passwordHash, user.firstName, user.lastName, user.createdAt]
    );
    console.log(`✅ User: ${user.email}`);
  }
}

async function seedEvents() {
  for (const event of TEST_EVENTS) {
    await upsertEvent(event);
    console.log(`✅ Event: "${event.title}" (${event.date}) — ${event.recurrence}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 CelebConnect Seed Script');
  console.log('============================');
  console.log(`Mode: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Local JSON file'}\n`);

  if (process.env.DATABASE_URL) {
    const { initDb } = require('./db');
    await initDb();
  }

  console.log('Seeding users...');
  await seedUsers();

  console.log('\nSeeding events...');
  await seedEvents();

  console.log('\n✅ Seed complete!\n');
  console.log('Test credentials:');
  console.log('  Email:    test@celebconnect.app');
  console.log('  Password: TestPass123!\n');
  console.log('  Email:    reviewer@celebconnect.app  (App Store reviewer account)');
  console.log('  Password: ReviewCelebConnect2026!\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
