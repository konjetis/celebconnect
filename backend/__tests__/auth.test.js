'use strict';

/**
 * Integration-style tests for auth routes using supertest.
 * Runs against an in-memory user store (no DATABASE_URL set).
 */

const express = require('express');
const request = require('supertest');

// Ensure in-memory mode and test JWT secret before any require
delete process.env.DATABASE_URL;
process.env.AUTH_JWT_SECRET = 'ci-test-secret-not-real';

const { router: authRouter } = require('../auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

// Unique email per test to avoid cross-test collisions (module is shared)
let counter = 0;
function uniqueEmail() {
  return `test${++counter}_${Date.now()}@example.com`;
}

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a token', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'Test',
      lastName:  'User',
      email:     uniqueEmail(),
      password:  'password123',
      method:    'email',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toContain('@example.com');
  });

  it('rejects registration with a duplicate email', async () => {
    const app   = buildApp();
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ firstName: 'A', lastName: 'B', email, password: 'pass1', method: 'email' });
    const res = await request(app).post('/api/auth/register').send({ firstName: 'A', lastName: 'B', email, password: 'pass2', method: 'email' });
    expect(res.status).toBe(409);
  });

  it('rejects registration with missing fields', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({ email: uniqueEmail(), method: 'email' });
    expect(res.status).toBe(400);
  });

  it('rejects registration when method is email but email is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/register').send({
      firstName: 'A', lastName: 'B', password: 'pass', method: 'email',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const app   = buildApp();
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ firstName: 'Login', lastName: 'Test', email, password: 'secret', method: 'email' });
    const res = await request(app).post('/api/auth/login').send({ identifier: email, password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const app   = buildApp();
    const email = uniqueEmail();
    await request(app).post('/api/auth/register').send({ firstName: 'A', lastName: 'B', email, password: 'correct', method: 'email' });
    const res = await request(app).post('/api/auth/login').send({ identifier: email, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ identifier: 'nobody@example.com', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('rejects request with missing identifier', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/auth/login').send({ password: 'anything' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info with valid token', async () => {
    const app   = buildApp();
    const email = uniqueEmail();
    const reg   = await request(app).post('/api/auth/register').send({ firstName: 'Me', lastName: 'Test', email, password: 'secret', method: 'email' });
    const token = reg.body.token;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('rejects request without token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});
