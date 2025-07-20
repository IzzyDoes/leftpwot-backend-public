const request = require('supertest');
const app = require('../server');

async function createVerifiedUserAndGetToken() {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const email = `testuser_${unique}@example.com`;
  const username = `testuser_${unique}`;
  const password = 'password123';

  // Register
  console.log('[TEST DEBUG] Registering user:', email);
  await request(app)
    .post('/api/auth/register')
    .send({ username, email, password });

  // Set as verified
  const db = app.locals.db;
  console.log('[TEST DEBUG] Setting user as verified:', email);
  await db.query('UPDATE users SET verified = true WHERE email = $1', [email]);

  // Login
  console.log('[TEST DEBUG] Logging in user:', email);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  console.log('[TEST DEBUG] Got token for user:', email, res.body.token);

  return {
    token: res.body.token,
    user: res.body.user,
    email,
    username,
    password
  };
}

module.exports = { createVerifiedUserAndGetToken }; 