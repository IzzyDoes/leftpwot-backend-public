const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const { createVerifiedUserAndGetToken } = require('./helpers');

describe('Comments API', function() {
  this.timeout(20000); // Increase timeout for slow DB/Redis
  let token, postId, commentId;

  before(async () => {
    console.log('[TEST DEBUG] Starting user creation for Comments API');
    // Use helper to register, verify, and login a user
    const auth = await createVerifiedUserAndGetToken();
    token = auth.token;
    console.log('[TEST DEBUG] Got token for Comments API:', token);

    // Create a post
    const postRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Comment Post', content: 'For comments.' });
    postId = postRes.body.id;
    console.log('[TEST DEBUG] Created post for Comments API:', postId);
  });

  it('should create a comment', async () => {
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ postId, content: 'Nice post!' });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('content', 'Nice post!');
    commentId = res.body.id;
  });

  it('should fetch comments for a post', async () => {
    const res = await request(app).get(`/api/comments/post/${postId}`);
    expect(res.status).to.equal(200);
    expect(res.body.comments).to.be.an('array');
  });

  it('should delete a comment', async () => {
    const res = await request(app)
      .delete(`/api/comments/${commentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(200);
  });
}); 