const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { createVerifiedUserAndGetToken } = require('./helpers');

describe('Admin API', function() {
  this.timeout(20000); // Increase timeout for slow DB/Redis
  let adminToken;

  before(async () => {
    console.log('[TEST DEBUG] Starting user creation for Admin API');
    // Use helper to register, verify, and login a user, then make them admin
    const auth = await createVerifiedUserAndGetToken();
    const db = app.locals.db;
    await db.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', auth.email]);
    // Login again to get a token with admin role
    const res = await request(app).post('/api/auth/login').send({
      email: auth.email,
      password: auth.password
    });
    adminToken = res.body.token;
    console.log('[TEST DEBUG] Got admin token for Admin API:', adminToken);
  });

  it('should fetch analytics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('totalUsers');
  });

  it('should fetch reports', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
  });
}); 