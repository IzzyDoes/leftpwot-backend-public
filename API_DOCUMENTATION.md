# Amebo API Documentation

## Base URL
```
http://localhost:8909/api
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Posts

#### Get All Posts
```http
GET /posts?page=1&sort=recent
```
Query Parameters:
- `page` (optional): Page number (default: 1)
- `sort` (optional): Sort order ('recent', 'upvotes', 'downvotes', 'comments')

Response:
```json
{
  "posts": [
    {
      "id": 1,
      "title": "Post Title",
      "content": "Post content",
      "username": "author_username",
      "created_at": "2024-03-20T10:00:00Z",
      "upvotes": 10,
      "downvotes": 2,
      "comment_count": 5,
      "userVoteType": "upvote", // or "downvote" or null
      "comments": [
        {
          "id": 1,
          "content": "Comment content",
          "username": "commenter_username",
          "created_at": "2024-03-20T10:05:00Z",
          "upvotes": 3,
          "downvotes": 1,
          "userVoteType": "upvote" // or "downvote" or null
        }
        // ... more comments (up to 5)
      ]
    }
    // ... more posts
  ],
  "pagination": {
    "total": 100,
    "pages": 20,
    "current": 1
  }
}
```

#### Get Single Post
```http
GET /posts/:id
```
Response:
```json
{
  "id": 1,
  "title": "Post Title",
  "content": "Post content",
  "username": "author_username",
  "created_at": "2024-03-20T10:00:00Z",
  "upvotes": 10,
  "downvotes": 2,
  "userVoteType": "upvote",
  "comments": [
    {
      "id": 1,
      "content": "Comment content",
      "username": "commenter_username",
      "created_at": "2024-03-20T10:05:00Z",
      "upvotes": 3,
      "downvotes": 1,
      "userVoteType": "upvote"
    }
    // ... all comments
  ]
}
```

#### Create Post (Authenticated)
```http
POST /posts
```
Request Body:
```json
{
  "title": "Post Title",
  "content": "Post content"
}
```

#### Update Post (Authenticated)
```http
PUT /posts/:id
```
Request Body:
```json
{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Delete Post (Authenticated)
```http
DELETE /posts/:id
```

#### Vote on Post (Authenticated)
```http
POST /posts/:id/upvote
POST /posts/:id/downvote
```

### Comments

#### Get Comments for Post
```http
GET /comments/post/:postId?page=1
```
Query Parameters:
- `page` (optional): Page number (default: 1)

Response:
```json
{
  "comments": [
    {
      "id": 1,
      "content": "Comment content",
      "username": "commenter_username",
      "created_at": "2024-03-20T10:05:00Z",
      "upvotes": 3,
      "downvotes": 1,
      "userVoteType": "upvote"
    }
    // ... more comments
  ],
  "pagination": {
    "total": 50,
    "pages": 5,
    "current": 1
  }
}
```

#### Create Comment (Authenticated)
```http
POST /comments
```
Request Body:
```json
{
  "postId": 1,
  "content": "Comment content"
}
```

#### Delete Comment (Authenticated)
```http
DELETE /comments/:id
```

#### Vote on Comment (Authenticated)
```http
POST /comments/:id/upvote
POST /comments/:id/downvote
```

### Authentication

#### Register
```http
POST /auth/register
```
Request Body:
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /auth/login
```
Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
```

## Frontend Implementation Guide

### 1. Setup API Client
```typescript
// api/index.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8909/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 2. Types
```typescript
// types/index.ts
export interface Post {
  id: number;
  title: string;
  content: string;
  username: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  userVoteType: 'upvote' | 'downvote' | null;
  comments: Comment[];
}

export interface Comment {
  id: number;
  content: string;
  username: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  userVoteType: 'upvote' | 'downvote' | null;
}

export interface Pagination {
  total: number;
  pages: number;
  current: number;
}
```

### 3. API Functions
```typescript
// api/posts.ts
import api from './index';
import { Post, Pagination } from '../types';

export const getPosts = async (page = 1, sort = 'recent'): Promise<{ posts: Post[], pagination: Pagination }> => {
  const response = await api.get(`/posts?page=${page}&sort=${sort}`);
  return response.data;
};

export const getPost = async (id: number): Promise<Post> => {
  const response = await api.get(`/posts/${id}`);
  return response.data;
};

export const createPost = async (title: string, content: string): Promise<Post> => {
  const response = await api.post('/posts', { title, content });
  return response.data;
};

// ... more post-related functions
```

### 4. React Components Example
```typescript
// components/PostList.tsx
import React, { useEffect, useState } from 'react';
import { getPosts } from '../api/posts';
import { Post } from '../types';

export const PostList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { posts } = await getPosts(page);
        setPosts(posts);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.id} className="post">
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <div className="post-meta">
            <span>Posted by {post.username}</span>
            <span>{post.upvotes} upvotes</span>
            <span>{post.downvotes} downvotes</span>
          </div>
          
          {/* Comments Section */}
          <div className="comments">
            <h3>Comments ({post.comment_count})</h3>
            {post.comments.map(comment => (
              <div key={comment.id} className="comment">
                <p>{comment.content}</p>
                <div className="comment-meta">
                  <span>By {comment.username}</span>
                  <span>{comment.upvotes} upvotes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 5. Authentication Context
```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../api/auth';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      getCurrentUser()
        .then(user => setUser(user))
        .catch(() => localStorage.removeItem('authToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    getCurrentUser().then(user => setUser(user));
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 6. Protected Routes
```typescript
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};
```

## Best Practices

1. **Error Handling**
   - Always wrap API calls in try-catch blocks
   - Show user-friendly error messages
   - Handle network errors gracefully

2. **Loading States**
   - Show loading indicators during API calls
   - Disable interactive elements while loading

3. **Authentication**
   - Store token securely in localStorage
   - Clear token on logout
   - Redirect to login for protected routes

4. **Data Caching**
   - Consider caching frequently accessed data
   - Implement pagination for large datasets
   - Use optimistic updates for better UX

5. **Form Validation**
   - Validate input before submission
   - Show clear error messages
   - Prevent duplicate submissions

## Common Issues and Solutions

1. **401 Unauthorized**
   - Check if token exists in localStorage
   - Verify token format in Authorization header
   - Ensure token hasn't expired

2. **CORS Issues**
   - Verify API URL is correct
   - Check if backend CORS settings allow your frontend origin

3. **Rate Limiting**
   - Implement request debouncing
   - Add retry logic for failed requests
   - Show appropriate error messages

4. **Performance**
   - Implement pagination
   - Use lazy loading for images
   - Optimize API calls 