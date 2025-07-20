const { expect } = require('chai');
const { readSecret, getSecrets } = require('../secrets');

describe('Secrets Utility', function() {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('readSecret', function() {
    it('should return environment variable when not in production', function() {
      process.env.NODE_ENV = 'development';
      process.env.TEST_VAR = 'test_value';
      
      const result = readSecret('TEST_VAR', '/run/secrets/test_var');
      expect(result).to.equal('test_value');
    });

    it('should return environment variable when secret file does not exist', function() {
      process.env.NODE_ENV = 'production';
      process.env.TEST_VAR = 'fallback_value';
      
      const result = readSecret('TEST_VAR', '/run/secrets/nonexistent');
      expect(result).to.equal('fallback_value');
    });

    it('should return undefined when neither secret file nor env var exists', function() {
      process.env.NODE_ENV = 'production';
      delete process.env.TEST_VAR;
      
      const result = readSecret('TEST_VAR', '/run/secrets/nonexistent');
      expect(result).to.be.undefined;
    });
  });

  describe('getSecrets', function() {
    it('should return all secrets with environment variables', function() {
      process.env.NODE_ENV = 'development';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.JWT_SECRET = 'test_secret';
      process.env.DB_PASSWORD = 'db_password';
      
      const secrets = getSecrets();
      
      expect(secrets.SMTP_HOST).to.equal('smtp.example.com');
      expect(secrets.JWT_SECRET).to.equal('test_secret');
      expect(secrets.DB_PASSWORD).to.equal('db_password');
      expect(secrets.NODE_ENV).to.equal('development');
    });

    it('should include all expected secret keys', function() {
      const secrets = getSecrets();
      
      expect(secrets).to.have.property('SMTP_HOST');
      expect(secrets).to.have.property('SMTP_PORT');
      expect(secrets).to.have.property('SMTP_SECURE');
      expect(secrets).to.have.property('SMTP_USER');
      expect(secrets).to.have.property('SMTP_PASS');
      expect(secrets).to.have.property('SMTP_FROM');
      expect(secrets).to.have.property('FRONTEND_URL');
      expect(secrets).to.have.property('JWT_SECRET');
      expect(secrets).to.have.property('DB_PASSWORD');
      expect(secrets).to.have.property('REDIS_PASSWORD');
      expect(secrets).to.have.property('NODE_ENV');
      expect(secrets).to.have.property('PORT');
      expect(secrets).to.have.property('DB_HOST');
      expect(secrets).to.have.property('DB_USER');
      expect(secrets).to.have.property('DB_NAME');
      expect(secrets).to.have.property('DB_PORT');
      expect(secrets).to.have.property('REDIS_URL');
    });
  });
}); 