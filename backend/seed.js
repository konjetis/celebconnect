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
  {
    // Dated TODAY on purpose. The App Store / Play reviewer signs in as
    // reviewer@celebconnect.app and needs an event they can immediately tap
    // "Send Now via WhatsApp" on. See APP_STORE_METADATA.md → Review Notes.
    id:              'evt-seed-006',
    title:           "Sister's Birthday",
    date:            daysFromToday(0),
    recurrence:      'yearly',
    type:            'birthday',
    whatsappEnabled: true,
    whatsappMessage: 'Happy Birthday {name}! 🎂 Hope you have the best day!',
    contacts: [
      { name: 'Anjali', phone: '+10000000005' },
    ],
    reminderDays:    1,
    notes:           'Demo event for store review — always dated today.',
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

  // The users table is (id TEXT PRIMARY KEY, data JSONB) — see auth.initUsersTable().
  // The whole user object lives in `data`; there are no per-field columns.
  for (const user of TEST_USERS) {
    await pool.query(
      `INSERT INTO users (id, data) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [user.id, JSON.stringify(user)]
    );
    console.log(`✅ User: ${user.email}`);
  }
}

async function seedEvents() {
  for (const event of TEST_EVENTS) {
    // Events are owned; the store requires the owner id explicitly.
    const ok = await upsertEvent(event, event.userId);
    if (!ok) {
      console.log(`⚠️  Event: "${event.title}" already exists under a different owner — skipped.`);
      continue;
    }
    console.log(`✅ Event: "${event.title}" (${event.date}) — ${event.recurrence} → ${event.userId}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Refuse to seed a remote database unless explicitly confirmed.
 *
 * dotenv loads backend/.env, which on a developer machine normally contains the
 * PRODUCTION Railway DATABASE_URL. Running `node seed.js` therefore writes test
 * users and fake events straight into production unless something stops it.
 * This is that something.
 */
function assertSafeTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) return; // local JSON file mode — always safe

  const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
  if (isLocal) return;

  if (process.env.SEED_ALLOW_REMOTE === 'yes') {
    console.warn('⚠️  SEED_ALLOW_REMOTE=yes — seeding a REMOTE database on purpose.\n');
    return;
  }

  const host = url.replace(/\/\/[^@]*@/, '//***@');
  console.error(`
❌ Refusing to seed a remote database.

   Target: ${host}

   backend/.env usually holds your PRODUCTION Railway connection string, and
   seeding it would insert fake users and events into the live app.

   To seed local data instead:
       DATABASE_URL= node seed.js          # JSON file at backend/data/events.json

   If you really do mean to seed the remote database:
       SEED_ALLOW_REMOTE=yes node seed.js
`);
  process.exit(1);
}

async function main() {
  console.log('\n🌱 CelebConnect Seed Script');
  console.log('============================');

  assertSafeTarget();

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
