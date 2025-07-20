const { expect } = require('chai');

describe('Redis Client Initialization', function() {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('should handle missing REDIS_URL gracefully', function() {
    // Set NODE_ENV to production to test secrets behavior
    process.env.NODE_ENV = 'production';
    delete process.env.REDIS_URL;

    // This should not throw an error
    expect(() => {
      require('../server');
    }).to.not.throw();
  });

  it('should handle invalid REDIS_URL gracefully', function() {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'invalid-url';

    // This should not throw an error
    expect(() => {
      require('../server');
    }).to.not.throw();
  });

  it('should initialize Redis client with valid URL', function() {
    process.env.NODE_ENV = 'production';
    process.env.REDIS_URL = 'redis://localhost:6379';

    // This should not throw an error
    expect(() => {
      require('../server');
    }).to.not.throw();
  });
}); 