# LeftPlot - Nigerian Political Discourse Platform

A modern, full-stack web application for Nigerian political discussions and debates. Built with Node.js, Express, PostgreSQL, and Redis.

##  Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth with role-based access
- **Political Discussions** - Create, read, update posts with Nigerian political focus
- **Comment System** - Threaded discussions with voting
- **Voting System** - Upvote/downvote posts and comments
- **Polling System** - Create polls on posts with multiple voting options
- **Share Functionality** - URL-friendly slugs for easy sharing
- **Admin Panel** - Content moderation and user management
- **Real-time Analytics** - Page views and user behavior tracking

### Technical Features
- **RESTful API** - Well-structured endpoints with pagination
- **Database Optimization** - PostgreSQL with proper indexing
- **Caching Layer** - Redis for performance optimization
- **Security** - Rate limiting, input validation, SQL injection protection
- **Containerization** - Docker and Docker Compose for easy deployment
- **Testing** - Comprehensive test suite

##  Architecture

```
├── Backend (Node.js/Express)
│   ├── Authentication & Authorization
│   ├── RESTful API Endpoints
│   ├── Database Layer (PostgreSQL)
│   ├── Caching Layer (Redis)
│   └── Security Middleware
├── Database Schema
│   ├── Users & Authentication
│   ├── Posts & Comments
│   ├── Voting System
│   ├── Polling System
│   └── Analytics & Reports
└── Deployment
    ├── Docker Configuration
    ├── Environment Management
    └── Production Setup
```

##  Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/leftplot-backend.git
cd leftplot-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Create database
createdb leftplot_db

# Run migrations
psql -d leftplot_db -f db/schema.sql

# Seed with sample data
psql -d leftplot_db -f megaseed.sql
```

5. **Start the application**
```bash
# Development
npm run dev

# Production
npm start
```

### Docker Setup

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run individual services
docker-compose up postgres redis
npm start
```

##  Project Structure

```
leftplot-backend/
├── db/
│   └── schema.sql              # Database schema
├── middleware/
│   └── auth.js                 # Authentication middleware
├── routes/
│   ├── auth.js                 # Authentication routes
│   ├── posts.js                # Post management
│   ├── comments.js             # Comment system
│   ├── polls.js                # Polling system
│   ├── users.js                # User management
│   ├── admin.js                # Admin panel
│   └── reports.js              # Reporting system
├── utils/
│   └── slugGenerator.js        # URL slug generation
├── test/                       # Test suite
├── logs/                       # Application logs
├── server.js                   # Main application file
├── package.json
├── docker-compose.yml
└── Dockerfile
```

##  API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Email verification

### Posts
- `GET /api/posts` - Get all posts (with pagination)
- `GET /api/posts/:identifier` - Get post by ID or slug
- `POST /api/posts` - Create new post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post (admin)
- `POST /api/posts/:id/upvote` - Upvote post
- `POST /api/posts/:id/downvote` - Downvote post

### Comments
- `GET /api/comments/:postId` - Get comments for post
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Polls
- `GET /api/polls/post/:postId` - Get polls for post
- `GET /api/polls/:id` - Get single poll
- `POST /api/polls` - Create poll
- `POST /api/polls/:id/vote` - Vote on poll
- `PUT /api/polls/:id` - Update poll
- `DELETE /api/polls/:id` - Delete poll

### Users & Admin
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/admin/users` - Admin: Get all users
- `GET /api/admin/posts` - Admin: Get all posts
- `PATCH /api/admin/users/:id/block` - Admin: Block user
- `PATCH /api/admin/posts/:id/block` - Admin: Block post

##  Database Schema

### Core Tables
- **users** - User accounts and authentication
- **posts** - Political discussions and content
- **comments** - Threaded discussions
- **post_votes** - Post voting system
- **comment_votes** - Comment voting system
- **polls** - Polling system
- **poll_options** - Poll choices
- **poll_votes** - Poll voting records
- **reports** - Content moderation
- **page_views** - Analytics tracking

##  Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt for password security
- **Rate Limiting** - Prevent abuse and spam
- **Input Validation** - Sanitize user inputs
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Cross-origin request handling
- **Helmet.js** - Security headers

##  Testing

```bash
# Run all tests
npm test

# Run specific test files
npm test -- auth.test.js
npm test -- posts.test.js
npm test -- comments.test.js
```

##  Performance Features

- **Redis Caching** - API response caching
- **Database Indexing** - Optimized queries
- **Connection Pooling** - Efficient database connections
- **Compression** - Gzip response compression
- **Pagination** - Efficient data loading

##  Deployment

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/leftplot_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=3000
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### Production Checklist
- [ ] Set up PostgreSQL database
- [ ] Configure Redis cache
- [ ] Set environment variables
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up CI/CD pipeline

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for Nigerian political discourse
- Focused on local content and language support
- Designed for scalability and performance
- Community-driven development

## Support

For support, create an issue in this repository.
