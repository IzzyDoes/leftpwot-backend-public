const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { createVerifiedUserAndGetToken } = require('./helpers');

describe('Posts API', function() {
  this.timeout(20000); // Increase timeout for slow DB/Redis
  let token;
  let postId;
  let userId;

  before(async () => {
    console.log('[TEST DEBUG] Starting user creation for Posts API');
    // Use helper to register, verify, and login a user
    const auth = await createVerifiedUserAndGetToken();
    token = auth.token;
    userId = auth.user.id;
    console.log('[TEST DEBUG] Got token for Posts API:', token);
  });

  it('should create a new post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Post', content: 'This is a test post.' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('title', 'Test Post');
    postId = res.body.id;
  });

  it('should fetch posts', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('posts');
    expect(res.body.posts).to.be.an('array');
  });

  it('should not allow blocked users to create posts', async () => {
    // Block the user now
    const db = app.locals.db;
    await db.query('UPDATE users SET blocked = true WHERE id = $1', [userId]);
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Blocked Post', content: 'Should not work.' });
    expect(res.status).to.equal(403);
  });
}); 