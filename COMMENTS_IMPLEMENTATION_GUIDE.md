# Comments Implementation Guide

## Data Structure
Each post includes comments in this format:
```typescript
interface Comment {
  id: number;
  content: string;
  username: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  userVoteType: 'upvote' | 'downvote' | null;
}
```

## API Endpoints for Comments

### 1. Get Comments for a Post
```http
GET /comments/post/:postId?page=1
```
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
  ],
  "pagination": {
    "total": 50,
    "pages": 5,
    "current": 1
  }
}
```

### 2. Create Comment (Authenticated)
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

## React Component Implementation

### 1. Comments Section Component
```typescript
// components/CommentsSection.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface CommentsSectionProps {
  postId: number;
  initialComments?: Comment[];
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, initialComments = [] }) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await api.post('/comments', {
        postId,
        content: newComment
      });
      
      setComments(prev => [response.data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  return (
    <div className="comments-section">
      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmit} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            maxLength={200}
          />
          <button type="submit" disabled={!newComment.trim()}>
            Post Comment
          </button>
        </form>
      )}

      {/* Comments List */}
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <span className="username">{comment.username}</span>
              <span className="timestamp">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="comment-content">{comment.content}</p>
            <div className="comment-actions">
              <button 
                onClick={() => handleVote(comment.id, 'upvote')}
                className={comment.userVoteType === 'upvote' ? 'active' : ''}
              >
                ↑ {comment.upvotes}
              </button>
              <button 
                onClick={() => handleVote(comment.id, 'downvote')}
                className={comment.userVoteType === 'downvote' ? 'active' : ''}
              >
                ↓ {comment.downvotes}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. Basic CSS Styling
```css
/* styles/CommentsSection.css */
.comments-section {
  margin-top: 2rem;
  padding: 1rem;
}

.comment-form {
  margin-bottom: 2rem;
}

.comment-form textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.comment {
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.comment-content {
  margin: 0.5rem 0;
}

.comment-actions {
  display: flex;
  gap: 1rem;
}

.comment-actions button {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.comment-actions button.active {
  background-color: #e3e3e3;
}
```

## GPT Prompts for Implementation Help

### 1. Basic Implementation
```
I need help implementing a comments section for my React application. The comments should:
- Display under each post
- Show the commenter's username and timestamp
- Allow authenticated users to post new comments
- Show upvote/downvote counts
- Allow authenticated users to vote on comments

The API endpoints are:
GET /comments/post/:postId
POST /comments (requires auth)
POST /comments/:id/upvote (requires auth)
POST /comments/:id/downvote (requires auth)

Can you help me create the React components and handle the API integration?
```

### 2. Styling Help
```
I have a comments section component that needs styling. The requirements are:
- Clean, modern look
- Responsive design
- Visual hierarchy for comment content
- Styled voting buttons
- Different states for authenticated vs non-authenticated users

Can you help me with the CSS styling?
```

### 3. Error Handling
```
I need help implementing error handling for my comments section. The requirements are:
- Handle API errors gracefully
- Show user-friendly error messages
- Handle network issues
- Validate comment content
- Prevent duplicate submissions

Can you help me implement these features?
```

### 4. Performance Optimization
```
I need help optimizing my comments section. The requirements are:
- Implement pagination
- Add infinite scroll
- Optimize re-renders
- Cache comment data
- Handle large numbers of comments efficiently

Can you help me implement these optimizations?
```

## Common Implementation Challenges

1. **Real-time Updates**
   - Consider using WebSocket for real-time comment updates
   - Implement optimistic updates for better UX
   - Handle race conditions in comment submissions

2. **Authentication Integration**
   - Show different UI for authenticated vs non-authenticated users
   - Handle token expiration
   - Redirect to login when needed

3. **Comment Moderation**
   - Implement comment deletion for post owners
   - Add admin controls
   - Handle inappropriate content

4. **Mobile Responsiveness**
   - Ensure good UX on mobile devices
   - Handle touch interactions
   - Optimize layout for small screens

## Testing Tips

1. Test comment submission with:
   - Empty comments
   - Very long comments
   - Special characters
   - HTML injection attempts

2. Test voting with:
   - Multiple votes from same user
   - Vote removal
   - Vote switching (upvote to downvote)

3. Test authentication with:
   - Expired tokens
   - Invalid tokens
   - No token
   - Multiple tabs/windows

4. Test performance with:
   - Large numbers of comments
   - Slow network conditions
   - Multiple simultaneous submissions 