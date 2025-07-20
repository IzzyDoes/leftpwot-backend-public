-- Drop tables if they exist (for clean resets)
DROP TABLE IF EXISTS comment_votes CASCADE;
DROP TABLE IF EXISTS post_votes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS password_reset_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  verified BOOLEAN NOT NULL DEFAULT true,
  blocked BOOLEAN NOT NULL DEFAULT false
);

-- Password resets table
CREATE TABLE password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Password reset sessions table
CREATE TABLE password_reset_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  slug VARCHAR(150) UNIQUE,
  content TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false
);

-- Comments table
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0
);

-- Post votes table
CREATE TABLE post_votes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Comment votes table
CREATE TABLE comment_votes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vote_type VARCHAR(10) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Verification tokens table
CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'post' or 'comment'
  target_id INTEGER NOT NULL, -- post_id or comment_id
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, resolved, ignored
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  ignored_at TIMESTAMP,
  details TEXT, -- optional: snapshot of comment content or extra info
  UNIQUE (type, target_id, reporter_id)
);

-- Page views table (for behavioural analytics)
CREATE TABLE page_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Polls table
CREATE TABLE polls (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_multiple_votes BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Poll options table
CREATE TABLE poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Poll votes table
CREATE TABLE poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
  poll_option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id, poll_option_id)
);

-- Indexes for performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user_id ON comment_votes(user_id);

-- Indexes for page views
CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_created ON page_views(created_at);

-- Indexes for polls
CREATE INDEX idx_polls_post_id ON polls(post_id);
CREATE INDEX idx_polls_active ON polls(is_active);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX idx_poll_votes_option_id ON poll_votes(poll_option_id);

-- Insert an admin user (password: admin123)
INSERT INTO users (username, email, password, role, created_at, verified)
VALUES ('admin', 'admin@leftplot.com', '$2b$10$rIC1S3DvGJqUfDYnLE6TL.C1x6HzDu/eBJsGF0K4CBSnGmzG4vKAS', 'admin', NOW(), true);

-- Insert a second admin user (password: newadmin)
INSERT INTO users (username, email, password, role, created_at, verified)
VALUES ('admin2', 'admin2@leftplot.com', '$2b$10$Q8VQIeuWAlQrqm6qSEtcYeYNvoV/JZfPdeHhT0rm/o1EXlz7g8PGK', 'admin', NOW(), true);

-- Insert some regular users
INSERT INTO users (username, email, password, role, created_at, verified)
VALUES 
  ('johndoe', 'john@example.com', '$2b$10$i2yh1tCEIia5XaRY6lMrDeYQ0.xHVfGYe4hVyXnV/vlZH5keGxO6S', 'user', NOW(), true),
  ('janedoe', 'jane@example.com', '$2b$10$8UrhZaJ5WOgJoIx7dCpvUeCvvFkeI2etrSWt5pKyRrE7QFLe5xJ9y', 'user', NOW(), true),
  ('political_pundit', 'pundit@example.com', '$2b$10$9Q.zF5pS1RCfEBQShZ2LK.TRJVrIHYQ/xBPQbvEjYUUt1UPr4xKbe', 'user', NOW(), true);

-- Insert placeholder posts
INSERT INTO posts (title, slug, content, user_id, created_at, upvotes, downvotes)
VALUES 
  ('Welcome to LeftPlot!', 'welcome-to-leftplot', 'This is a placeholder post. Start the debate!', 2, NOW() - INTERVAL '1 day', 5, 0),
  ('Sample Discussion', 'sample-discussion', 'Share your thoughts on this sample topic.', 3, NOW() - INTERVAL '2 hours', 2, 1),
  ('Another Example Post', 'another-example-post', 'Feel free to comment and vote.', 4, NOW() - INTERVAL '30 minutes', 1, 0);

-- Insert placeholder comments
INSERT INTO comments (post_id, user_id, content, created_at, upvotes, downvotes)
VALUES 
  (1, 3, 'Excited to join the conversation!', NOW() - INTERVAL '23 hours', 2, 0),
  (1, 4, 'Let''s keep it civil and insightful.', NOW() - INTERVAL '22 hours', 1, 0),
  (2, 2, 'Interesting topic, looking forward to replies.', NOW() - INTERVAL '90 minutes', 1, 0),
  (3, 2, 'Testing comments on this post.', NOW() - INTERVAL '20 minutes', 0, 0);

-- Insert some sample votes
INSERT INTO post_votes (post_id, user_id, vote_type)
VALUES 
  (1, 2, 'upvote'),
  (1, 3, 'upvote'),
  (2, 4, 'downvote'),
  (3, 2, 'upvote');

INSERT INTO comment_votes (comment_id, user_id, vote_type)
VALUES 
  (1, 2, 'upvote'),
  (2, 3, 'upvote'),
  (3, 4, 'downvote');

-- Insert sample polls
INSERT INTO polls (post_id, question, description, is_active, allow_multiple_votes, expires_at)
VALUES 
  (1, 'Who do you think will win the 2027 presidential election?', 'Based on current political climate and voter sentiment', true, false, NOW() + INTERVAL '30 days'),
  (2, 'What is the most pressing issue facing Nigeria today?', 'Select the issue that affects you most', true, true, NOW() + INTERVAL '60 days'),
  (3, 'Do you support the current fuel subsidy removal policy?', 'Share your opinion on the economic policy', true, false, NOW() + INTERVAL '15 days');

-- Insert poll options
INSERT INTO poll_options (poll_id, option_text)
VALUES 
  -- Poll 1: 2027 Election
  (1, 'Peter Obi (Labour Party)'),
  (1, 'Bola Tinubu (APC)'),
  (1, 'Atiku Abubakar (PDP)'),
  (1, 'Other/Undecided'),
  
  -- Poll 2: Pressing Issues
  (2, 'Security (Banditry/Kidnapping)'),
  (2, 'Economy (Inflation/Fuel Prices)'),
  (2, 'Education (ASUU Strikes)'),
  (2, 'Healthcare (Poor Facilities)'),
  (2, 'Corruption'),
  (2, 'Youth Unemployment'),
  
  -- Poll 3: Fuel Subsidy
  (3, 'Strongly Support'),
  (3, 'Somewhat Support'),
  (3, 'Neutral'),
  (3, 'Somewhat Oppose'),
  (3, 'Strongly Oppose');

-- Insert sample poll votes
INSERT INTO poll_votes (poll_id, poll_option_id, user_id)
VALUES 
  (1, 1, 2), -- User 2 votes for Peter Obi
  (1, 2, 3), -- User 3 votes for Tinubu
  (1, 3, 4), -- User 4 votes for Atiku
  (2, 1, 2), -- User 2 votes for Security
  (2, 2, 3), -- User 3 votes for Economy
  (2, 3, 4), -- User 4 votes for Education
  (3, 4, 2), -- User 2 somewhat opposes
  (3, 5, 3), -- User 3 strongly opposes
  (3, 1, 4); -- User 4 strongly supports
