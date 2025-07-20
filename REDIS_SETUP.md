# Redis Configuration for LeftPlot Backend

## Overview

The LeftPlot backend uses Redis for caching and session management. Redis is optional - if not configured, the application will run without caching functionality.

## Configuration Options

### 1. Environment Variable (Recommended for Development)

Set the `REDIS_URL` environment variable:

```bash
export REDIS_URL="redis://localhost:6379"
```

### 2. Docker Compose Environment Variable

In your `docker-compose.yml`, set the `REDIS_URL`:

```yaml
environment:
  - REDIS_URL=redis://your-redis-host:6379
```

### 3. Docker Secrets (For Production)

If you're using Docker secrets, you can create a Redis URL secret:

```bash
# Create the secret file
echo "redis://your-redis-host:6379" > leftplot/secrets/redis_url.txt

# Add to docker-compose.yml
secrets:
  redis_url:
    file: leftplot/secrets/redis_url.txt
```

## Redis URL Format

The Redis URL should follow this format:

```
redis://[username:password@]host[:port][/database]
```

Examples:
- `redis://localhost:6379` (local Redis, no auth)
- `redis://user:pass@redis.example.com:6379` (remote Redis with auth)
- `redis://redis.example.com:6379/1` (specific database)

## Troubleshooting

### "Invalid pathname" Error

This error occurs when:
1. `REDIS_URL` is undefined
2. `REDIS_URL` has an invalid format
3. Redis server is not accessible

**Solutions:**
1. Ensure `REDIS_URL` is properly set in your environment
2. Check that the Redis URL format is correct
3. Verify Redis server is running and accessible
4. If Redis is not needed, the application will run without it

### Redis Connection Errors

If you see Redis connection errors:
1. Check if Redis server is running
2. Verify the host and port are correct
3. Check firewall settings
4. Ensure authentication credentials are correct (if using auth)

## Running Without Redis

If you don't want to use Redis, simply don't set the `REDIS_URL` environment variable. The application will:
- Skip Redis client initialization
- Disable caching functionality
- Continue to work normally for all other features

## Production Recommendations

1. **Use Redis for caching** to improve performance
2. **Set up Redis with authentication** for security
3. **Use Redis persistence** to avoid data loss
4. **Monitor Redis memory usage** to prevent issues
5. **Set up Redis clustering** for high availability 