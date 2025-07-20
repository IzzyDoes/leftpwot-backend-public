const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

describe('Auth API', function() {
  this.timeout(20000); // Increase timeout for slow DB/Redis
  const unique = Date.now();
  const uniqueEmail = `testuser_${unique}@example.com`;
  const uniqueUsername = `testuser_${unique}`;

  it('should register a new user', async () => {
    console.log('[TEST DEBUG] Registering user:', uniqueEmail);
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: 'password123'
      });
    console.log('[TEST DEBUG] Registration response:', res.status, res.body);
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('user');
    expect(res.body.user).to.have.property('username', uniqueUsername);

    // Simulate email verification for this user
    const db = app.locals.db;
    console.log('[TEST DEBUG] Setting user as verified:', uniqueEmail);
    await db.query('UPDATE users SET verified = true WHERE email = $1', [uniqueEmail]);
  });

  it('should not register with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser2',
        email: uniqueEmail,
        password: 'password123'
      });
    expect(res.status).to.equal(400);
    expect(res.body).to.have.property('error');
  });
}); 